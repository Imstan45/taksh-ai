import { createFactorySessionToken, FACTORY_SESSION_COOKIE, verifyFactoryToken } from "../../../src/lib/factory-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const session = await verifyFactoryToken(token);
  if (!session) return Response.json({ error: "Invalid or expired Content Factory access." }, { status: 403 });
  const sessionToken = await createFactorySessionToken({
    ...session,
    exp: Math.floor(Date.now() / 1000) + 3600,
    nonce: crypto.randomUUID(),
  });
  const response = Response.redirect(new URL("/", request.url));
  response.headers.append(
    "Set-Cookie",
    `${FACTORY_SESSION_COOKIE}=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`,
  );
  return response;
}
