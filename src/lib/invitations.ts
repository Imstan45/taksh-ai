import { z } from "zod";
import type { UserRole } from "@/types/roles";

export const inviteRoleSchema = z.enum(["STUDENT", "FACULTY", "COLLEGE_ADMIN"]);
export type InviteRole = z.infer<typeof inviteRoleSchema>;

export const invitationInputSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: inviteRoleSchema,
  institutionId: z.string().uuid(),
});

export function invitationDestination(role: UserRole) {
  return role === "STUDENT" ? "/login" : role === "SUPER_ADMIN" ? "/super-admin/login" : "/admin/login";
}

export function invitationIsAcceptable(status: string, expiresAt: Date, now = new Date()) {
  return status === "pending" && expiresAt.getTime() > now.getTime();
}
