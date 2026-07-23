import { PROFILING_QUESTIONS, type ProfilingCategory } from "./static-questions";

export type ProfilingAnswer = {
  questionId: string;
  selectedOption: number | null;
  timeTakenSeconds: number;
};

export type CategoryScore = {
  category: ProfilingCategory;
  attempted: number;
  correct: number;
  accuracy: number;
  score: number;
  level: "beginner" | "developing" | "placement_ready";
};

export function scoreAnswer(isCorrect: boolean, seconds: number) {
  if (!isCorrect) return 0;
  if (seconds < 5) return 0.35; // likely fluke / too fast
  if (seconds <= 45) return 1;
  if (seconds <= 90) return 0.85;
  if (seconds <= 180) return 0.65;
  return 0.4; // correct but too slow
}

function levelFromScore(score: number) {
  if (score >= 75) return "placement_ready" as const;
  if (score >= 45) return "developing" as const;
  return "beginner" as const;
}

export function evaluateProfiling(answers: ProfilingAnswer[]) {
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer]));

  const detailedAnswers = PROFILING_QUESTIONS.map((question) => {
    const answer = answerMap.get(question.id);
    const selectedOption = answer?.selectedOption ?? null;
    const timeTakenSeconds = Math.max(0, Math.round(answer?.timeTakenSeconds ?? 0));
    const isCorrect = selectedOption === question.correctOption;
    const points = scoreAnswer(isCorrect, timeTakenSeconds);

    return {
      questionId: question.id,
      category: question.category,
      topic: question.topic,
      selectedOption,
      correctOption: question.correctOption,
      isCorrect,
      timeTakenSeconds,
      points,
    };
  });

  const categories = Array.from(new Set(PROFILING_QUESTIONS.map((q) => q.category)));
  const categoryScores: CategoryScore[] = categories.map((category) => {
    const rows = detailedAnswers.filter((answer) => answer.category === category);
    const attempted = rows.filter((answer) => answer.selectedOption !== null).length;
    const correct = rows.filter((answer) => answer.isCorrect).length;
    const totalPoints = rows.reduce((sum, answer) => sum + answer.points, 0);
    const score = Math.round((totalPoints / rows.length) * 100);
    const accuracy = Math.round((correct / rows.length) * 100);

    return { category, attempted, correct, accuracy, score, level: levelFromScore(score) };
  });

  const totalScore = Math.round(categoryScores.reduce((sum, item) => sum + item.score, 0) / categoryScores.length);
  const totalCorrect = detailedAnswers.filter((answer) => answer.isCorrect).length;
  const avgTime = Math.round(detailedAnswers.reduce((sum, answer) => sum + answer.timeTakenSeconds, 0) / detailedAnswers.length);

  const weakAreas = categoryScores.filter((item) => item.score < 45).map((item) => item.category);
  const strongAreas = categoryScores.filter((item) => item.score >= 75).map((item) => item.category);

  return {
    totalQuestions: PROFILING_QUESTIONS.length,
    attempted: detailedAnswers.filter((answer) => answer.selectedOption !== null).length,
    correct: totalCorrect,
    accuracy: Math.round((totalCorrect / PROFILING_QUESTIONS.length) * 100),
    avgTimeSeconds: avgTime,
    readinessScore: totalScore,
    level: levelFromScore(totalScore),
    categoryScores,
    weakAreas,
    strongAreas,
    detailedAnswers,
    completedAt: new Date().toISOString(),
  };
}
