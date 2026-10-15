import type { JuniorsExamCode } from "@/lib/juniors-exam-config";

export type JuniorsScoreInput = {
  correct: number;
  incorrect: number;
  unanswered: number;
  exam: JuniorsExamCode | null;
  sessionType: "practice" | "mock";
};

export function calculateJuniorsScore(input: JuniorsScoreInput) {
  const isJeeMainMock = input.sessionType === "mock" && input.exam === "jee-main";
  const attempted = input.correct + input.incorrect;

  return {
    marks: isJeeMainMock ? input.correct * 4 - input.incorrect : input.correct,
    maximum: isJeeMainMock
      ? (input.correct + input.incorrect + input.unanswered) * 4
      : input.correct + input.incorrect + input.unanswered,
    attempted,
    accuracy: attempted ? Math.round((input.correct / attempted) * 100) : 0,
  };
}
