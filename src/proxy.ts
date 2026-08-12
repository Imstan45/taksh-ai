export { auth as proxy } from "@/auth";

export const config = {
  matcher: ["/change-password", "/dashboard/:path*", "/profile/:path*", "/continue-learning/:path*", "/student/:path*", "/assessment/:path*", "/profiling/:path*", "/learning-style/:path*", "/admin", "/admin/:path*", "/super-admin/:path*", "/superadmin/:path*"],
};
