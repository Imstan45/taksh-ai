"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SALES_CHALLENGE_RULES_VERSION } from "@/lib/sales-challenge/rules";
import { redirect } from "next/navigation";

export async function joinSalesChallenge(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/sales-challenge/join");
  if (formData.get("acceptRules") !== "on") throw new Error("You must accept the challenge rules.");
  const challengeId = String(formData.get("challengeId") ?? "");
  const displayName = String(formData.get("displayName") ?? session.user.name ?? "").trim();
  if (displayName.length < 2 || displayName.length > 80) throw new Error("Enter a valid public display name.");
  const challenge = (await prisma.$queryRaw<Array<{ id: string; rules_version: string }>>`select id,rules_version from public.sales_challenges where id=${challengeId}::uuid and status in('registration_open','active') and now()<end_at`)[0];
  if (!challenge) throw new Error("Registration is not currently open.");
  const referralCode = `TSC-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
  await prisma.$transaction(async tx => {
    const participant = (await tx.$queryRaw<Array<{ id: string }>>`insert into public.sales_challenge_participants(challenge_id,user_id,referral_code,display_name,rules_accepted_at,rules_version) values(${challenge.id}::uuid,${session.user.id}::uuid,${referralCode},${displayName},now(),${challenge.rules_version || SALES_CHALLENGE_RULES_VERSION}) on conflict(challenge_id,user_id) do update set display_name=excluded.display_name,updated_at=now() returning id`)[0];
    await tx.$executeRaw`insert into public.sales_challenge_audit_events(challenge_id,participant_id,actor_id,action,metadata) values(${challenge.id}::uuid,${participant.id}::uuid,${session.user.id}::uuid,'participant.joined',${JSON.stringify({ rulesVersion: challenge.rules_version })}::jsonb)`;
  });
  redirect("/sales-challenge/dashboard");
}
