"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") throw new Error("Unauthorized");
}

export async function createInstitution(formData: FormData) {
  await requireSuperAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (name.length < 2 || !slug) throw new Error("A valid institution name and slug are required.");
  await prisma.$executeRaw`
    INSERT INTO public.institutions (name, slug)
    VALUES (${name}, ${slug})
    ON CONFLICT (slug) DO UPDATE SET name = excluded.name, active = true, updated_at = now()
  `;
  revalidatePath("/super-admin/institutions");
}

export async function updateUserAccess(formData: FormData) {
  await requireSuperAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  const institutionId = String(formData.get("institutionId") ?? "");
  if (!["STUDENT", "FACULTY", "COLLEGE_ADMIN", "SUPER_ADMIN"].includes(role)) throw new Error("Invalid role.");
  await prisma.$executeRaw`
    UPDATE public.user_roles
    SET role = ${role}::public.app_role,
        institution_id = ${institutionId || null}::uuid,
        updated_at = now()
    WHERE user_id = ${userId}::uuid
  `;
  revalidatePath("/super-admin/users");
}
