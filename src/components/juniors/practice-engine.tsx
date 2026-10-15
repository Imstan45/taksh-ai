"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Question = { id: string; subject: string; topic: string; prompt: string; options: string[]; question_type: "mcq" | "numerical"; selectedOption: number | null; numericalAnswer: string | null; markedForReview: boolean };

export function PracticeEngine({ sessionId, questions, expiresAt }: { sessionId: string; questions: Question[]; expiresAt: string | null }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [options, setOptions] = useState<Record<string, number>>(Object.fromEntries(questions.filter((question) => question.selectedOption !== null).map((question) => [question.id, question.selectedOption!])));
  const [numerical, setNumerical] = useState<Record<string, string>>(Object.fromEntries(questions.filter((question) => question.numericalAnswer !== null).map((question) => [question.id, question.numericalAnswer!])));
  const [review, setReview] = useState<Record<string, boolean>>(Object.fromEntries(questions.map((question) => [question.id, question.markedForReview])));
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const submitRef = useRef<() => Promise<void>>(async () => undefined);
  const question = questions[index];
  const answeredCount = new Set([...Object.keys(options), ...Object.keys(numerical).filter((id) => numerical[id].trim() !== "")]).size;

  useEffect(() => {
    if (!expiresAt) return;
    const deadline = new Date(expiresAt).getTime();
    const updateClock = () => setRemaining(Math.max(0, Math.floor((deadline - Date.now()) / 1000)));
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  useEffect(() => { if (remaining === 0) void submitRef.current(); }, [remaining]);
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  async function persist(id: string, selectedOption: number | null, numericalAnswer: string | null, markedForReview: boolean) {
    await fetch(`/api/juniors/practice/${sessionId}/answer`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: id, selectedOption, numericalAnswer: numericalAnswer?.trim() || null, markedForReview }) });
  }

  async function saveOption(selectedOption: number | null, markedForReview = review[question.id] ?? false) {
    setOptions((current) => { const next = { ...current }; if (selectedOption === null) delete next[question.id]; else next[question.id] = selectedOption; return next; });
    setReview((current) => ({ ...current, [question.id]: markedForReview }));
    await persist(question.id, selectedOption, null, markedForReview);
  }

  function saveNumerical(value: string, markedForReview = review[question.id] ?? false) {
    if (!/^-?(?:\d*(?:\.\d*)?)?$/.test(value)) return;
    setNumerical((current) => { const next = { ...current }; if (!value) delete next[question.id]; else next[question.id] = value; return next; });
    setReview((current) => ({ ...current, [question.id]: markedForReview }));
    clearTimeout(timers.current[question.id]);
    timers.current[question.id] = setTimeout(() => void persist(question.id, null, value || null, markedForReview), 450);
  }

  async function toggleReview() {
    const marked = !review[question.id];
    clearTimeout(timers.current[question.id]);
    setReview((current) => ({ ...current, [question.id]: marked }));
    await persist(question.id, options[question.id] ?? null, numerical[question.id] ?? null, marked);
  }

  async function clearResponse() {
    clearTimeout(timers.current[question.id]);
    setOptions((current) => { const next = { ...current }; delete next[question.id]; return next; });
    setNumerical((current) => { const next = { ...current }; delete next[question.id]; return next; });
    await persist(question.id, null, null, review[question.id] ?? false);
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    Object.values(timers.current).forEach(clearTimeout);
    await Promise.all(questions.map((item) => persist(item.id, options[item.id] ?? null, numerical[item.id] ?? null, review[item.id] ?? false)));
    const response = await fetch(`/api/juniors/practice/${sessionId}/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const payload = await response.json() as { resultUrl?: string };
    if (payload.resultUrl) router.push(payload.resultUrl); else setBusy(false);
  }
  useEffect(() => { submitRef.current = submit; });

  const clock = remaining === null ? null : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  return <div className="jp-engine"><header><span>Question {index + 1} of {questions.length}</span><b>{clock && `Time ${clock} · `}{answeredCount} answered</b></header><div className="jp-layout"><aside>{questions.map((item, itemIndex) => <button key={item.id} onClick={() => setIndex(itemIndex)} className={`${itemIndex === index ? "active" : ""} ${options[item.id] !== undefined || numerical[item.id] !== undefined ? "answered" : ""} ${review[item.id] ? "review" : ""}`}>{itemIndex + 1}</button>)}</aside><article><span className="j-eyebrow">{question.subject} · {question.topic}</span><h1>{question.prompt}</h1>{question.question_type === "mcq" ? <div className="jp-options">{question.options.map((option, optionIndex) => <button key={option} onClick={() => void saveOption(optionIndex)} className={options[question.id] === optionIndex ? "selected" : ""}><i>{String.fromCharCode(65 + optionIndex)}</i>{option}</button>)}</div> : <label className="jp-numerical">Numerical answer<input aria-label="Numerical answer" autoComplete="off" inputMode="decimal" placeholder="Enter a number" value={numerical[question.id] ?? ""} onChange={(event) => saveNumerical(event.target.value)} /><small>Numbers only. Your response is saved automatically.</small></label>}<div className="jp-tools"><button onClick={() => void clearResponse()}>Clear response</button><button onClick={() => void toggleReview()}>{review[question.id] ? "Remove review mark" : "Mark for review"}</button><span>Saved automatically</span></div><footer><button className="j-btn j-btn-outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</button>{index < questions.length - 1 ? <button className="j-btn" onClick={() => setIndex(index + 1)}>Next</button> : <button className="j-btn" disabled={busy} onClick={() => void submit()}>Submit session</button>}</footer></article></div></div>;
}
