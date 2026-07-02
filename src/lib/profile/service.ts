import { prisma } from "@/lib/prisma";
import { profileCompletion } from "./completion";
import type { ProfileInput } from "./validation";

const include = {
  education: true, skills: true, programmingLanguages: true,
  achievements: true, certificates: true, projects: true,
} as const;

export async function getProfile(userId: string) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId }, include });
  return { profile, completion: profileCompletion(profile) };
}

const toDate = (value: string | null) => value ? new Date(`${value}T00:00:00.000Z`) : null;

export async function saveProfile(userId: string, input: ProfileInput) {
  const { education, skills, programmingLanguages, achievements, certificates, projects, dateOfBirth, ...scalar } = input;
  return prisma.$transaction(async (tx) => {
    const profile = await tx.studentProfile.upsert({
      where: { userId },
      create: { userId, ...scalar, dateOfBirth: toDate(dateOfBirth) },
      update: { ...scalar, dateOfBirth: toDate(dateOfBirth) },
    });
    await Promise.all([
      tx.education.deleteMany({ where: { profileId: profile.id } }),
      tx.skill.deleteMany({ where: { profileId: profile.id } }),
      tx.programmingLanguage.deleteMany({ where: { profileId: profile.id } }),
      tx.achievement.deleteMany({ where: { profileId: profile.id } }),
      tx.certificate.deleteMany({ where: { profileId: profile.id } }),
      tx.project.deleteMany({ where: { profileId: profile.id } }),
    ]);
    await Promise.all([
      education.length && tx.education.createMany({ data: education.map((item) => ({ ...item, profileId: profile.id })) }),
      skills.length && tx.skill.createMany({ data: skills.map((item) => ({ ...item, profileId: profile.id })) }),
      programmingLanguages.length && tx.programmingLanguage.createMany({ data: programmingLanguages.map((item) => ({ ...item, profileId: profile.id })) }),
      achievements.length && tx.achievement.createMany({ data: achievements.map((item) => ({ ...item, profileId: profile.id, achievedAt: toDate(item.achievedAt) })) }),
      certificates.length && tx.certificate.createMany({ data: certificates.map((item) => ({ ...item, profileId: profile.id, issuedAt: toDate(item.issuedAt) })) }),
      projects.length && tx.project.createMany({ data: projects.map((item) => ({ ...item, profileId: profile.id, startedAt: toDate(item.startedAt), completedAt: toDate(item.completedAt) })) }),
    ]);
    await tx.auditLog.create({ data: { userId, action: "PROFILE_UPDATED" } });
    return tx.studentProfile.findUniqueOrThrow({ where: { userId }, include });
  });
}
