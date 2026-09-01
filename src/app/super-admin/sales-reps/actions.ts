"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { createToken, hashToken } from "@/lib/security/tokens";
import { mainEnvironment } from "@/lib/env";
import { salesReferralCode } from "@/lib/referrals/code";
import { revalidatePath } from "next/cache";

async function requireSuper() { const session=await auth(); if(!session?.user||session.user.role!=="SUPER_ADMIN") throw new Error("Super Admin access required."); return session.user; }
const refresh=()=>revalidatePath("/super-admin/sales-reps");

export async function inviteSalesRep(formData: FormData) {
  const admin=await requireSuper(),email=String(formData.get("email")??"").trim().toLowerCase(),fullName=String(formData.get("fullName")??"").trim(),phone=String(formData.get("phone")??"").trim(),college=String(formData.get("college")??"").trim(),city=String(formData.get("city")??"").trim();
  if(!email.includes("@")||fullName.length<2) throw new Error("A valid name and email are required.");
  const pending=await prisma.$queryRaw<Array<{id:string}>>`select id from public.invitations where lower(email)=${email} and role='SALES_REP' and status='pending' and expires_at>now()`;
  if(pending[0]) throw new Error("A pending Sales Rep invitation already exists.");
  const invitationId=crypto.randomUUID(),rawToken=createToken(),redirectTo=`${mainEnvironment().NEXT_PUBLIC_APP_URL}/accept-invitation?invitation=${invitationId}&invitation_token=${encodeURIComponent(rawToken)}`;
  const {data,error}=await createSupabaseAdminClient().auth.admin.inviteUserByEmail(email,{redirectTo,data:{full_name:fullName,invited_by:admin.id,invitation_id:invitationId}});
  if(error||!data.user) throw new Error(error?.message??"Invitation could not be sent.");
  await prisma.$transaction(async tx=>{
    await tx.$executeRaw`insert into public.invitations(id,email,role,institution_id,token_hash,invited_by,expires_at) values(${invitationId}::uuid,${email},'SALES_REP',null,${hashToken(rawToken)},${admin.id}::uuid,now()+interval '7 days')`;
    await tx.$executeRaw`insert into public.user_roles(user_id,role,institution_id,account_status) values(${data.user.id}::uuid,'SALES_REP',null,'invited') on conflict(user_id) do update set role='SALES_REP',institution_id=null,account_status='invited',authorization_version=user_roles.authorization_version+1,updated_at=now()`;
    await tx.$executeRaw`insert into public.sales_reps(user_id,full_name,email,phone,college,city,referral_code,status,approved_by) values(${data.user.id}::uuid,${fullName},${email},${phone||null},${college||null},${city||null},${salesReferralCode(fullName)},'invited',${admin.id}::uuid) on conflict(user_id) do update set full_name=excluded.full_name,email=excluded.email,phone=excluded.phone,college=excluded.college,city=excluded.city,status='invited',approved_by=excluded.approved_by,updated_at=now()`;
    await tx.$executeRaw`insert into public.audit_logs(actor_id,action,target_type,target_id,new_values) values(${admin.id}::uuid,'sales_rep.invited','sales_rep',${data.user.id},${JSON.stringify({email,fullName})}::jsonb)`;
  });refresh();
}

export async function changeSalesRepStatus(formData:FormData){
  const admin=await requireSuper(),id=String(formData.get("id")??""),status=String(formData.get("status")??"");
  if(!["active","suspended","rejected"].includes(status))throw new Error("Invalid status.");
  await prisma.$transaction(async tx=>{
    const current=(await tx.$queryRaw<Array<{user_id:string;full_name:string;status:string;referral_code:string|null}>>`select user_id,full_name,status,referral_code from public.sales_reps where id=${id}::uuid for update`)[0];
    if(!current)throw new Error("Sales Rep not found.");
    const code=current.referral_code??(status==="active"?salesReferralCode(current.full_name):null);
    await tx.$executeRaw`update public.sales_reps set status=${status},referral_code=${code},joined_at=case when ${status}='active' then coalesce(joined_at,now()) else joined_at end,approved_by=case when ${status}='active' then ${admin.id}::uuid else approved_by end,updated_at=now() where id=${id}::uuid`;
    await tx.$executeRaw`update public.user_roles set account_status=${status},authorization_version=authorization_version+1,updated_at=now() where user_id=${current.user_id}::uuid`;
    await tx.$executeRaw`insert into public.audit_logs(actor_id,action,target_type,target_id,previous_values,new_values) values(${admin.id}::uuid,'sales_rep.status_changed','sales_rep',${id},${JSON.stringify({status:current.status})}::jsonb,${JSON.stringify({status})}::jsonb)`;
  });refresh();
}

export async function promoteSelectedParticipant(formData:FormData){const admin=await requireSuper(),participantId=String(formData.get("participantId")??"");await prisma.$transaction(async tx=>{const row=(await tx.$queryRaw<Array<{user_id:string;display_name:string;email:string;referral_code:string}>>`select p.user_id,p.display_name,u.email,p.referral_code from public.sales_challenge_participants p join auth.users u on u.id=p.user_id where p.id=${participantId}::uuid and p.selection_status='selected' for update`)[0];if(!row)throw new Error("Only a selected participant can be promoted.");const rep=(await tx.$queryRaw<Array<{id:string}>>`insert into public.sales_reps(user_id,source_participant_id,full_name,email,referral_code,status,joined_at,approved_by) values(${row.user_id}::uuid,${participantId}::uuid,${row.display_name},${row.email},${salesReferralCode(row.display_name)},'active',now(),${admin.id}::uuid) on conflict(user_id) do update set status='active',referral_code=coalesce(sales_reps.referral_code,excluded.referral_code),joined_at=coalesce(sales_reps.joined_at,now()),approved_by=excluded.approved_by,updated_at=now() returning id`)[0];await tx.$executeRaw`update public.user_roles set role='SALES_REP',institution_id=null,account_status='active',authorization_version=authorization_version+1,updated_at=now() where user_id=${row.user_id}::uuid`;await tx.$executeRaw`update public.sales_referral_attributions set sales_rep_id=${rep.id}::uuid where participant_id=${participantId}::uuid`;});refresh()}
