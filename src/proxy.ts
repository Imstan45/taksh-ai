import { auth } from "@/auth";

export const proxy = auth((request) => {
  const code = request.nextUrl.pathname === "/" ? request.nextUrl.searchParams.get("ref")?.trim() : undefined;
  if (code && /^[a-z0-9-]{6,20}$/i.test(code)) return Response.redirect(new URL(`/r/${code}`, request.nextUrl));
});

export const config = {
  matcher: ["/", "/sales/:path*", "/sales-rep/:path*", "/change-password", "/diagnostic/:path*", "/dashboard/:path*", "/profile/:path*", "/continue-learning/:path*", "/student/:path*", "/assessment/:path*", "/profiling/:path*", "/learning-style/:path*", "/billing/:path*", "/checkout/:path*", "/payment-success/:path*", "/admin", "/admin/:path*", "/super-admin/:path*", "/superadmin/:path*"],
};
