import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJson, authError } from "@/lib/auth/api";
import { salesRepRegisterSchema } from "@/lib/auth/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = await parseJson(request, salesRepRegisterSchema);
  if (!parsed.data) return parsed.error;

  const supabase = createSupabaseAdminClient();
  let createdUserId: string | undefined;
  try {
    const existing = await prisma.$queryRaw<Array<{ found: boolean }>>`
      select exists(select 1 from public.sales_reps where lower(email)=lower(${parsed.data.email})) found
    `;
    if (existing[0]?.found) return NextResponse.json({ error: "A Sales Rep application already exists for this email." }, { status: 409 });

    const { data, error } = await supabase.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.fullName },
      app_metadata: { role: "SALES_REP" },
    });
    if (error) {
      const status = error.status === 429 ? 429 : error.status === 422 ? 409 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    if (!data.user) throw new Error("Supabase did not return a user");
    createdUserId = data.user.id;

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        insert into public.user_roles(user_id,role,institution_id,account_status)
        values(${data.user.id}::uuid,'SALES_REP',null,'pending')
        on conflict(user_id) do update set role='SALES_REP',institution_id=null,account_status='pending',
          authorization_version=public.user_roles.authorization_version+1,updated_at=now()
      `;
      await tx.$executeRaw`
        insert into public.sales_reps(user_id,full_name,email,phone,college,city,network_reach,referral_code,status)
        values(${data.user.id}::uuid,${parsed.data.fullName},${parsed.data.email},${parsed.data.phone},
          ${parsed.data.organization},${parsed.data.city},${parsed.data.networkReach},null,'pending')
      `;
      await tx.$executeRaw`
        insert into public.audit_logs(actor_id,action,target_type,target_id,new_values)
        values(${data.user.id}::uuid,'sales_rep.self_registered','sales_rep',${data.user.id},
          ${JSON.stringify({ source: "sales_portal", networkReach: parsed.data.networkReach })}::jsonb)
      `;
    });
    return NextResponse.json({ message: "Application submitted for review." }, { status: 201 });
  } catch (error) {
    if (createdUserId) await supabase.auth.admin.deleteUser(createdUserId).catch(() => undefined);
    return authError(error);
  }
}
