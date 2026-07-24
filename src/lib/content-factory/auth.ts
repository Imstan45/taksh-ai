import { auth } from "@/auth";

export async function requireFactorySession(_request?: Request) {
  void _request;
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN" || session.user.accountStatus !== "active") {
    return null;
  }
  return { sub: session.user.id, email: session.user.email ?? "" };
}
