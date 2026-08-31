import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJson, authError } from "@/lib/auth/api";
import { registerSchema } from "@/lib/auth/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { attachManualReferralCode, attachSalesAttribution } from "@/lib/sales-challenge/attribution";

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
    const attribution={utm_source:parsed.data.utm_source,utm_medium:parsed.data.utm_medium,utm_campaign:parsed.data.utm_campaign,utm_content:parsed.data.utm_content,utm_term:parsed.data.utm_term,referral_code:parsed.data.referral_code,source:parsed.data.source,medium:parsed.data.medium,campaign:parsed.data.campaign,campaign_id:parsed.data.campaign_id,landing_page:parsed.data.landing_page,referral_url:parsed.data.referral_url};
    await prisma.$executeRaw`INSERT INTO public.student_consents(user_id,terms_accepted,privacy_accepted,policy_version,accepted_at,marketing_consent,age_18_or_above,college_name,academic_status,attribution_json) VALUES(${data.user.id}::uuid,true,true,'2026-08-13',now(),${parsed.data.marketingConsent==='on'},true,${parsed.data.collegeName||null},${parsed.data.academicStatus},${JSON.stringify(attribution)}::jsonb) ON CONFLICT(user_id) DO UPDATE SET terms_accepted=true,privacy_accepted=true,policy_version='2026-08-13',accepted_at=now(),marketing_consent=excluded.marketing_consent,age_18_or_above=true,college_name=excluded.college_name,academic_status=excluded.academic_status,attribution_json=excluded.attribution_json,updated_at=now()`;
    if(parsed.data.campaign_id)await prisma.$transaction(async tx=>{await tx.$executeRaw`insert into public.campaign_attributions(user_id,campaign_id,source,medium,campaign_code,referral_url,landing_page,registered_at,metadata) values(${data.user.id}::uuid,${parsed.data.campaign_id}::uuid,${parsed.data.source||parsed.data.utm_source||null},${parsed.data.medium||parsed.data.utm_medium||null},${parsed.data.campaign||parsed.data.utm_campaign||null},${parsed.data.referral_url||null},${parsed.data.landing_page||null},now(),${JSON.stringify(attribution)}::jsonb) on conflict(user_id,campaign_id) where user_id is not null and campaign_id is not null do update set registered_at=coalesce(campaign_attributions.registered_at,now()),metadata=campaign_attributions.metadata||excluded.metadata`;await tx.$executeRaw`insert into public.product_events(user_id,campaign_id,event_name,properties) values(${data.user.id}::uuid,${parsed.data.campaign_id}::uuid,'registration_completed',${JSON.stringify(attribution)}::jsonb)`;});
    await prisma.$transaction(async tx=>{const linked=await attachSalesAttribution(tx,data.user.id);if(!linked)await attachManualReferralCode(tx,data.user.id,parsed.data.referral_code)});
    return NextResponse.json({ message: "Account created. Starting your diagnostic…", immediateLogin: true }, { status: 201 });
  } catch (error) { return authError(error); }
}
