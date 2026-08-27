import { prisma } from "@/lib/prisma";

export type AccessSource = "payment"|"manual"|"promotional"|"institutional"|"legacy"|"admin_test"|"backfill";

export async function getAccessibleCourses(userId:string) {
  return prisma.$queryRaw<Array<{course:string;source:AccessSource}>>`
    with access as (
      select mapping.course,entitlement.grant_source source
      from public.entitlements entitlement
      join public.product_courses mapping on mapping.product_id=entitlement.product_id
      where entitlement.user_id=${userId}::uuid and entitlement.status='active'
        and entitlement.starts_at<=now() and (entitlement.expires_at is null or entitlement.expires_at>now())
      union
      select assignment.course,
        case when assignment.institution_id is not null then 'institutional' else 'legacy' end source
      from public.student_course_assignments assignment
      where assignment.student_id=${userId}::uuid and assignment.active and assignment.revoked_at is null
        and (assignment.starts_at is null or assignment.starts_at<=now())
        and (assignment.due_at is null or assignment.due_at>now())
    ) select distinct course,source from access order by course`;
}

export async function hasCourseAccess(userId:string,course:string) {
  const rows=await prisma.$queryRaw<Array<{allowed:boolean}>>`select exists(
    select 1 from public.entitlements entitlement join public.product_courses mapping on mapping.product_id=entitlement.product_id
    where entitlement.user_id=${userId}::uuid and mapping.course=${course} and entitlement.status='active'
      and entitlement.starts_at<=now() and (entitlement.expires_at is null or entitlement.expires_at>now())
    union all
    select 1 from public.student_course_assignments assignment where assignment.student_id=${userId}::uuid
      and assignment.course=${course} and assignment.active and assignment.revoked_at is null
      and (assignment.starts_at is null or assignment.starts_at<=now()) and (assignment.due_at is null or assignment.due_at>now())
  ) allowed`;
  return Boolean(rows[0]?.allowed);
}

export async function hasFeatureAccess(userId:string,featureCode:string) {
  const rows=await prisma.$queryRaw<Array<{allowed:boolean}>>`select exists(
    select 1 from public.entitlements entitlement join public.product_features feature on feature.product_id=entitlement.product_id
    where entitlement.user_id=${userId}::uuid and feature.feature_code=${featureCode} and entitlement.status='active'
      and entitlement.starts_at<=now() and (entitlement.expires_at is null or entitlement.expires_at>now())
  ) allowed`;
  return Boolean(rows[0]?.allowed);
}

export async function ownsProduct(userId:string,productId:string) {
  const rows=await prisma.$queryRaw<Array<{owned:boolean}>>`select exists(select 1 from public.entitlements
    where user_id=${userId}::uuid and product_id=${productId}::uuid and status='active'
      and starts_at<=now() and (expires_at is null or expires_at>now())) owned`;
  return Boolean(rows[0]?.owned);
}
