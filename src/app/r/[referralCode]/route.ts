import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SALES_REFERRAL_COOKIE, referralTokenHash } from "@/lib/sales-challenge/attribution";

export async function GET(request: Request, { params }: { params: Promise<{ referralCode: string }> }) {
  const code = (await params).referralCode.trim().toUpperCase();
  const origin = new URL(request.url).origin;
  const rawCookie = (request.headers.get("cookie") ?? "").split(";").map(item => item.trim()).find(item => item.startsWith(`${SALES_REFERRAL_COOKIE}=`))?.split("=").slice(1).join("=");
  if (rawCookie) {
    const existing = await prisma.$executeRaw`update public.sales_referral_attributions set total_visits=total_visits+1,last_visit_at=now(),updated_at=now() where visitor_token_hash=${referralTokenHash(decodeURIComponent(rawCookie))} and validity_status='valid' and attribution_expires_at>now()`;
    if (existing) return Response.redirect(`${origin}/?referral=active`, 302);
  }
  const owner = (await prisma.$queryRaw<Array<{ sales_rep_id: string | null; participant_id: string | null; challenge_id: string | null; owner_user_id: string }>>`
    select rep.id sales_rep_id,null::uuid participant_id,null::uuid challenge_id,rep.user_id owner_user_id from public.sales_reps rep where rep.referral_code=${code} and rep.status='active'
    union all
    select null,participant.id,participant.challenge_id,participant.user_id from public.sales_challenge_participants participant join public.sales_challenges challenge on challenge.id=participant.challenge_id where participant.referral_code=${code} and participant.status='active' and challenge.status='active' and now() between challenge.start_at and challenge.end_at
    limit 1
  `)[0];
  if (!owner) return Response.redirect(`${origin}/?referral=invalid`, 302);
  const token = crypto.randomUUID(), session = await auth();
  await prisma.$transaction(async tx => {
    const attribution = (await tx.$queryRaw<Array<{ id: string }>>`insert into public.sales_referral_attributions(challenge_id,participant_id,sales_rep_id,referral_code,visitor_token_hash,attribution_expires_at) values(${owner.challenge_id}::uuid,${owner.participant_id}::uuid,${owner.sales_rep_id}::uuid,${code},${referralTokenHash(token)},now()+interval '30 days') returning id`)[0];
    if (session?.user?.id === owner.owner_user_id) await tx.$executeRaw`update public.sales_referral_attributions set fraud_flag=true,fraud_reason='Self-referral',validity_status='review' where id=${attribution.id}::uuid`;
    else if (session?.user?.id) {
      await tx.$executeRaw`select pg_advisory_xact_lock(hashtextextended(${session.user.id},0))`;
      const prior = (await tx.$queryRaw<Array<{ id: string }>>`select id from public.sales_referral_attributions where registered_user_id=${session.user.id}::uuid and validity_status='valid' and attribution_expires_at>now() limit 1`)[0];
      if (!prior) await tx.$executeRaw`update public.sales_referral_attributions set registered_user_id=${session.user.id}::uuid,registered_at=now(),is_qualified_registration=true where id=${attribution.id}::uuid`;
    }
  });
  const response = Response.redirect(`${origin}/?referral=active`, 302);
  response.headers.append("Set-Cookie", `${SALES_REFERRAL_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 86400}`);
  return response;
}
