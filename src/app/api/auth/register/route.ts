import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJson, authError } from "@/lib/auth/api";
import { registerSchema } from "@/lib/auth/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = await parseJson(request, registerSchema);
  if (!parsed.data) return parsed.error;
  try {
    const { data, error } = await createSupabaseServerClient().auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.name, role: "STUDENT" },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login?verified=true`,
      },
    });
    if (error) {
      const status = error.status === 429 ? 429 : error.status === 422 ? 409 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    if (!data.user) throw new Error("Supabase did not return a user");
    await prisma.$executeRaw`
      INSERT INTO public.students (id, full_name, email)
      VALUES (${data.user.id}::uuid, ${parsed.data.name}, ${parsed.data.email})
      ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, updated_at = now()
    `;
    return NextResponse.json({ message: "Check your email to verify your account" }, { status: 201 });
  } catch (error) { return authError(error); }
}
