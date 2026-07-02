import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadResume, deleteResume } from "@/lib/storage/resume";

type StoredResume = { id: string; profile_json: { resumeKey?: string; [key: string]: unknown } | null };

async function currentProfile(userId: string) {
  const rows = await prisma.$queryRaw<StoredResume[]>`
    SELECT id, profile_json FROM public.student_profiles
    WHERE student_id = ${userId}::uuid
    ORDER BY created_at DESC NULLS LAST LIMIT 1
  `;
  return rows[0];
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const file = (await request.formData()).get("resume");
    if (!(file instanceof File)) return NextResponse.json({ error: "A PDF resume is required" }, { status: 400 });
    const current = await currentProfile(session.user.id);
    const uploaded = await uploadResume(session.user.id, file);
    const json = { ...(current?.profile_json ?? {}), resumeUrl: uploaded.url, resumeKey: uploaded.key, resumeName: uploaded.name };
    if (current) {
      await prisma.$executeRaw`UPDATE public.student_profiles SET profile_json = ${JSON.stringify(json)}::jsonb WHERE id = ${current.id}::uuid`;
    } else {
      await prisma.$executeRaw`
        INSERT INTO public.student_profiles (id, student_id, profile_json)
        VALUES (gen_random_uuid(), ${session.user.id}::uuid, ${JSON.stringify(json)}::jsonb)
      `;
    }
    await deleteResume(current?.profile_json?.resumeKey ?? null);
    return NextResponse.json(uploaded);
  } catch (error) {
    console.error("Resume upload failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to upload resume" }, { status: 400 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const current = await currentProfile(session.user.id);
  await deleteResume(current?.profile_json?.resumeKey ?? null);
  if (current) {
    const json = { ...(current.profile_json ?? {}), resumeUrl: null, resumeKey: null, resumeName: null };
    await prisma.$executeRaw`UPDATE public.student_profiles SET profile_json = ${JSON.stringify(json)}::jsonb WHERE id = ${current.id}::uuid`;
  }
  return new NextResponse(null, { status: 204 });
}
