export { auth as proxy } from "@/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/assessment/:path*", "/admin/:path*", "/super-admin/:path*"],
};
