import "next-auth";
import "next-auth/jwt";
import type { UserRole } from "@/types/roles";

declare module "next-auth" {
  interface User { role: UserRole; rememberMe?: boolean }
  interface Session { user: { id: string; role: UserRole; name?: string | null; email?: string | null; image?: string | null } }
}
declare module "next-auth/jwt" {
  interface JWT { id?: string; role?: UserRole; rememberMe?: boolean }
}
