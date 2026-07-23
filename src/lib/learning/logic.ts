export const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export type ProgressStatus = "not_started" | "in_progress" | "completed" | null;

export function applySequentialLocks<T extends { progress_status: ProgressStatus }>(
  rows: T[],
): Array<T & { locked: boolean }> {
  let canOpenNext = true;
  return rows.map((row) => {
    const completed = row.progress_status === "completed";
    const locked = !completed && !canOpenNext;
    if (!completed && canOpenNext) canOpenNext = false;
    return { ...row, locked };
  });
}

export function selectLatestPublishedCandidate<T extends {
  status: string;
  content_version: number;
  published_at: string | Date | null;
}>(rows: T[]): T | null {
  return rows
    .filter((row) => row.status === "published")
    .sort((a, b) => {
      const versionDifference = b.content_version - a.content_version;
      if (versionDifference) return versionDifference;
      return new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime();
    })[0] ?? null;
}

export function ownsStudentRecord(actorStudentId: string, recordStudentId: string) {
  return actorStudentId === recordStudentId;
}
