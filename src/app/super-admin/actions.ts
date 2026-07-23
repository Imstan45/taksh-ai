"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") throw new Error("Unauthorized");
  return session;
}

export async function createInstitution(formData: FormData) {
  const session = await requireSuperAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (name.length < 2 || !slug) throw new Error("A valid institution name and slug are required.");
  await prisma.$executeRaw`
    INSERT INTO public.institutions (name, slug)
    VALUES (${name}, ${slug})
    ON CONFLICT (slug) DO UPDATE SET name = excluded.name, active = true, updated_at = now()
  `;
  await prisma.$executeRaw`
    INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, new_values)
    VALUES (${session.user.id}::uuid, 'institution.upserted', 'institution', ${slug}, ${JSON.stringify({ name, slug })}::jsonb)
  `;
  revalidatePath("/super-admin/institutions");
}

export async function updateUserAccess(formData: FormData) {
  const session = await requireSuperAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  const institutionId = String(formData.get("institutionId") ?? "");
  if (!["STUDENT", "FACULTY", "COLLEGE_ADMIN", "SUPER_ADMIN"].includes(role)) throw new Error("Invalid role.");
  if (session.user.id === userId && role !== "SUPER_ADMIN") throw new Error("You cannot demote your own Super Admin account.");
  if (["FACULTY", "COLLEGE_ADMIN"].includes(role) && !institutionId) throw new Error("This role requires an institution.");
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
  await prisma.$executeRaw`
    UPDATE public.user_roles
    SET role = ${role}::public.app_role,
        institution_id = ${institutionId || null}::uuid,
        authorization_version = authorization_version + 1,
        updated_at = now()
    WHERE user_id = ${userId}::uuid
  `;
  await prisma.$executeRaw`
    INSERT INTO public.audit_logs (
      actor_id, institution_id, action, target_type, target_id, previous_values, new_values
    ) VALUES (
      ${session.user.id}::uuid, ${institutionId || null}::uuid, 'user.access_changed', 'user', ${userId},
      ${JSON.stringify(previous)}::jsonb,
      ${JSON.stringify({ role, institutionId: institutionId || null })}::jsonb
    )
  `;
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

export async function updateInstitutionStatus(formData: FormData) {
  const session = await requireSuperAdmin();
  const institutionId = String(formData.get("institutionId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["active", "suspended", "archived"].includes(status)) throw new Error("Invalid institution status.");
  const previous = await prisma.$queryRaw<Array<{ status: string }>>`
    SELECT status FROM public.institutions WHERE id = ${institutionId}::uuid
  `;
  await prisma.$executeRaw`
    UPDATE public.institutions SET status = ${status}, updated_at = now() WHERE id = ${institutionId}::uuid
  `;
  await prisma.$executeRaw`
    INSERT INTO public.audit_logs (actor_id, institution_id, action, target_type, target_id, previous_values, new_values)
    VALUES (${session.user.id}::uuid, ${institutionId}::uuid, 'institution.status_changed', 'institution', ${institutionId},
      ${JSON.stringify(previous[0] ?? {})}::jsonb, ${JSON.stringify({ status })}::jsonb)
  `;
  revalidatePath("/super-admin/institutions");
}

export async function grantInstitutionCourse(formData: FormData) {
  const session = await requireSuperAdmin();
  const institutionId = String(formData.get("institutionId") ?? "");
  const course = String(formData.get("course") ?? "").trim();
  if (!institutionId || !course) throw new Error("Institution and course are required.");
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
  const scope = await prisma.$queryRaw<Array<{ institution_id: string }>>`
    SELECT role.institution_id
    FROM public.user_roles role
    JOIN public.institution_course_access access
      ON access.institution_id = role.institution_id AND access.course = ${course} AND access.active
    WHERE role.user_id = ${studentId}::uuid AND role.role = 'STUDENT' AND role.account_status = 'active'
  `;
  if (!scope[0]?.institution_id) throw new Error("The student is not active or the course is not available to their institution.");
  await prisma.$executeRaw`
    INSERT INTO public.student_course_assignments (
      student_id, institution_id, course, assigned_by, active
    ) VALUES (
      ${studentId}::uuid, ${scope[0].institution_id}::uuid, ${course}, ${session.user.id}::uuid, true
    )
    ON CONFLICT (student_id, course) DO UPDATE SET
      active = true, revoked_at = null, assigned_by = excluded.assigned_by, assigned_at = now()
  `;
  await prisma.$executeRaw`
    INSERT INTO public.audit_logs (actor_id, institution_id, action, target_type, target_id, new_values)
    VALUES (${session.user.id}::uuid, ${scope[0].institution_id}::uuid, 'course.assigned', 'student', ${studentId},
      ${JSON.stringify({ course })}::jsonb)
  `;
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
