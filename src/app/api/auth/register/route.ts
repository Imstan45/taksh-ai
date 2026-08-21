import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJson, authError } from "@/lib/auth/api";
import { registerSchema } from "@/lib/auth/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = await parseJson(request, registerSchema);
  if (!parsed.data) return parsed.error;
  try {
    const { data, error } = await createSupabaseAdminClient().auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.name },
      app_metadata: { role: "STUDENT" },
    });
    if (error) {
      const status = error.status === 429 ? 429 : error.status === 422 ? 409 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    if (!data.user) throw new Error("Supabase did not return a user");
    await prisma.$executeRaw`
      INSERT INTO public.students (id, full_name, email)
      VALUES (${data.user.id}::uuid, ${parsed.data.name}, ${parsed.data.email})
      ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, updated_at = now()
    `;
    const attribution={utm_source:parsed.data.utm_source,utm_medium:parsed.data.utm_medium,utm_campaign:parsed.data.utm_campaign,utm_content:parsed.data.utm_content,utm_term:parsed.data.utm_term,referral_code:parsed.data.referral_code};
    await prisma.$executeRaw`INSERT INTO public.student_consents(user_id,terms_accepted,privacy_accepted,policy_version,accepted_at,marketing_consent,age_18_or_above,college_name,academic_status,attribution_json) VALUES(${data.user.id}::uuid,true,true,'2026-08-13',now(),${parsed.data.marketingConsent==='on'},true,${parsed.data.collegeName||null},${parsed.data.academicStatus},${JSON.stringify(attribution)}::jsonb) ON CONFLICT(user_id) DO UPDATE SET terms_accepted=true,privacy_accepted=true,policy_version='2026-08-13',accepted_at=now(),marketing_consent=excluded.marketing_consent,age_18_or_above=true,college_name=excluded.college_name,academic_status=excluded.academic_status,attribution_json=excluded.attribution_json,updated_at=now()`;
    return NextResponse.json({ message: "Account created. Starting your diagnostic…", immediateLogin: true }, { status: 201 });
  } catch (error) { return authError(error); }
}
