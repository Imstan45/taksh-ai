import { auth } from "@/auth";
import { passwordSchema, firstValidationError } from "@/lib/auth/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.mustChangePassword) return Response.json({ error: "Password setup is not required for this account." }, { status: 403 });
  const body = await request.json().catch(() => null) as { password?: unknown } | null;
  const parsed = passwordSchema.safeParse(body?.password);
  if (!parsed.success) return Response.json({ error: firstValidationError(parsed.error) }, { status: 422 });
  if (parsed.data === "welcome2026") return Response.json({ error: "Choose a password different from the temporary password." }, { status: 422 });
  const supabase = createSupabaseAdminClient();
  const { data, error: loadError } = await supabase.auth.admin.getUserById(session.user.id);
  if (loadError || !data.user) return Response.json({ error: loadError?.message ?? "Account not found." }, { status: 404 });
  const { error } = await supabase.auth.admin.updateUserById(session.user.id, {
    password: parsed.data,
    user_metadata: { ...data.user.user_metadata, must_change_password: false, password_initialized_at: new Date().toISOString() },
  });
  if (error) return Response.json({ error: error.message }, { status: 502 });
  return Response.json({ changed: true });
}
