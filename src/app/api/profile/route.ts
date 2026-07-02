import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseJson, authError } from "@/lib/auth/api";
import { profileSchema } from "@/lib/profile/validation";
import { getProfile, saveProfile } from "@/lib/profile/service";
import { profileCompletion } from "@/lib/profile/completion";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await getProfile(session.user.id)); }
  catch (error) { return authError(error); }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = await parseJson(request, profileSchema);
  if (!parsed.data) return parsed.error;
  try {
    const profile = await saveProfile(session.user.id, parsed.data);
    return NextResponse.json({ profile, completion: profileCompletion(profile) });
  } catch (error) { return authError(error); }
}
