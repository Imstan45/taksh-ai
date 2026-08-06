import { z } from "zod";
import { requireScopedRole } from "@/lib/admin-scope";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const email = z.string().trim().toLowerCase().email().max(254);
const TEMPORARY_PASSWORD = "welcome2026";

export async function POST(request: Request) {
  try {
    const { session, institutionId } = await requireScopedRole(["COLLEGE_ADMIN", "FACULTY"]);
    const institutions = await prisma.$queryRaw<Array<{ institution_type: string }>>`
      SELECT institution_type FROM public.institutions WHERE id=${institutionId}::uuid AND status='active'
    `;
    if (institutions[0]?.institution_type !== "college") {
      return Response.json({ error: "Student onboarding is available only to active colleges." }, { status: 403 });
    }
    const body = await request.json() as { emails?: string };
    const candidates = [...new Set(String(body.emails ?? "").split(/[\s,;]+/).map((value) => value.trim().toLowerCase()).filter(Boolean))];
    if (!candidates.length) return Response.json({ error: "Paste at least one student email address." }, { status: 400 });
    if (candidates.length > 200) return Response.json({ error: "Add no more than 200 students at a time." }, { status: 422 });

    const results: Array<{ email: string; ok: boolean; reason?: string }> = [];
    const supabase = createSupabaseAdminClient();
    for (const candidate of candidates) {
      const parsed = email.safeParse(candidate);
      if (!parsed.success) { results.push({ email: candidate, ok: false, reason: "Invalid email address" }); continue; }
      const duplicate = await prisma.$queryRaw<Array<{ user_id: string }>>`
        SELECT role.user_id FROM public.user_roles role JOIN auth.users account ON account.id=role.user_id
        WHERE lower(account.email)=${parsed.data} LIMIT 1
      `;
      if (duplicate[0]) { results.push({ email: parsed.data, ok: false, reason: "An account already exists" }); continue; }

      const { data, error } = await supabase.auth.admin.createUser({
        email: parsed.data,
        password: TEMPORARY_PASSWORD,
        email_confirm: true,
        user_metadata: { must_change_password: true, onboarding_source: "college_bulk_add" },
      });
      if (error || !data.user) { results.push({ email: parsed.data, ok: false, reason: error?.message ?? "Account creation failed" }); continue; }
      try {
        await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`
            INSERT INTO public.user_roles(user_id,role,institution_id,account_status)
            VALUES(${data.user.id}::uuid,'STUDENT',${institutionId}::uuid,'active')
          `;
          await tx.$executeRaw`
            INSERT INTO public.user_academic_memberships(user_id,institution_id,membership_type,active)
            VALUES(${data.user.id}::uuid,${institutionId}::uuid,'STUDENT',true)
          `;
          await tx.$executeRaw`
            INSERT INTO public.audit_logs(actor_id,institution_id,action,target_type,target_id,new_values)
            VALUES(${session.user.id}::uuid,${institutionId}::uuid,'student.onboarded','student',${data.user.id},
              ${JSON.stringify({ email: parsed.data, first_login_password_change: true })}::jsonb)
          `;
        });
        results.push({ email: parsed.data, ok: true });
      } catch (error) {
        await supabase.auth.admin.deleteUser(data.user.id).catch(() => undefined);
        results.push({ email: parsed.data, ok: false, reason: error instanceof Error ? error.message : "College assignment failed" });
      }
    }
    return Response.json({ results, created: results.filter((item) => item.ok).length, failed: results.filter((item) => !item.ok).length });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 403 });
  }
}
