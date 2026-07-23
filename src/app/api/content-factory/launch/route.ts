import { auth } from "@/auth";
import { mainEnvironment } from "@/lib/env";
import { createContentFactoryToken } from "@/lib/content-factory-token";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN" || session.user.accountStatus !== "active") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const env = mainEnvironment();
  if (!env.NEXT_PUBLIC_CONTENT_FACTORY_URL) {
    return Response.json({ error: "Content Factory URL is not configured." }, { status: 503 });
  }
  const token = await createContentFactoryToken({
    sub: session.user.id,
    email: session.user.email ?? "",
    role: "SUPER_ADMIN",
  }, env.CONTENT_FACTORY_AUTH_SECRET);
  const destination = new URL("/auth/callback", env.NEXT_PUBLIC_CONTENT_FACTORY_URL);
  destination.searchParams.set("token", token);
  return Response.redirect(destination);
}
