import { juniorsExamConfigs, type JuniorsExamCode } from "@/lib/juniors-exam-config";

export type MockCandidate = { id: string; subject: string; question_type: "mcq" | "numerical" };

function shuffled<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function buildMockQuestionSet(exam: JuniorsExamCode, candidates: MockCandidate[]) {
  const config = juniorsExamConfigs[exam];
  const selected: MockCandidate[] = [];
  const shortages: string[] = [];

  for (const section of config.sections) {
    for (const questionType of ["mcq", "numerical"] as const) {
      const required = section[questionType];
      if (!required) continue;
      const available = shuffled(candidates.filter((question) => question.subject === section.subject && question.question_type === questionType));
      if (available.length < required) shortages.push(`${section.label} ${questionType.toUpperCase()}: ${available.length}/${required}`);
      selected.push(...available.slice(0, required));
    }
  }

  return { questions: shortages.length ? [] : selected, shortages };
}
