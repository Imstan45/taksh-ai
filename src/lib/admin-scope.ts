import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireScopedRole(allowed: Array<"COLLEGE_ADMIN" | "FACULTY">) {
  const session = await auth();
  if (!session?.user || !allowed.includes(session.user.role as "COLLEGE_ADMIN" | "FACULTY") || session.user.accountStatus !== "active") {
    throw new Error("Unauthorized");
  }
  const rows = await prisma.$queryRaw<Array<{ institution_id: string }>>`
    SELECT institution_id FROM public.user_roles
    WHERE user_id = ${session.user.id}::uuid AND account_status = 'active'
  `;
  if (!rows[0]?.institution_id) throw new Error("No active institution membership.");
  return { session, institutionId: rows[0].institution_id };
}

export const requireCollegeAdmin = () => requireScopedRole(["COLLEGE_ADMIN"]);
export const requireFaculty = () => requireScopedRole(["FACULTY"]);
