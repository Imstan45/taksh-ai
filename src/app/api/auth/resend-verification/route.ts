import { NextResponse } from "next/server";
import { parseJson, authError } from "@/lib/auth/api";
import { emailSchema } from "@/lib/auth/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = await parseJson(request, emailSchema);
  if (!parsed.data) return parsed.error;
  try {
    await createSupabaseServerClient().auth.resend({
      type: "signup",
      email: parsed.data.email,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login?verified=true` },
    });
    return NextResponse.json({ message: "If an unverified account exists, a new link has been sent." });
  } catch (error) { return authError(error); }
}
