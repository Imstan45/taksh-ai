"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { mainEnvironment } from "@/lib/env";
import { invitationInputSchema } from "@/lib/invitations";
import { createToken, hashToken } from "@/lib/security/tokens";
import { institutionCanAccessCourse, type InstitutionType } from "@/lib/institution-content";
import { setCareerStarterTestAccess } from "@/lib/entitlements/career-starter";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") throw new Error("Unauthorized");
  return session;
}

export async function createInstitution(formData: FormData) {
  const session = await requireSuperAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const institutionType = String(formData.get("institutionType") ?? "") as InstitutionType;
  if (name.length < 2 || !slug) throw new Error("A valid institution name and slug are required.");
  if (!["school", "college"].includes(institutionType)) throw new Error("Choose whether this institution is a school or college.");
  await prisma.$executeRaw`
    INSERT INTO public.institutions (name, slug, institution_type)
    VALUES (${name}, ${slug}, ${institutionType})
    ON CONFLICT (slug) DO UPDATE SET name = excluded.name, institution_type = excluded.institution_type,
      status = 'active', updated_at = now()
  `;
  await prisma.$executeRaw`
    INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, new_values)
    VALUES (${session.user.id}::uuid, 'institution.upserted', 'institution', ${slug}, ${JSON.stringify({ name, slug, institutionType })}::jsonb)
  `;
  revalidatePath("/super-admin/institutions");
}

export async function updateUserAccess(formData: FormData) {
  const session = await requireSuperAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  let institutionId = String(formData.get("institutionId") ?? "");
  if (!["STUDENT", "FACULTY", "COLLEGE_ADMIN", "SUPER_ADMIN"].includes(role)) throw new Error("Invalid role.");
  if (session.user.id === userId && role !== "SUPER_ADMIN") throw new Error("You cannot demote your own Super Admin account.");
  if (["STUDENT", "FACULTY", "COLLEGE_ADMIN"].includes(role) && !institutionId) throw new Error("This role requires an institution.");
  if (role === "SUPER_ADMIN") institutionId = "";
  if (institutionId) {
    const institution = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM public.institutions WHERE id=${institutionId}::uuid AND status='active'`;
    if (!institution[0]) throw new Error("Choose an active institution.");
  }
  const previousRows = await prisma.$queryRaw<Array<{ role: string; institution_id: string | null }>>`
    SELECT role::text, institution_id FROM public.user_roles WHERE user_id = ${userId}::uuid
  `;
  const previous = previousRows[0];
  if (!previous) throw new Error("User role record was not found.");
  if (previous.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
    const activeSuperAdmins = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint AS count FROM public.user_roles
      WHERE role = 'SUPER_ADMIN' AND account_status = 'active'
    `;
    if (Number(activeSuperAdmins[0]?.count ?? 0) <= 1) throw new Error("The final active Super Admin cannot be demoted.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE public.user_roles
      SET role = ${role}::public.app_role,
          institution_id = ${institutionId || null}::uuid,
          authorization_version = authorization_version + 1,
          updated_at = now()
      WHERE user_id = ${userId}::uuid
    `;
    if (previous.institution_id !== (institutionId || null)) {
      await tx.$executeRaw`
        UPDATE public.user_academic_memberships SET active=false,updated_at=now()
        WHERE user_id=${userId}::uuid AND institution_id IS DISTINCT FROM ${institutionId || null}::uuid AND active`;
      await tx.$executeRaw`
        UPDATE public.student_course_assignments SET active=false,revoked_at=now()
        WHERE student_id=${userId}::uuid AND institution_id IS DISTINCT FROM ${institutionId || null}::uuid AND active`;
    }
    await tx.$executeRaw`
      INSERT INTO public.audit_logs (
        actor_id, institution_id, action, target_type, target_id, previous_values, new_values
      ) VALUES (
        ${session.user.id}::uuid, ${institutionId || null}::uuid, 'user.access_changed', 'user', ${userId},
        ${JSON.stringify(previous)}::jsonb,
        ${JSON.stringify({ role, institutionId: institutionId || null })}::jsonb
      )
    `;
  });
  revalidatePath("/super-admin/users");
}

export async function updateUserStatus(formData: FormData) {
  const session = await requireSuperAdmin();
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["active", "suspended", "disabled"].includes(status)) throw new Error("Invalid account status.");
  if (userId === session.user.id && status !== "active") throw new Error("You cannot suspend or disable your own account.");
  const previous = await prisma.$queryRaw<Array<{ account_status: string; role: string }>>`
    SELECT account_status, role::text FROM public.user_roles WHERE user_id = ${userId}::uuid
  `;
  if (!previous[0]) throw new Error("User not found.");
  if (previous[0].role === "SUPER_ADMIN" && status !== "active") {
    const active = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint AS count FROM public.user_roles WHERE role = 'SUPER_ADMIN' AND account_status = 'active'
    `;
    if (Number(active[0]?.count ?? 0) <= 1) throw new Error("The final active Super Admin cannot be suspended.");
  }
  await prisma.$executeRaw`
    UPDATE public.user_roles SET account_status = ${status},
      authorization_version = authorization_version + 1, updated_at = now()
    WHERE user_id = ${userId}::uuid
  `;
  await prisma.$executeRaw`
    INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, previous_values, new_values)
    VALUES (${session.user.id}::uuid, 'user.status_changed', 'user', ${userId},
      ${JSON.stringify(previous[0])}::jsonb, ${JSON.stringify({ accountStatus: status })}::jsonb)
  `;
  revalidatePath("/super-admin/users");
}

export async function updateCareerStarterAccess(formData:FormData){
  const session=await requireSuperAdmin();
  const userId=String(formData.get("userId")??"");
  const enabled=String(formData.get("enabled"))==="true";
  const user=await prisma.$queryRaw<Array<{role:string}>>`select role::text role from public.user_roles where user_id=${userId}::uuid`;
  if(user[0]?.role!=="STUDENT") throw new Error("Career Starter access can only be assigned to a student.");
  await setCareerStarterTestAccess(userId,enabled,session.user.id);
  await prisma.$executeRaw`insert into public.audit_logs(actor_id,action,target_type,target_id,new_values) values(${session.user.id}::uuid,'career_starter.admin_test_access','user',${userId},${JSON.stringify({enabled,noTransaction:true})}::jsonb)`;
  revalidatePath("/super-admin/users");
}

export async function updateInstitutionStatus(formData: FormData) {
  const session = await requireSuperAdmin();
  const institutionId = String(formData.get("institutionId") ?? "");
  const status = String(formData.get("status") ?? "");
  const institutionType = String(formData.get("institutionType") ?? "") as InstitutionType;
  if (!["active", "suspended", "archived"].includes(status)) throw new Error("Invalid institution status.");
  if (!["school", "college"].includes(institutionType)) throw new Error("Invalid institution type.");
  const previous = await prisma.$queryRaw<Array<{ status: string; institution_type: string }>>`
    SELECT status,institution_type FROM public.institutions WHERE id = ${institutionId}::uuid
  `;
  if (!previous[0]) throw new Error("Institution not found.");
  await prisma.$executeRaw`
    UPDATE public.institutions SET status = ${status}, institution_type=${institutionType}, updated_at = now() WHERE id = ${institutionId}::uuid
  `;
  await prisma.$executeRaw`
    INSERT INTO public.audit_logs (actor_id, institution_id, action, target_type, target_id, previous_values, new_values)
    VALUES (${session.user.id}::uuid, ${institutionId}::uuid, 'institution.status_changed', 'institution', ${institutionId},
      ${JSON.stringify(previous[0])}::jsonb, ${JSON.stringify({ status, institutionType })}::jsonb)
  `;
  revalidatePath("/super-admin/institutions");
}

export async function grantInstitutionCourse(formData: FormData) {
  const session = await requireSuperAdmin();
  const institutionId = String(formData.get("institutionId") ?? "");
  const course = String(formData.get("course") ?? "").trim();
  if (!institutionId || !course) throw new Error("Institution and course are required.");
  const institutions = await prisma.$queryRaw<Array<{ institution_type: InstitutionType }>>`
    SELECT institution_type FROM public.institutions WHERE id=${institutionId}::uuid AND status='active'`;
  if (!institutions[0]) throw new Error("Choose an active institution.");
  if (!institutionCanAccessCourse(institutions[0].institution_type, course)) {
    throw new Error(`This course is not available to ${institutions[0].institution_type} institutions.`);
  }
  await prisma.$executeRaw`
    INSERT INTO public.institution_course_access (institution_id, course, created_by)
    VALUES (${institutionId}::uuid, ${course}, ${session.user.id}::uuid)
    ON CONFLICT (institution_id, course) DO UPDATE SET active = true, updated_at = now()
  `;
  await prisma.$executeRaw`
    INSERT INTO public.audit_logs (actor_id, institution_id, action, target_type, target_id, new_values)
    VALUES (${session.user.id}::uuid, ${institutionId}::uuid, 'course.granted', 'course', ${course},
      ${JSON.stringify({ institutionId, course })}::jsonb)
  `;
  revalidatePath("/super-admin/courses");
}

export async function assignStudentCourse(formData: FormData) {
  const session = await requireSuperAdmin();
  const studentId = String(formData.get("studentId") ?? "");
  const course = String(formData.get("course") ?? "").trim();
  const scope = await prisma.$queryRaw<Array<{ institution_id: string; institution_type: InstitutionType }>>`
    SELECT role.institution_id,institution.institution_type
    FROM public.user_roles role
    JOIN public.institutions institution ON institution.id=role.institution_id
    WHERE role.user_id = ${studentId}::uuid AND role.role = 'STUDENT' AND role.account_status = 'active'
      AND institution.status = 'active'
  `;
  if (!scope[0]?.institution_id) throw new Error("The student does not have an active institution account.");
  if (!institutionCanAccessCourse(scope[0].institution_type, course)) throw new Error("This course does not match the student's institution type.");
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO public.institution_course_access (institution_id, course, created_by)
      VALUES (${scope[0].institution_id}::uuid, ${course}, ${session.user.id}::uuid)
      ON CONFLICT (institution_id, course) DO UPDATE SET active=true,updated_at=now()
    `;
    await tx.$executeRaw`
      INSERT INTO public.student_course_assignments (student_id,institution_id,course,assigned_by,active)
      VALUES (${studentId}::uuid,${scope[0].institution_id}::uuid,${course},${session.user.id}::uuid,true)
      ON CONFLICT (student_id,course) DO UPDATE SET
        institution_id=excluded.institution_id,active=true,revoked_at=null,assigned_by=excluded.assigned_by,assigned_at=now()
    `;
    await tx.$executeRaw`
      INSERT INTO public.audit_logs (actor_id,institution_id,action,target_type,target_id,new_values)
      VALUES (${session.user.id}::uuid,${scope[0].institution_id}::uuid,'course.assigned','student',${studentId},
        ${JSON.stringify({ course, institutionAccessGranted: true })}::jsonb)
    `;
  });
  revalidatePath("/super-admin/courses");
}

export async function revokeStudentCourse(formData: FormData) {
  const session = await requireSuperAdmin();
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const assignments = await prisma.$queryRaw<Array<{ student_id: string; institution_id: string | null; course: string }>>`
    SELECT student_id, institution_id, course FROM public.student_course_assignments WHERE id = ${assignmentId}::uuid
  `;
  if (!assignments[0]) throw new Error("Assignment not found.");
  await prisma.$executeRaw`
    UPDATE public.student_course_assignments SET active = false, revoked_at = now() WHERE id = ${assignmentId}::uuid
  `;
  await prisma.$executeRaw`
    INSERT INTO public.audit_logs (actor_id, institution_id, action, target_type, target_id, new_values)
    VALUES (${session.user.id}::uuid, ${assignments[0].institution_id}::uuid, 'course.revoked', 'student', ${assignments[0].student_id},
      ${JSON.stringify({ course: assignments[0].course })}::jsonb)
  `;
  revalidatePath("/super-admin/courses");
}

export async function inviteUser(formData: FormData) {
  const session = await requireSuperAdmin();
  const { email, role, institutionId } = invitationInputSchema.parse({
    email: formData.get("email"), role: formData.get("role"), institutionId: formData.get("institutionId"),
  });
  const pending = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM public.invitations WHERE lower(email) = ${email}
      AND role = ${role}::public.app_role AND status = 'pending' AND expires_at > now()
  `;
  if (pending.length) throw new Error("A pending invitation already exists for this email and role.");
  const invitationId = crypto.randomUUID();
  const rawToken = createToken();
  const redirectTo = `${mainEnvironment().NEXT_PUBLIC_APP_URL}/accept-invitation?invitation=${invitationId}&invitation_token=${encodeURIComponent(rawToken)}`;
  const { data, error } = await createSupabaseAdminClient().auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { invited_by: session.user.id, invitation_id: invitationId },
  });
  if (error || !data.user) throw new Error(error?.message ?? "Invitation could not be sent.");
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO public.invitations (
        id, email, role, institution_id, token_hash, invited_by, expires_at
      ) VALUES (
        ${invitationId}::uuid, ${email}, ${role}::public.app_role, ${institutionId}::uuid,
        ${hashToken(rawToken)}, ${session.user.id}::uuid, now() + interval '7 days'
      )
    `;
    await tx.$executeRaw`
      INSERT INTO public.user_roles (user_id, role, institution_id, account_status)
      VALUES (${data.user.id}::uuid, ${role}::public.app_role, ${institutionId}::uuid, 'invited')
      ON CONFLICT (user_id) DO UPDATE SET role = excluded.role,
        institution_id = excluded.institution_id, account_status = 'invited',
        authorization_version = user_roles.authorization_version + 1, updated_at = now()
    `;
    await tx.$executeRaw`
      INSERT INTO public.audit_logs (actor_id, institution_id, action, target_type, target_id, new_values)
      VALUES (${session.user.id}::uuid, ${institutionId}::uuid, 'invitation.sent', 'invitation', ${invitationId},
        ${JSON.stringify({ email, role })}::jsonb)
    `;
  });
  revalidatePath("/super-admin/users");
}

export async function revokeInvitation(formData: FormData) {
  const session = await requireSuperAdmin();
  const invitationId = String(formData.get("invitationId") ?? "");
  const changed = await prisma.$queryRaw<Array<{ institution_id: string | null; email: string }>>`
    UPDATE public.invitations SET status = 'revoked', updated_at = now()
    WHERE id = ${invitationId}::uuid AND status = 'pending'
    RETURNING institution_id, email
  `;
  if (!changed[0]) throw new Error("Only pending invitations can be revoked.");
  await prisma.$executeRaw`
    INSERT INTO public.audit_logs (actor_id, institution_id, action, target_type, target_id, new_values)
    VALUES (${session.user.id}::uuid, ${changed[0].institution_id}::uuid, 'invitation.revoked',
      'invitation', ${invitationId}, ${JSON.stringify({ email: changed[0].email })}::jsonb)
  `;
  revalidatePath("/super-admin/users");
}

export async function resendInvitation(formData: FormData) {
  const session = await requireSuperAdmin();
  const invitationId = String(formData.get("invitationId") ?? "");
  const rows = await prisma.$queryRaw<Array<{ email: string; institution_id: string }>>`
    SELECT email, institution_id FROM public.invitations
    WHERE id = ${invitationId}::uuid AND status IN ('pending', 'expired')
  `;
  const invitation = rows[0];
  if (!invitation) throw new Error("This invitation cannot be resent.");
  const rawToken = createToken();
  const redirectTo = `${mainEnvironment().NEXT_PUBLIC_APP_URL}/accept-invitation?invitation=${invitationId}&invitation_token=${encodeURIComponent(rawToken)}`;
  const { error } = await createSupabaseAdminClient().auth.admin.inviteUserByEmail(invitation.email, {
    redirectTo, data: { invited_by: session.user.id, invitation_id: invitationId },
  });
  if (error) throw new Error(error.message);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE public.invitations SET token_hash = ${hashToken(rawToken)}, status = 'pending',
        expires_at = now() + interval '7 days', accepted_by = null, accepted_at = null, updated_at = now()
      WHERE id = ${invitationId}::uuid
    `;
    await tx.$executeRaw`
      INSERT INTO public.audit_logs (actor_id, institution_id, action, target_type, target_id)
      VALUES (${session.user.id}::uuid, ${invitation.institution_id}::uuid, 'invitation.resent', 'invitation', ${invitationId})
    `;
  });
  revalidatePath("/super-admin/users");
}

export async function saveProduct(formData:FormData){const session=await requireSuperAdmin();const id=String(formData.get("id")??""),name=String(formData.get("name")??"").trim(),description=String(formData.get("description")??"").trim(),price=Math.round(Number(formData.get("price"))*100),referenceRaw=String(formData.get("referencePrice")??""),referencePrice=referenceRaw?Math.round(Number(referenceRaw)*100):null,active=formData.get("active")==="on",campaignAvailable=formData.get("campaignAvailable")==="on",displayOrder=Number(formData.get("displayOrder")??0),courses=formData.getAll("courses").map(String);if(!id||name.length<2||description.length<10||!Number.isInteger(price)||price<0||referencePrice!==null&&referencePrice<price)throw new Error("Enter valid product details and pricing.");await prisma.$transaction(async tx=>{const changed=await tx.$executeRaw`update public.products set name=${name},description=${description},price_in_paise=${price},reference_price_in_paise=${referencePrice},active=${active},campaign_available=${campaignAvailable},display_order=${displayOrder},updated_at=now() where id=${id}::uuid`;if(!changed)throw new Error("Product not found.");await tx.$executeRaw`delete from public.product_courses where product_id=${id}::uuid`;for(const [index,course] of courses.entries())await tx.$executeRaw`insert into public.product_courses(product_id,course,display_order) select ${id}::uuid,title,${index} from public.courses where title=${course} and published on conflict do nothing`;await tx.$executeRaw`insert into public.audit_logs(actor_id,action,target_type,target_id,new_values) values(${session.user.id}::uuid,'product.updated','product',${id},${JSON.stringify({name,price,referencePrice,active,campaignAvailable,courses})}::jsonb)`});revalidatePath("/super-admin/products");revalidatePath("/programs")}

export async function saveCampaign(formData:FormData){const session=await requireSuperAdmin();const id=String(formData.get("id")??""),name=String(formData.get("name")??"").trim(),code=String(formData.get("code")??"").trim().toLowerCase().replace(/[^a-z0-9-]+/g,"-"),source=String(formData.get("source")??"").trim().toLowerCase(),startsAt=String(formData.get("startsAt")??""),endsAt=String(formData.get("endsAt")??""),active=formData.get("active")==="on";if(name.length<2||!code||!source)throw new Error("Campaign name, code and source are required.");if(startsAt&&endsAt&&new Date(endsAt)<=new Date(startsAt))throw new Error("Campaign end must be after its start.");if(id)await prisma.$executeRaw`update public.campaigns set name=${name},code=${code},source=${source},starts_at=${startsAt||null}::timestamptz,ends_at=${endsAt||null}::timestamptz,active=${active},updated_at=now() where id=${id}::uuid`;else await prisma.$executeRaw`insert into public.campaigns(name,code,source,starts_at,ends_at,active,created_by) values(${name},${code},${source},${startsAt||null}::timestamptz,${endsAt||null}::timestamptz,${active},${session.user.id}::uuid)`;revalidatePath("/super-admin/campaigns")}

export async function grantProductAccess(formData:FormData){const session=await requireSuperAdmin();const userId=String(formData.get("userId")??""),productId=String(formData.get("productId")??""),source=String(formData.get("source")??"manual"),expiresAt=String(formData.get("expiresAt")??"");if(!["manual","promotional","institutional"].includes(source))throw new Error("Invalid access source.");const scope=await prisma.$queryRaw<Array<{user_id:string;product_id:string}>>`select role.user_id,product.id product_id from public.user_roles role cross join public.products product where role.user_id=${userId}::uuid and role.role='STUDENT' and product.id=${productId}::uuid and product.active`;if(!scope[0])throw new Error("Student or product was not found.");await prisma.$executeRaw`insert into public.entitlements(user_id,product_id,starts_at,expires_at,status,grant_source,granted_by) values(${userId}::uuid,${productId}::uuid,now(),${expiresAt||null}::timestamptz,'active',${source},${session.user.id}::uuid) on conflict(user_id,product_id) where status='active' and product_id is not null do update set expires_at=excluded.expires_at,grant_source=excluded.grant_source,granted_by=excluded.granted_by,updated_at=now()`;revalidatePath("/super-admin/access")}

export async function revokeProductAccess(formData:FormData){await requireSuperAdmin();const entitlementId=String(formData.get("entitlementId")??"");const changed=await prisma.$executeRaw`update public.entitlements set status='revoked',updated_at=now() where id=${entitlementId}::uuid and status='active'`;if(!changed)throw new Error("Active entitlement not found.");revalidatePath("/super-admin/access")}
