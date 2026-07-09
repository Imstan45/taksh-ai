export type LearningStyle = "story" | "humor" | "visual" | "traditional";

export type LearningStyleQuestion = {
  id: string;
  style: LearningStyle;
  title: string;
  prompt: string;
  options: string[];
  correctOption: number;
};

export const learningStyleLabels: Record<LearningStyle, string> = {
  story: "Story-based learning",
  humor: "Humor-based learning",
  visual: "Visual learning",
  traditional: "Traditional learning",
};

export const LEARNING_STYLE_QUESTIONS: LearningStyleQuestion[] = [
  {
    id: "story-ratio",
    style: "story",
    title: "Story style",
    prompt:
      "A shopkeeper says, \"For every 3 notebooks I sell, I sell 2 pens.\" By evening, he sold 45 notebooks. How many pens did he sell?",
    options: ["24", "27", "30", "36"],
    correctOption: 2,
  },
  {
    id: "humor-average",
    style: "humor",
    title: "Humor style",
    prompt:
      "Three friends scored 60, 70 and 80. The fourth friend walks in dramatically and makes the average 75. What did the fourth friend score?",
    options: ["75", "80", "85", "90"],
    correctOption: 3,
  },
  {
    id: "visual-percentage",
    style: "visual",
    title: "Visual style",
    prompt:
      "Imagine a bar split into 100 equal blocks. First 25 blocks are filled, then 35 more blocks are filled. What percentage of the bar is filled?",
    options: ["50%", "55%", "60%", "65%"],
    correctOption: 2,
  },
  {
    id: "traditional-speed",
    style: "traditional",
    title: "Traditional style",
    prompt:
      "A train covers 120 km in 2 hours. What is its average speed?",
    options: ["40 km/h", "50 km/h", "60 km/h", "70 km/h"],
    correctOption: 2,
  },
];

export function scoreLearningStyle(
  answers: Array<{ questionId: string; selectedOption: number | null; timeTakenSeconds: number }>
) {
  const scores = LEARNING_STYLE_QUESTIONS.map((question) => {
    const answer = answers.find((item) => item.questionId === question.id);
    const timeTakenSeconds = Math.max(0, Math.min(answer?.timeTakenSeconds ?? 120, 120));
    const correct = answer?.selectedOption === question.correctOption;
    const speedScore = Math.max(0, 40 - Math.round((timeTakenSeconds / 45) * 40));
    const score = correct ? 100 + speedScore : Math.max(0, 15 - Math.round(timeTakenSeconds / 12));

    return {
      style: question.style,
      label: learningStyleLabels[question.style],
      questionId: question.id,
      correct,
      selectedOption: answer?.selectedOption ?? null,
      correctOption: question.correctOption,
      timeTakenSeconds,
      score,
    };
  });

  const best = [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (Number(b.correct) !== Number(a.correct)) return Number(b.correct) - Number(a.correct);
    return a.timeTakenSeconds - b.timeTakenSeconds;
  })[0];

  return {
    learningStyle: best.style,
    learningStyleLabel: best.label,
    scores,
    completedAt: new Date().toISOString(),
  };
}
