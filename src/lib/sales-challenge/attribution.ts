import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const SALES_REFERRAL_COOKIE = "taksh_sales_ref";
export function referralTokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }

export async function currentSalesAttribution(userId?: string) {
  if (userId) {
    const linked = (await prisma.$queryRaw<Array<{ id: string }>>`
      select id from public.sales_referral_attributions
      where registered_user_id=${userId}::uuid and validity_status='valid' and attribution_expires_at>now()
      order by first_visit_at limit 1
    `)[0];
    if (linked) return linked.id;
  }
  const token = (await cookies()).get(SALES_REFERRAL_COOKIE)?.value;
  if (!token) return null;
  return (await prisma.$queryRaw<Array<{ id: string }>>`
    select id from public.sales_referral_attributions
    where visitor_token_hash=${referralTokenHash(token)} and validity_status='valid' and attribution_expires_at>now()
  `)[0]?.id ?? null;
}

export async function attachSalesAttribution(tx: Prisma.TransactionClient, userId: string) {
  const token = (await cookies()).get(SALES_REFERRAL_COOKIE)?.value;
  if (!token) return null;
  await tx.$executeRaw`select pg_advisory_xact_lock(hashtextextended(${userId},0))`;
  const row = (await tx.$queryRaw<Array<{ id: string; owner_user_id: string; registered_user_id: string | null }>>`
    select attribution.id,coalesce(rep.user_id,participant.user_id) owner_user_id,attribution.registered_user_id
    from public.sales_referral_attributions attribution
    left join public.sales_reps rep on rep.id=attribution.sales_rep_id and rep.status='active'
    left join public.sales_challenge_participants participant on participant.id=attribution.participant_id
    left join public.sales_challenges challenge on challenge.id=attribution.challenge_id
    where attribution.visitor_token_hash=${referralTokenHash(token)} and attribution.validity_status='valid'
      and attribution.attribution_expires_at>now()
      and (rep.id is not null or (participant.status='active' and challenge.status in('registration_open','active')))
    for update of attribution
  `)[0];
  if (!row) return null;
  if (row.owner_user_id === userId) {
    await tx.$executeRaw`update public.sales_referral_attributions set fraud_flag=true,fraud_reason='Self-referral',validity_status='review',updated_at=now() where id=${row.id}::uuid`;
    return null;
  }
  if (row.registered_user_id && row.registered_user_id !== userId) return null;
  const existing = (await tx.$queryRaw<Array<{ id: string }>>`select id from public.sales_referral_attributions where registered_user_id=${userId}::uuid and id<>${row.id}::uuid and validity_status='valid' and attribution_expires_at>now()`)[0];
  if (existing) return null;
  await tx.$executeRaw`update public.sales_referral_attributions set registered_user_id=${userId}::uuid,registered_at=coalesce(registered_at,now()),is_qualified_registration=true,updated_at=now() where id=${row.id}::uuid`;
  return row.id;
}

export async function attachManualReferralCode(tx: Prisma.TransactionClient, userId: string, rawCode?: string) {
  const code = rawCode?.trim().toUpperCase();
  if (!code) return null;
  await tx.$executeRaw`select pg_advisory_xact_lock(hashtextextended(${userId},0))`;
  const existing = (await tx.$queryRaw<Array<{ id: string }>>`select id from public.sales_referral_attributions where registered_user_id=${userId}::uuid and validity_status='valid' and attribution_expires_at>now() order by first_visit_at limit 1`)[0];
  if (existing) return existing.id;
  const rep = (await tx.$queryRaw<Array<{ id: string; user_id: string; referral_code: string }>>`select id,user_id,referral_code from public.sales_reps where referral_code=${code} and status='active' for share`)[0];
  if (!rep || rep.user_id === userId) return null;
  const token = crypto.randomUUID();
  return (await tx.$queryRaw<Array<{ id: string }>>`
    insert into public.sales_referral_attributions(sales_rep_id,referral_code,visitor_token_hash,registered_user_id,registered_at,is_qualified_registration,attribution_expires_at)
    values(${rep.id}::uuid,${rep.referral_code},${referralTokenHash(token)},${userId}::uuid,now(),true,now()+interval '30 days') returning id
  `)[0]?.id ?? null;
}

export async function markSalesAttribution(userId: string, event: "assessment_started" | "assessment_completed") {
  if (event === "assessment_started") await prisma.$executeRaw`update public.sales_referral_attributions set assessment_started_at=coalesce(assessment_started_at,now()),updated_at=now() where registered_user_id=${userId}::uuid and validity_status='valid'`;
  else await prisma.$executeRaw`update public.sales_referral_attributions set assessment_completed_at=coalesce(assessment_completed_at,now()),updated_at=now() where registered_user_id=${userId}::uuid and validity_status='valid'`;
}
