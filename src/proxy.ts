export { auth as proxy } from "@/auth";

export const config = {
  matcher: ["/change-password", "/diagnostic/:path*", "/dashboard/:path*", "/profile/:path*", "/continue-learning/:path*", "/student/:path*", "/assessment/:path*", "/profiling/:path*", "/learning-style/:path*", "/billing/:path*", "/checkout/:path*", "/payment-success/:path*", "/admin", "/admin/:path*", "/super-admin/:path*", "/superadmin/:path*"],
};
