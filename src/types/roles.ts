export type UserRole = "STUDENT" | "SALES_REP" | "SALES_MANAGER" | "FACULTY" | "COLLEGE_ADMIN" | "SUPER_ADMIN";

export function isSalesManagerPath(path: string) {
  return ["/super-admin/sales-reps", "/super-admin/payments"].some((base) => path === base || path.startsWith(`${base}/`));
}

export function roleHome(role: UserRole) {
  if (role === "SUPER_ADMIN") return "/super-admin";
  if (role === "SALES_MANAGER") return "/super-admin/sales-reps";
  if (role === "FACULTY") return "/admin/faculty";
  if (role === "COLLEGE_ADMIN") return "/admin";
  if (role === "SALES_REP") return "/sales/dashboard";
  return "/dashboard";
}

export function roleCanAccessPath(role: UserRole, path: string) {
  if (role === "SALES_MANAGER") return isSalesManagerPath(path);
  if (path.startsWith("/super-admin") || path.startsWith("/superadmin")) return role === "SUPER_ADMIN";
  if (path.startsWith("/admin")) return role === "COLLEGE_ADMIN" || role === "FACULTY";
  if (path.startsWith("/sales")) return role === "SALES_REP";
  return role === "STUDENT";
}
