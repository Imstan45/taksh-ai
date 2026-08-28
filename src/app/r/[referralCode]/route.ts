import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SALES_REFERRAL_COOKIE, referralTokenHash } from "@/lib/sales-challenge/attribution";

export async function GET(request: Request, { params }: { params: Promise<{ referralCode: string }> }) {
  const { referralCode } = await params;
  const origin = new URL(request.url).origin;
  const existingToken = (request.headers.get("cookie") ?? "").split(";").map(item => item.trim()).find(item => item.startsWith(`${SALES_REFERRAL_COOKIE}=`))?.split("=").slice(1).join("=");
  if (existingToken) {
    await prisma.$executeRaw`update public.sales_referral_attributions set total_visits=total_visits+1,last_visit_at=now(),updated_at=now() where visitor_token_hash=${referralTokenHash(decodeURIComponent(existingToken))}`;
    return Response.redirect(`${origin}/assessment/placement-readiness?sales_referral=active`, 302);
  }
  const participant = (await prisma.$queryRaw<Array<{ id: string; challenge_id: string; user_id: string; end_at: Date }>>`select participant.id,participant.challenge_id,participant.user_id,challenge.end_at from public.sales_challenge_participants participant join public.sales_challenges challenge on challenge.id=participant.challenge_id where participant.referral_code=${referralCode.toUpperCase()} and participant.status='active' and challenge.status='active' and now() between challenge.start_at and challenge.end_at`)[0];
  if (!participant) return Response.redirect(`${origin}/sales-challenge?referral=invalid`, 302);
  const token = crypto.randomUUID(), attributionId = crypto.randomUUID(), session = await auth();
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`insert into public.sales_referral_attributions(id,challenge_id,participant_id,referral_code,visitor_token_hash) values(${attributionId}::uuid,${participant.challenge_id}::uuid,${participant.id}::uuid,${referralCode.toUpperCase()},${referralTokenHash(token)})`;
    if (session?.user?.id) {
      if (session.user.id === participant.user_id) await tx.$executeRaw`update public.sales_referral_attributions set fraud_flag=true,fraud_reason='Participant self-referral',validity_status='review' where id=${attributionId}::uuid`;
      else {
        const prior = (await tx.$queryRaw<Array<{ id: string }>>`select id from public.sales_referral_attributions where registered_user_id=${session.user.id}::uuid limit 1`)[0];
        if (!prior) await tx.$executeRaw`update public.sales_referral_attributions set registered_user_id=${session.user.id}::uuid,registered_at=now(),is_qualified_registration=true where id=${attributionId}::uuid`;
      }
    }
  });
  const response = Response.redirect(`${origin}/assessment/placement-readiness?sales_referral=active`, 302);
  response.headers.append("Set-Cookie", `${SALES_REFERRAL_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${participant.end_at.toUTCString()}`);
  return response;
}
