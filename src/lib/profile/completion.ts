type CompletionProfile = {
  phone?: string | null; location?: string | null; bio?: string | null;
  careerGoal?: string | null; resumeUrl?: string | null;
  education?: unknown[]; skills?: unknown[]; programmingLanguages?: unknown[];
  achievements?: unknown[]; certificates?: unknown[]; projects?: unknown[];
  targetRoles?: string[];
};

export function profileCompletion(profile: CompletionProfile | null) {
  if (!profile) return 0;
  const checks = [
    profile.phone, profile.location, profile.bio, profile.careerGoal, profile.resumeUrl,
    profile.education?.length, profile.skills?.length, profile.programmingLanguages?.length,
    profile.projects?.length, profile.targetRoles?.length,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
