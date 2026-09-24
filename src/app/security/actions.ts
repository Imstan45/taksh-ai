"use server";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function signOutAllDevices() {
  const session = await auth();
  if (!session?.user || session.user.sessionInvalidated) throw new Error("Unauthorized");

  await prisma.$transaction(async (tx) => {
    const changed = await tx.$executeRaw`
      UPDATE public.user_roles
      SET authorization_version = authorization_version + 1, updated_at = now()
      WHERE user_id = ${session.user.id}::uuid
    `;
    if (!changed) throw new Error("Account not found.");

    await tx.$executeRaw`
      INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, new_values)
      VALUES (${session.user.id}::uuid, 'security.sessions_revoked', 'user', ${session.user.id},
        ${JSON.stringify({ scope: "all_devices" })}::jsonb)
    `;
  });

  await signOut({ redirectTo: "/login?signedOutAllDevices=1" });
}
