import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseJson, authError } from "@/lib/auth/api";
import { profileSchema } from "@/lib/profile/validation";
import { getProfile, saveProfile } from "@/lib/profile/service";
import { profileCompletion } from "@/lib/profile/completion";
import { prisma } from "@/lib/prisma";

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
    const completion=profileCompletion(profile),complete=completion>=80;
    await prisma.$executeRaw`insert into public.candidate_readiness(user_id,profile_complete,employer_eligible) values(${session.user.id}::uuid,${complete},false) on conflict(user_id) do update set profile_complete=${complete},employer_eligible=(${complete} and candidate_readiness.employer_sharing_consent and candidate_readiness.readiness_status in('PLACEMENT_READY','VERIFIED_PLACEMENT_READY')),employer_eligible_at=case when ${complete} and candidate_readiness.employer_sharing_consent and candidate_readiness.readiness_status in('PLACEMENT_READY','VERIFIED_PLACEMENT_READY') then now() else null end,updated_at=now()`;
    return NextResponse.json({ profile, completion });
  } catch (error) { return authError(error); }
}
