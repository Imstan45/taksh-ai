import { NextResponse } from "next/server";
import { parseJson, authError } from "@/lib/auth/api";
import { emailSchema } from "@/lib/auth/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = await parseJson(request, emailSchema);
  if (!parsed.data) return parsed.error;
  try {
    await createSupabaseServerClient().auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password`,
    });
    return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
  } catch (error) { return authError(error); }
}
