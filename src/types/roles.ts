export type UserRole = "STUDENT" | "FACULTY" | "COLLEGE_ADMIN" | "SUPER_ADMIN";

export function roleHome(role: UserRole) {
  if (role === "SUPER_ADMIN") return "/super-admin";
  if (role === "FACULTY") return "/admin/faculty";
  if (role === "COLLEGE_ADMIN") return "/admin";
  return "/dashboard";
}

export function roleCanAccessPath(role: UserRole, path: string) {
  if (path.startsWith("/super-admin") || path.startsWith("/superadmin")) return role === "SUPER_ADMIN";
  if (path.startsWith("/admin")) return role === "COLLEGE_ADMIN" || role === "FACULTY";
  return role === "STUDENT";
}
