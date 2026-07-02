import { prisma } from "@/lib/prisma";
import { profileCompletion } from "./completion";
import type { ProfileInput } from "./validation";

type JsonProfile = ProfileInput & {
  resumeUrl?: string | null;
  resumeKey?: string | null;
  resumeName?: string | null;
};

type ExistingRow = {
  phone: string | null;
  career_goal: string | null;
  profile_json: JsonProfile | null;
};

export async function getProfile(userId: string) {
  const rows = await prisma.$queryRaw<ExistingRow[]>`
    SELECT s.phone, sp.career_goal, sp.profile_json
    FROM public.students s
    LEFT JOIN LATERAL (
      SELECT career_goal, profile_json
      FROM public.student_profiles
      WHERE student_id = s.id
      ORDER BY created_at DESC NULLS LAST
      LIMIT 1
    ) sp ON true
    WHERE s.id = ${userId}::uuid
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return { profile: null, completion: 0 };
  const profile = {
    ...(row.profile_json ?? {}),
    phone: row.phone ?? row.profile_json?.phone ?? null,
    careerGoal: row.career_goal ?? row.profile_json?.careerGoal ?? null,
  };
  return { profile, completion: profileCompletion(profile) };
}

export async function saveProfile(userId: string, input: ProfileInput) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE public.students
      SET phone = ${input.phone}, updated_at = now()
      WHERE id = ${userId}::uuid
    `;
    const existing = await tx.$queryRaw<{ id: string; profile_json: JsonProfile | null }[]>`
      SELECT id, profile_json
      FROM public.student_profiles
      WHERE student_id = ${userId}::uuid
      ORDER BY created_at DESC NULLS LAST
      LIMIT 1
    `;
    const stored: JsonProfile = {
      ...input,
      resumeUrl: existing[0]?.profile_json?.resumeUrl ?? null,
      resumeKey: existing[0]?.profile_json?.resumeKey ?? null,
      resumeName: existing[0]?.profile_json?.resumeName ?? null,
    };
    if (existing[0]) {
      await tx.$executeRaw`
        UPDATE public.student_profiles
        SET career_goal = ${input.careerGoal}, profile_json = ${JSON.stringify(stored)}::jsonb
        WHERE id = ${existing[0].id}::uuid
      `;
    } else {
      await tx.$executeRaw`
        INSERT INTO public.student_profiles (id, student_id, career_goal, profile_json)
        VALUES (gen_random_uuid(), ${userId}::uuid, ${input.careerGoal}, ${JSON.stringify(stored)}::jsonb)
      `;
    }
    return stored;
  });
}
