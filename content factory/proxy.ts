import { NextResponse, type NextRequest } from "next/server";
import { FACTORY_SESSION_COOKIE, verifyFactoryToken } from "./src/lib/factory-auth";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(FACTORY_SESSION_COOKIE)?.value;
  if (token && await verifyFactoryToken(token)) return NextResponse.next();
  return NextResponse.json({ error: "Super Admin authentication is required." }, { status: 401 });
}

export const config = {
  matcher: ["/", "/api/:path*"],
};
