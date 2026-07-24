"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, Flag, Loader2, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";

type OptionKey = "A" | "B" | "C" | "D";

type AssessmentQuestion = {
  number: number;
  id: string;
  topicId: string;
  module: string;
  subject: string;
  topicName: string;
  difficulty: string;
  question: string;
  options: Record<OptionKey, string>;
};

type AssessmentPayload = {
  attemptTicket: string;
  startedAt: string;
  durationMinutes: number;
  count: number;
  questions: AssessmentQuestion[];
};

type AssessmentResult = {
  score: number;
  maxScore: number;
  percentage: number;
  results: Array<{ questionId: string; selectedAnswer: string | null; correctAnswer: string; explanation: string | null; correct: boolean }>;
};

const optionKeys: OptionKey[] = ["A", "B", "C", "D"];

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function AptitudeAssessment() {
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(30 * 60);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attemptTicket, setAttemptTicket] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [result, setResult] = useState<AssessmentResult>();
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAssessment();
  }, []);

  useEffect(() => {
    if (loading || submitted || remainingSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          void submitAssessment();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
    // submitAssessment deliberately uses the latest render state when the interval fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, remainingSeconds, submitted]);

  async function loadAssessment() {
    setLoading(true);
    setError(null);
    setSubmitted(false);
    setAnswers({});
    setCurrentIndex(0);
    setResult(undefined);
    setSubmitting(false);
    setConfirming(false);
    setFlagged(new Set());
    setSuccess(null);

    try {
      const response = await fetch("/api/assessment/questions", { cache: "no-store" });
      const payload = (await response.json()) as AssessmentPayload | { error?: string };
      if (!response.ok) throw new Error("error" in payload ? payload.error : "Could not load assessment questions.");

      const data = payload as AssessmentPayload;
      setQuestions(data.questions);
      setAttemptTicket(data.attemptTicket);
      setStartedAt(data.startedAt);
      const seconds = data.durationMinutes * 60;
      setRemainingSeconds(seconds);
      if (data.questions.length < 30) {
        setError(`Only ${data.questions.length} aptitude questions are available right now. The assessment can still be attempted.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load assessment questions.");
    } finally {
      setLoading(false);
    }
  }

  async function submitAssessment() {
    if (submitted || submitting) return;
    setSubmitting(true);
    setConfirming(false);
    setError(null);
    try {
      const response = await fetch("/api/assessment/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          attemptTicket,
          startedAt,
          answers: Object.entries(answers).map(([questionId, selectedAnswer]) => ({ questionId, selectedAnswer })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Assessment could not be submitted.");
        return;
      }
      setResult(payload);
      setSubmitted(true);
      setSuccess("Assessment submitted successfully. Your result is ready.");
    } catch {
      setError("Assessment could not be submitted. Your answers are still here; please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const answeredCount = Object.keys(answers).length;
  const current = questions[currentIndex];
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  if (loading) {
    return (
      <div className="glass-card flex min-h-[360px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-violet-300" />
          <p className="mt-4 text-sm text-zinc-400">Preparing your aptitude assessment...</p>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="glass-card">
        <p className="eyebrow">Assessment unavailable</p>
        <h2 className="mt-5 text-2xl font-semibold">No aptitude questions were found.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          Generate questions in the question bank first, then return here to start a 30-question assessment.
        </p>
        {error ? <p className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn-primary" type="button" onClick={loadAssessment}>Try again</button>
          <Link className="btn-ghost border border-white/10" href="/dashboard">Dashboard</Link>
          <Link className="btn-ghost border border-white/10" href="/continue-learning">Continue learning</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="glass-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Aptitude assessment</p>
            <h2 className="mt-4 text-3xl font-semibold">{submitted ? "Assessment result" : "Answer 30 questions in 30 minutes"}</h2>
            <p className="mt-2 text-sm text-zinc-400">Questions are randomly selected from the Supabase question bank for every attempt.</p>
          </div>
          <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-lg font-semibold ${remainingSeconds <= 300 && !submitted ? "border-red-400/30 bg-red-500/10 text-red-200" : "border-white/10 bg-black/20 text-white"}`}>
            <Clock3 className="size-5" />
            {formatTime(remainingSeconds)}
          </div>
        </div>

        {error ? <p className="mt-5 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">{error}</p> : null}
        {success ? <p role="status" className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">{success}</p> : null}

        {!submitted && current ? (
          <div className="mt-8">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span className="rounded-full bg-white/10 px-3 py-1">Question {currentIndex + 1} of {questions.length}</span>
              <span className="rounded-full bg-violet-500/10 px-3 py-1 text-violet-200">{current.subject}</span>
              <span className="rounded-full bg-white/10 px-3 py-1">{current.topicName}</span>
              <span className="rounded-full bg-white/10 px-3 py-1">{current.difficulty}</span>
            </div>

            <p className="mt-6 text-xl leading-8 text-zinc-50">{current.question}</p>

            <div className="mt-6 grid gap-3">
              {optionKeys.map((key) => {
                const selected = answers[current.id] === key;
                return (
                  <button
                    key={key}
                    className={`flex min-h-14 items-start gap-3 rounded-2xl border p-4 text-left transition ${selected ? "border-violet-400 bg-violet-500/15 text-white" : "border-white/10 bg-black/20 text-zinc-200 hover:border-white/25 hover:bg-white/[.06]"}`}
                    type="button"
                    onClick={() => setAnswers((value) => ({ ...value, [current.id]: key }))}
                  >
                    <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${selected ? "bg-violet-400 text-black" : "bg-white/10 text-zinc-300"}`}>{key}</span>
                    <span>{current.options[key]}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap justify-between gap-3">
              <button className="btn-ghost border border-white/10" type="button" disabled={currentIndex === 0} onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}>Previous</button>
              <div className="flex gap-3">
                <button className={`btn-ghost gap-2 border ${flagged.has(current.id) ? "border-amber-400/30 bg-amber-500/10 text-amber-200" : "border-white/10"}`} type="button" onClick={() => setFlagged((items) => { const next = new Set(items); if (next.has(current.id)) next.delete(current.id); else next.add(current.id); return next; })}><Flag className="size-4" />{flagged.has(current.id) ? "Flagged" : "Flag"}</button>
                {currentIndex < questions.length - 1 ? (
                  <button className="btn-primary" type="button" onClick={() => setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))}>Next question</button>
                ) : (
                  <button className="btn-primary" type="button" disabled={submitting} onClick={() => setConfirming(true)}>{submitting && <Loader2 className="size-4 animate-spin" />}Review and submit</button>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {submitted ? (
          <div className="mt-8">
            <div className="rounded-3xl border border-violet-400/20 bg-violet-500/10 p-6">
              <p className="text-sm text-violet-200">Final score</p>
              <h3 className="mt-2 text-5xl font-semibold">{result?.score ?? 0}/{result?.maxScore ?? questions.length}</h3>
              <p className="mt-3 text-sm text-zinc-300">You answered {answeredCount} questions. Review the explanations below to understand each solution.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button className="btn-primary" type="button" onClick={loadAssessment}><RotateCcw className="size-4" /> Start new random assessment</button>
                <Link className="btn-ghost border border-white/10" href="/dashboard">Dashboard</Link>
                <Link className="btn-ghost border border-white/10" href="/continue-learning">Continue learning</Link>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {questions.map((question, index) => {
                const selected = answers[question.id];
                const evaluated = result?.results.find((item) => item.questionId === question.id);
                const correct = Boolean(evaluated?.correct);
                return (
                  <article key={question.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-zinc-400">Question {index + 1} · {question.topicName}</p>
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${correct ? "bg-emerald-500/10 text-emerald-200" : "bg-red-500/10 text-red-200"}`}>
                        {correct ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                        {correct ? "Correct" : "Needs review"}
                      </span>
                    </div>
                    <p className="mt-4 leading-7">{question.question}</p>
                    <div className="mt-4 grid gap-2">
                      {optionKeys.map((key) => (
                        <div key={key} className={`rounded-xl border p-3 text-sm ${key === evaluated?.correctAnswer ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : selected === key ? "border-red-400/30 bg-red-500/10 text-red-100" : "border-white/10 bg-white/[.03] text-zinc-300"}`}>
                          <strong>{key}.</strong> {question.options[key]}
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-sm text-zinc-300"><strong className="text-white">Your answer:</strong> {selected ?? "Not answered"} · <strong className="text-white">Correct answer:</strong> {evaluated?.correctAnswer}</p>
                    <div className="mt-4 rounded-xl border border-sky-400/20 bg-sky-500/10 p-4 text-sm leading-6 text-sky-100">
                      <strong>Explanation:</strong> {evaluated?.explanation ?? "Explanation is not available."}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      <aside className="glass-card h-fit">
        <p className="eyebrow">Progress</p>
        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="text-3xl font-semibold">{answeredCount}/{questions.length}</p>
            <p className="mt-1 text-sm text-zinc-500">answered</p>
          </div>
          <p className="text-sm text-zinc-400">{progress}%</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-violet-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-6 grid grid-cols-5 gap-2">
          {questions.map((question, index) => (
            <button
              key={question.id}
              className={`grid size-10 place-items-center rounded-xl border text-sm ${index === currentIndex && !submitted ? "border-violet-400 bg-violet-500/20 text-white" : answers[question.id] ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-black/20 text-zinc-400"}`}
              type="button"
              onClick={() => setCurrentIndex(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>
        {!submitted ? <><p className="mt-6 text-xs leading-5 text-zinc-500">The timer auto-submits when it reaches zero. You can move between questions anytime before submission.</p><button className="mt-3 text-xs text-zinc-500 underline decoration-zinc-700 underline-offset-4 hover:text-zinc-300" type="button" onClick={() => setConfirming(true)}>Finish assessment early</button></> : null}
      </aside>
      {confirming && !submitted ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="submit-title">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111218] p-6 shadow-2xl">
          <h3 id="submit-title" className="text-xl font-semibold">Submit assessment?</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Submission is permanent. Review the attempt summary before continuing.</p>
          <dl className="mt-5 grid grid-cols-2 gap-3">
            <Summary label="Answered" value={answeredCount} />
            <Summary label="Unanswered" value={questions.length - answeredCount} warn={questions.length > answeredCount} />
            <Summary label="Flagged" value={flagged.size} warn={flagged.size > 0} />
            <Summary label="Time remaining" value={formatTime(remainingSeconds)} />
          </dl>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-ghost border border-white/10" disabled={submitting} onClick={() => setConfirming(false)}>Return to assessment</button>
            <button className="btn-primary" disabled={submitting} onClick={() => void submitAssessment()}>{submitting && <Loader2 className="size-4 animate-spin" />}{submitting ? "Submitting…" : "Submit assessment permanently"}</button>
          </div>
        </div>
      </div> : null}
    </div>
  );
}

function Summary({ label, value, warn = false }: { label: string; value: string | number; warn?: boolean }) {
  return <div className={`rounded-xl border p-3 ${warn ? "border-amber-400/20 bg-amber-500/10" : "border-white/10 bg-white/[.03]"}`}><dt className="text-xs text-zinc-500">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>;
}
