import { juniorsSyllabus } from "@/lib/juniors-syllabus";

export type CoveredQuestion = { subject: string; chapter_slug: string; topic: string; subtopic: string | null; status: string };

const key = (subject: string, chapter: string, topic: string, subtopic: string) => [subject, chapter, topic, subtopic].join("::").toLowerCase();

export function auditQuestionCoverage(questions: CoveredQuestion[]) {
  const published = new Set(questions.filter((question) => question.status === "published" && question.subtopic).map((question) => key(question.subject, question.chapter_slug, question.topic, question.subtopic!)));
  const rows = juniorsSyllabus.flatMap((chapter) => chapter.topics.flatMap((topic) => topic.subtopics.map((subtopic) => ({
    subject: chapter.subject,
    chapter: chapter.chapter,
    topic: topic.title,
    subtopic,
    covered: published.has(key(chapter.subject, chapter.chapter, topic.title, subtopic)),
  }))));
  const bySubject = ["mathematics", "physics", "chemistry"].map((subject) => {
    const subjectRows = rows.filter((row) => row.subject === subject);
    return { subject, covered: subjectRows.filter((row) => row.covered).length, total: subjectRows.length };
  });
  return { covered: rows.filter((row) => row.covered).length, total: rows.length, missing: rows.filter((row) => !row.covered), bySubject };
}
