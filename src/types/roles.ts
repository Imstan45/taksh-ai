export type UserRole = "STUDENT" | "SALES_REP" | "SALES_MANAGER" | "FACULTY" | "COLLEGE_ADMIN" | "SUPER_ADMIN";

export function roleHome(role: UserRole) {
  if (role === "SUPER_ADMIN") return "/super-admin";
  if (role === "SALES_MANAGER") return "/sales-manager";
  if (role === "FACULTY") return "/admin/faculty";
  if (role === "COLLEGE_ADMIN") return "/admin";
  if (role === "SALES_REP") return "/sales/dashboard";
  return "/dashboard";
}

export function roleCanAccessPath(role: UserRole, path: string) {
  if (path.startsWith("/super-admin") || path.startsWith("/superadmin")) return role === "SUPER_ADMIN";
  if (path === "/sales-manager" || path.startsWith("/sales-manager/")) return role === "SALES_MANAGER";
  if (path.startsWith("/admin")) return role === "COLLEGE_ADMIN" || role === "FACULTY";
  if (path.startsWith("/sales")) return role === "SALES_REP";
  return role === "STUDENT";
}
