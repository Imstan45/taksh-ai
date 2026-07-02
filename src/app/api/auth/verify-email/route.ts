import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Email verification is handled by Supabase Auth. Open the link in your email." },
    { status: 410 },
  );
}
