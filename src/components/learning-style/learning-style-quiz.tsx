"use client";
/* eslint-disable react-hooks/purity -- timestamps are captured only for user-event timing */

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { LEARNING_STYLE_QUESTIONS, learningStyleLabels, type LearningStyle } from "@/lib/learning-style/quiz";

type LearningStyleResult = {
  learningStyle: LearningStyle;
  learningStyleLabel: string;
  scores: Array<{
    style: LearningStyle;
    label: string;
    correct: boolean;
    timeTakenSeconds: number;
    score: number;
  }>;
};

type LearningStyleQuizProps = {
  initialLearningStyle?: LearningStyle | null;
};

export function LearningStyleQuiz({ initialLearningStyle }: LearningStyleQuizProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { selectedOption: number; timeTakenSeconds: number }>>({});
  const [result, setResult] = useState<LearningStyleResult | null>(
    initialLearningStyle
      ? {
          learningStyle: initialLearningStyle,
          learningStyleLabel: learningStyleLabels[initialLearningStyle],
          scores: [],
        }
      : null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const questionStartedAt = useRef(Date.now());

  const current = LEARNING_STYLE_QUESTIONS[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const complete = answeredCount === LEARNING_STYLE_QUESTIONS.length;

  const bestScoreText = useMemo(() => {
    if (!result?.scores.length) return null;
    return result.scores
      .map((item) => `${item.label}: ${item.score}`)
      .join(" · ");
  }, [result]);

  function chooseOption(selectedOption: number) {
    const elapsed = Math.max(1, Math.round((Date.now() - questionStartedAt.current) / 1000));
    setAnswers((value) => ({
      ...value,
      [current.id]: { selectedOption, timeTakenSeconds: elapsed },
    }));
  }

  function goToQuestion(nextIndex: number) {
    setCurrentIndex(nextIndex);
    questionStartedAt.current = Date.now();
  }

  async function submitQuiz() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/learning-style/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: LEARNING_STYLE_QUESTIONS.map((question) => ({
            questionId: question.id,
            selectedOption: answers[question.id]?.selectedOption ?? null,
            timeTakenSeconds: answers[question.id]?.timeTakenSeconds ?? 120,
          })),
        }),
      });
      const payload = (await response.json()) as { result?: LearningStyleResult; error?: string };
      if (!response.ok || !payload.result) throw new Error(payload.error ?? "Could not save learning style.");
      setResult(payload.result);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save learning style.");
    } finally {
      setSaving(false);
    }
  }

  if (result) {
    return (
      <div className="glass-card border border-sky-400/20 bg-sky-500/10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Learning style saved</p>
            <h2 className="mt-3 text-2xl font-semibold">{result.learningStyleLabel}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
              Your future learning content can now be shaped in this style. The result is based on accuracy first, then answer speed.
            </p>
            {bestScoreText ? <p className="mt-3 text-xs leading-5 text-sky-100">{bestScoreText}</p> : null}
          </div>
          <CheckCircle2 className="size-10 shrink-0 text-sky-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card border border-sky-400/20 bg-sky-500/10">
      <p className="eyebrow">Learning style check</p>
      <h2 className="mt-3 text-2xl font-semibold">Answer 4 quick questions</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
        Each question is taught in a different style. Taksh AI will save the style where you answer most accurately and fastest.
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-500">Question {currentIndex + 1} of {LEARNING_STYLE_QUESTIONS.length}</p>
            <h3 className="mt-1 font-medium">{current.title}</h3>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-300">{answeredCount}/{LEARNING_STYLE_QUESTIONS.length} answered</span>
        </div>

        <p className="mt-5 text-lg leading-7 text-zinc-50">{current.prompt}</p>

        <div className="mt-5 grid gap-3">
          {current.options.map((option, index) => {
            const selected = answers[current.id]?.selectedOption === index;
            return (
              <button
                key={option}
                className={`flex min-h-12 items-center gap-3 rounded-2xl border p-4 text-left transition ${selected ? "border-sky-300 bg-sky-500/20 text-white" : "border-white/10 bg-black/20 text-zinc-200 hover:border-white/25"}`}
                type="button"
                onClick={() => chooseOption(index)}
              >
                <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${selected ? "bg-sky-300 text-black" : "bg-white/10 text-zinc-300"}`}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error ? <p className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

      <div className="mt-6 flex flex-wrap justify-between gap-3">
        <button className="btn-ghost border border-white/10" type="button" disabled={currentIndex === 0} onClick={() => goToQuestion(Math.max(0, currentIndex - 1))}>Previous</button>
        <div className="flex flex-wrap gap-3">
          <button className="btn-ghost border border-white/10" type="button" disabled={currentIndex === LEARNING_STYLE_QUESTIONS.length - 1} onClick={() => goToQuestion(Math.min(LEARNING_STYLE_QUESTIONS.length - 1, currentIndex + 1))}>Next</button>
          <button className="btn-primary" type="button" disabled={!complete || saving} onClick={submitQuiz}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save learning style
          </button>
        </div>
      </div>
    </div>
  );
}
