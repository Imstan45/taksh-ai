import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Password recovery is handled securely by Supabase Auth." },
    { status: 410 },
  );
}
