"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCollegeAdmin } from "@/lib/admin-scope";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { createToken, hashToken } from "@/lib/security/tokens";
import { mainEnvironment } from "@/lib/env";

const clean = (value: FormDataEntryValue | null) => String(value ?? "").trim();

export async function saveDepartment(formData: FormData) {
  const { session, institutionId } = await requireCollegeAdmin();
  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));
  const code = clean(formData.get("code")).toUpperCase();
  if (name.length < 2 || !code) throw new Error("Department name and code are required.");
  if (id) {
    const changed = await prisma.$executeRaw`
      UPDATE public.departments SET name=${name}, code=${code}, updated_at=now()
      WHERE id=${id}::uuid AND institution_id=${institutionId}::uuid
    `;
    if (!changed) throw new Error("Department not found in your institution.");
  } else {
    await prisma.$executeRaw`
      INSERT INTO public.departments(institution_id,name,code) VALUES (${institutionId}::uuid,${name},${code})
    `;
  }
  await prisma.$executeRaw`
    INSERT INTO public.audit_logs(actor_id,institution_id,action,target_type,target_id,new_values)
    VALUES (${session.user.id}::uuid,${institutionId}::uuid,'department.saved','department',${id || code},
      ${JSON.stringify({ name, code })}::jsonb)
  `;
  revalidatePath("/admin/departments");
  revalidatePath("/admin");
}

export async function setDepartmentStatus(formData: FormData) {
  const { institutionId } = await requireCollegeAdmin();
  const id = clean(formData.get("id"));
  const status = clean(formData.get("status"));
  if (!["active", "inactive"].includes(status)) throw new Error("Invalid status.");
  const changed = await prisma.$executeRaw`
    UPDATE public.departments SET status=${status},updated_at=now()
    WHERE id=${id}::uuid AND institution_id=${institutionId}::uuid
  `;
  if (!changed) throw new Error("Department not found in your institution.");
  revalidatePath("/admin/departments");
}

export async function saveAcademicYear(formData: FormData) {
  const { institutionId } = await requireCollegeAdmin();
  const name = clean(formData.get("name"));
  const startsOn = clean(formData.get("startsOn"));
  const endsOn = clean(formData.get("endsOn"));
  if (!name || !startsOn || !endsOn || new Date(endsOn) <= new Date(startsOn)) throw new Error("A valid name and date range are required.");
  await prisma.$executeRaw`
    INSERT INTO public.academic_years(institution_id,name,starts_on,ends_on)
    VALUES (${institutionId}::uuid,${name},${startsOn}::date,${endsOn}::date)
    ON CONFLICT(institution_id,name) DO UPDATE SET starts_on=excluded.starts_on,ends_on=excluded.ends_on,
      status='active',updated_at=now()
  `;
  revalidatePath("/admin/academics");
  revalidatePath("/admin");
}

export async function saveBatch(formData: FormData) {
  const { institutionId } = await requireCollegeAdmin();
  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));
  const departmentId = clean(formData.get("departmentId"));
  const academicYearId = clean(formData.get("academicYearId"));
  const scope = await prisma.$queryRaw<Array<{ year_name: string }>>`
    SELECT year.name AS year_name FROM public.academic_years year
    JOIN public.departments department ON department.institution_id=year.institution_id
    WHERE year.id=${academicYearId}::uuid AND department.id=${departmentId}::uuid
      AND year.institution_id=${institutionId}::uuid
  `;
  if (!name || !scope[0]) throw new Error("Batch, department and academic year must belong to your institution.");
  if (id) {
    const changed = await prisma.$executeRaw`
      UPDATE public.academic_batches SET name=${name},department_id=${departmentId}::uuid,
        academic_year_id=${academicYearId}::uuid,academic_year=${scope[0].year_name},updated_at=now()
      WHERE id=${id}::uuid AND institution_id=${institutionId}::uuid
    `;
    if (!changed) throw new Error("Batch not found in your institution.");
  } else {
    await prisma.$executeRaw`
      INSERT INTO public.academic_batches(institution_id,department_id,academic_year_id,name,academic_year)
      VALUES (${institutionId}::uuid,${departmentId}::uuid,${academicYearId}::uuid,${name},${scope[0].year_name})
    `;
  }
  revalidatePath("/admin/academics");
  revalidatePath("/admin");
}

export async function setBatchStatus(formData: FormData) {
  const { institutionId } = await requireCollegeAdmin();
  const id = clean(formData.get("id"));
  const status = clean(formData.get("status"));
  if (!["active", "inactive"].includes(status)) throw new Error("Invalid status.");
  const changed = await prisma.$executeRaw`
    UPDATE public.academic_batches SET status=${status},updated_at=now()
    WHERE id=${id}::uuid AND institution_id=${institutionId}::uuid
  `;
  if (!changed) throw new Error("Batch not found in your institution.");
  revalidatePath("/admin/academics");
}

export async function inviteInstitutionUser(formData: FormData) {
  const { session, institutionId } = await requireCollegeAdmin();
  const email = clean(formData.get("email")).toLowerCase();
  const role = clean(formData.get("role"));
  if (!email.includes("@") || !["STUDENT", "FACULTY"].includes(role)) throw new Error("Valid email and role are required.");
  const duplicate = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM public.invitations WHERE lower(email)=${email} AND status='pending' AND expires_at>now()
  `;
  if (duplicate.length) throw new Error("A pending invitation already exists.");
  const id = crypto.randomUUID();
  const token = createToken();
  const redirectTo = `${mainEnvironment().NEXT_PUBLIC_APP_URL}/accept-invitation?invitation=${id}&invitation_token=${encodeURIComponent(token)}`;
  const { data, error } = await createSupabaseAdminClient().auth.admin.inviteUserByEmail(email, { redirectTo, data: { invitation_id: id } });
  if (error || !data.user) throw new Error(error?.message ?? "Invitation failed.");
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`INSERT INTO public.invitations(id,email,role,institution_id,token_hash,invited_by,expires_at)
      VALUES(${id}::uuid,${email},${role}::public.app_role,${institutionId}::uuid,${hashToken(token)},${session.user.id}::uuid,now()+interval '7 days')`;
    await tx.$executeRaw`INSERT INTO public.user_roles(user_id,role,institution_id,account_status)
      VALUES(${data.user.id}::uuid,${role}::public.app_role,${institutionId}::uuid,'invited')
      ON CONFLICT(user_id) DO UPDATE SET role=excluded.role,institution_id=excluded.institution_id,
      account_status='invited',authorization_version=user_roles.authorization_version+1,updated_at=now()`;
  });
  revalidatePath("/admin/people");
}

export async function updateInstitutionMember(formData: FormData) {
  const { institutionId } = await requireCollegeAdmin();
  const userId = clean(formData.get("userId"));
  const status = clean(formData.get("status"));
  const departmentId = clean(formData.get("departmentId"));
  const batchId = clean(formData.get("batchId"));
  if (status && !["active", "suspended"].includes(status)) throw new Error("Invalid status.");
  const target = await prisma.$queryRaw<Array<{ role: string }>>`
    SELECT role::text FROM public.user_roles WHERE user_id=${userId}::uuid
      AND institution_id=${institutionId}::uuid AND role IN ('STUDENT','FACULTY')
  `;
  if (!target[0]) throw new Error("User is outside your institution.");
  if (departmentId) {
    const valid = await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM public.departments WHERE id=${departmentId}::uuid AND institution_id=${institutionId}::uuid`;
    if (!valid[0]) throw new Error("Department is outside your institution.");
  }
  if (batchId) {
    const valid = await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM public.academic_batches WHERE id=${batchId}::uuid AND institution_id=${institutionId}::uuid`;
    if (!valid[0]) throw new Error("Batch is outside your institution.");
  }
  await prisma.$transaction(async (tx) => {
    if (status) await tx.$executeRaw`UPDATE public.user_roles SET account_status=${status},authorization_version=authorization_version+1,updated_at=now() WHERE user_id=${userId}::uuid AND institution_id=${institutionId}::uuid`;
    await tx.$executeRaw`
      INSERT INTO public.user_academic_memberships(user_id,institution_id,department_id,batch_id,membership_type,active)
      VALUES(${userId}::uuid,${institutionId}::uuid,${departmentId || null}::uuid,${batchId || null}::uuid,${target[0].role},true)
      ON CONFLICT(user_id,institution_id,membership_type) DO UPDATE SET department_id=excluded.department_id,batch_id=excluded.batch_id,active=true,updated_at=now()
    `;
  });
  revalidatePath("/admin/people");
}

export async function assignInstitutionCourse(formData: FormData) {
  const { session, institutionId } = await requireCollegeAdmin();
  const course = clean(formData.get("course"));
  const studentId = clean(formData.get("studentId"));
  const batchId = clean(formData.get("batchId"));
  const startsAt = clean(formData.get("startsAt"));
  const dueAt = clean(formData.get("dueAt"));
  const grant = await prisma.$queryRaw<Array<{ course: string }>>`
    SELECT course FROM public.institution_course_access WHERE institution_id=${institutionId}::uuid AND course=${course} AND active
  `;
  if (!grant[0]) throw new Error("This course is not granted to your institution.");
  const students = await prisma.$queryRaw<Array<{ user_id: string }>>`
    SELECT DISTINCT role.user_id FROM public.user_roles role
    LEFT JOIN public.user_academic_memberships membership ON membership.user_id=role.user_id AND membership.active
    WHERE role.institution_id=${institutionId}::uuid AND role.role='STUDENT' AND role.account_status='active'
      AND ((${studentId}<>'' AND role.user_id=${studentId || null}::uuid) OR (${batchId}<>'' AND membership.batch_id=${batchId || null}::uuid))
  `;
  if (!students.length) throw new Error("No eligible students were found.");
  await prisma.$transaction(students.map((student) => prisma.$executeRaw`
    INSERT INTO public.student_course_assignments(student_id,institution_id,course,assigned_by,batch_id,starts_at,due_at,active)
    VALUES(${student.user_id}::uuid,${institutionId}::uuid,${course},${session.user.id}::uuid,${batchId || null}::uuid,
      ${startsAt || null}::timestamptz,${dueAt || null}::timestamptz,true)
    ON CONFLICT(student_id,course) DO UPDATE SET active=true,revoked_at=null,starts_at=excluded.starts_at,due_at=excluded.due_at,assigned_by=excluded.assigned_by
  `));
  revalidatePath("/admin/courses");
}

export async function revokeInstitutionCourse(formData: FormData) {
  const { institutionId } = await requireCollegeAdmin();
  const id = clean(formData.get("id"));
  const changed = await prisma.$executeRaw`UPDATE public.student_course_assignments SET active=false,revoked_at=now() WHERE id=${id}::uuid AND institution_id=${institutionId}::uuid`;
  if (!changed) throw new Error("Assignment not found in your institution.");
  revalidatePath("/admin/courses");
}

export async function bulkUpdateStudents(formData: FormData) {
  const { session,institutionId }=await requireCollegeAdmin();
  const userIds=formData.getAll("userId").map(String),operation=clean(formData.get("operation"));
  const value=clean(formData.get("value"));
  if(!userIds.length)throw new Error("Select at least one Student.");
  const scoped=await prisma.$queryRaw<Array<{user_id:string}>>`SELECT user_id FROM public.user_roles WHERE user_id=ANY(${userIds}::uuid[]) AND institution_id=${institutionId}::uuid AND role='STUDENT'`;
  if(scoped.length!==new Set(userIds).size)throw new Error("One or more Students are outside your institution.");
  if(["suspend","reactivate"].includes(operation)){
    const status=operation==="suspend"?"suspended":"active";
    await prisma.$executeRaw`UPDATE public.user_roles SET account_status=${status},authorization_version=authorization_version+1,updated_at=now() WHERE user_id=ANY(${userIds}::uuid[]) AND institution_id=${institutionId}::uuid`;
  }else if(["department","batch"].includes(operation)){
    if(!value)throw new Error("A target is required.");
    const table=operation==="department"?"departments":"academic_batches";
    const valid=await prisma.$queryRawUnsafe<Array<{id:string}>>(`SELECT id FROM public.${table} WHERE id=$1::uuid AND institution_id=$2::uuid`,value,institutionId);
    if(!valid[0])throw new Error("Target is outside your institution.");
    if(operation==="department")await prisma.$executeRaw`UPDATE public.user_academic_memberships SET department_id=${value}::uuid,updated_at=now() WHERE user_id=ANY(${userIds}::uuid[]) AND institution_id=${institutionId}::uuid AND membership_type='STUDENT'`;
    else await prisma.$executeRaw`UPDATE public.user_academic_memberships SET batch_id=${value}::uuid,updated_at=now() WHERE user_id=ANY(${userIds}::uuid[]) AND institution_id=${institutionId}::uuid AND membership_type='STUDENT'`;
  }else if(operation==="course"){
    const grant=await prisma.$queryRaw<Array<{course:string}>>`SELECT course FROM public.institution_course_access WHERE institution_id=${institutionId}::uuid AND course=${value} AND active`;
    if(!grant[0])throw new Error("Course is not granted to your institution.");
    for(const userId of userIds)await prisma.$executeRaw`INSERT INTO public.student_course_assignments(student_id,institution_id,course,assigned_by,active) VALUES(${userId}::uuid,${institutionId}::uuid,${value},${session.user.id}::uuid,true) ON CONFLICT(student_id,course) DO UPDATE SET active=true,revoked_at=null,assigned_by=excluded.assigned_by`;
  }else throw new Error("Invalid bulk operation.");
  await prisma.$executeRaw`INSERT INTO public.audit_logs(actor_id,institution_id,action,target_type,target_id,new_values) VALUES(${session.user.id}::uuid,${institutionId}::uuid,'students.bulk_updated','student',${userIds.join(",")},${JSON.stringify({operation,value,count:userIds.length})}::jsonb)`;
  revalidatePath("/admin/students");
}
