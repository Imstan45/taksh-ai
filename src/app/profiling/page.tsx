"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock3, LoaderCircle } from "lucide-react";
import { SAFE_PROFILING_QUESTIONS, type ProfilingQuestion } from "@/lib/profiling/static-questions";

type Answer = {
  questionId: string;
  selectedOption: number | null;
  timeTakenSeconds: number;
};

const categoryLabels: Record<string, string> = {
  aptitude: "Aptitude",
  logical_reasoning: "Logical Reasoning",
  directions: "Directions",
  english: "English",
  reading_comprehension: "Reading Comprehension",
};

export default function ProfilingPage() {
  const router = useRouter();
  const questions = SAFE_PROFILING_QUESTIONS as ProfilingQuestion[];
  const [index, setIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = questions[index];
  const progress = Math.round(((index + 1) / questions.length) * 100);

  const counts = useMemo(() => {
    return questions.reduce<Record<string, number>>((acc, question) => {
      acc[question.category] = (acc[question.category] ?? 0) + 1;
      return acc;
    }, {});
  }, [questions]);

  async function submitAnswer() {
    const timeTakenSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const nextAnswers = [
      ...answers.filter((answer) => answer.questionId !== current.id),
      { questionId: current.id, selectedOption, timeTakenSeconds },
    ];

    setAnswers(nextAnswers);
    setSelectedOption(null);
    setStartedAt(Date.now());
    setError(null);

    if (index < questions.length - 1) {
      setIndex((value) => value + 1);
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/profiling/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers: nextAnswers }),
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setSubmitting(false);

    if (!response.ok) {
      setError(data?.error ?? "Unable to save profiling test. Please try again.");
      return;
    }

    router.push("/continue-learning");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#08090e] px-4 py-8 text-white sm:px-8">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Taksh AI Profiling Test</p>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">20-question placement readiness profile</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
              This test checks accuracy and time. Very fast correct answers are treated as possible guesses, and very slow correct answers receive lower points.
            </p>
          </div>
          <div className="glass-card min-w-40 text-center">
            <p className="text-3xl font-semibold">{progress}%</p>
            <p className="mt-1 text-xs text-zinc-500">completed</p>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-5">
          {Object.entries(counts).map(([category, count]) => (
            <div key={category} className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
              <p className="text-sm font-medium">{categoryLabels[category]}</p>
              <p className="mt-1 text-xs text-zinc-500">{count} questions</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
          <section className="glass-card">
            <div className="flex items-center justify-between gap-4">
              <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
                Question {index + 1} of {questions.length}
              </span>
              <span className="flex items-center gap-2 text-xs text-zinc-500"><Clock3 className="size-4" /> Time is being tracked</span>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm font-medium text-violet-300">{categoryLabels[current.category]} · {current.topic}</p>
              {current.passage && <p className="mt-4 rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm leading-6 text-zinc-300">{current.passage}</p>}
              <h2 className="mt-5 text-xl font-semibold leading-8">{current.question}</h2>
            </div>

            <div className="mt-5 grid gap-3">
              {current.options.map((option, optionIndex) => {
                const active = selectedOption === optionIndex;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSelectedOption(optionIndex)}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${active ? "border-violet-400 bg-violet-500/15" : "border-white/10 bg-white/[.03] hover:border-white/20"}`}
                  >
                    <span className={`grid size-8 shrink-0 place-items-center rounded-full border text-sm ${active ? "border-violet-300 bg-violet-500 text-white" : "border-white/10 text-zinc-400"}`}>{String.fromCharCode(65 + optionIndex)}</span>
                    <span className="text-sm text-zinc-100">{option}</span>
                  </button>
                );
              })}
            </div>

            {error && <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

            <div className="mt-6 flex justify-end">
              <button className="btn-primary" disabled={selectedOption === null || submitting} onClick={submitAnswer}>
                {submitting ? <LoaderCircle className="size-4 animate-spin" /> : index === questions.length - 1 ? <CheckCircle2 className="size-4" /> : <ArrowRight className="size-4" />}
                {index === questions.length - 1 ? "Submit profile" : "Next question"}
              </button>
            </div>
          </section>

          <aside className="glass-card h-fit">
            <h3 className="font-medium">Scoring logic</h3>
            <div className="mt-4 space-y-3 text-sm text-zinc-400">
              <p><strong className="text-white">&lt; 5 sec:</strong> correct answer gets reduced points.</p>
              <p><strong className="text-white">5–45 sec:</strong> best scoring range.</p>
              <p><strong className="text-white">45–180 sec:</strong> partial deduction.</p>
              <p><strong className="text-white">&gt; 180 sec:</strong> correct but too slow, lower points.</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
