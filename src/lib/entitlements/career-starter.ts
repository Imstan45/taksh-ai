import { prisma } from "@/lib/prisma";
import { hasFeatureAccess } from "@/lib/commerce/access";

export const CAREER_STARTER_PLAN_CODE = "career_starter";
export const CAREER_STARTER_COURSES = ["Python Fundamentals", "Prompt Engineering Fundamentals", "UI/UX Fundamentals", "ServiceNow ITSM, Development & GenAI Career Program", "Logical Reasoning", "English Proficiency"] as const;

// Compatibility name retained for existing callers while access comes from products.
export async function hasCareerStarterAccess(userId: string) {
  return hasFeatureAccess(userId, "readiness_retests");
}

export async function setCareerStarterTestAccess(userId: string, enabled: boolean, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const products = await tx.$queryRaw<Array<{ id: string }>>`select id from public.products where code='complete-placement-bundle' limit 1`;
    const product = products[0];
    if (!product) throw new Error("Complete Placement Bundle is not configured.");
    if (enabled) {
      await tx.$executeRaw`insert into public.entitlements(user_id,product_id,starts_at,expires_at,status,grant_source,granted_by)
        values(${userId}::uuid,${product.id}::uuid,now(),null,'active','admin_test',${adminId}::uuid)
        on conflict(user_id,product_id) where status='active' and product_id is not null
        do update set expires_at=null,grant_source='admin_test',granted_by=excluded.granted_by,updated_at=now()`;
    } else {
      await tx.$executeRaw`update public.entitlements set status='revoked',updated_at=now()
        where user_id=${userId}::uuid and product_id=${product.id}::uuid and status='active' and grant_source='admin_test'`;
    }
  });
}
