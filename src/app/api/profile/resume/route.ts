import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadResume, deleteResume } from "@/lib/storage/resume";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await enforceRateLimit("resume-upload", session.user.id, 5, 60 * 60_000);
    const current = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } });
    const file = (await request.formData()).get("resume");
    if (!(file instanceof File)) return NextResponse.json({ error: "A PDF resume is required" }, { status: 400 });
    const uploaded = await uploadResume(session.user.id, file);
    await prisma.studentProfile.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, resumeUrl: uploaded.url, resumeKey: uploaded.key, resumeName: uploaded.name },
      update: { resumeUrl: uploaded.url, resumeKey: uploaded.key, resumeName: uploaded.name },
    });
    await deleteResume(current?.resumeKey ?? null);
    return NextResponse.json(uploaded);
  } catch (error) {
    console.error("Resume upload failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to upload resume" }, { status: 400 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } });
  await deleteResume(profile?.resumeKey ?? null);
  await prisma.studentProfile.updateMany({ where: { userId: session.user.id }, data: { resumeUrl: null, resumeKey: null, resumeName: null } });
  return new NextResponse(null, { status: 204 });
}
