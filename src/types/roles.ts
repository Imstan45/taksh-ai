export type UserRole = "STUDENT" | "FACULTY" | "COLLEGE_ADMIN" | "SUPER_ADMIN";

export function roleHome(role: UserRole) {
  if (role === "SUPER_ADMIN") return "/super-admin";
  if (role === "COLLEGE_ADMIN" || role === "FACULTY") return "/admin";
  return "/dashboard";
}
