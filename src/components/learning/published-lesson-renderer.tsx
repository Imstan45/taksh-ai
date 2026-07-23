"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Award, BookOpenCheck, Check, ChevronRight, Flame, LockKeyhole, Sparkles, Target } from "lucide-react";
import type { PublishedLessonContent } from "@/lib/learning/schema";
import { lessonSectionIds } from "@/lib/learning/schema";

type Props = {
  lesson: {
    id: string;
    course: string;
    module: string;
    topic: string;
    subtopic: string;
    title: string;
    difficulty: string;
    content_version: number;
    progress_percentage: number | null;
    last_section: string | null;
    content: PublishedLessonContent;
  };
  nextSlug: string | null;
};

function Section({ id, title, children, tone = "default" }: {
  id: string;
  title: string;
  children: React.ReactNode;
  tone?: "default" | "violet" | "amber" | "emerald";
}) {
  return <section id={id} data-lesson-section className={`lesson-section lesson-${tone}`}><h2>{title}</h2>{children}</section>;
}

const present = (values: unknown[]) => values.some((value) => Array.isArray(value) ? value.length : Boolean(value));

export function PublishedLessonRenderer({ lesson, nextSlug }: Props) {
  const { content } = lesson;
  const [progress, setProgress] = useState(lesson.progress_percentage ?? 0);
  const [completed, setCompleted] = useState(progress === 100);
  const [checkpointState, setCheckpointState] = useState<Record<number, { value: string; revealed: boolean; correct: boolean }>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef(progress);
  const navigation = useMemo(() => lessonSectionIds.map((id) => ({ id, label: id.replaceAll("-", " ") })), []);

  const saveProgress = useCallback(async (section: string, percentage: number, complete = false) => {
    await fetch("/api/learning/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentId: lesson.id,
        course: lesson.course,
        module: lesson.module,
        topic: lesson.topic,
        subtopic: lesson.subtopic,
        contentVersion: lesson.content_version,
        lastSection: section,
        progressPercentage: percentage,
        complete,
      }),
    });
  }, [lesson.course, lesson.id, lesson.module, lesson.subtopic, lesson.topic, lesson.content_version]);

  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>("[data-lesson-section]")];
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const index = sections.indexOf(visible.target as HTMLElement);
      const nextProgress = Math.max(progressRef.current, Math.round(((index + 1) / sections.length) * 95));
      progressRef.current = nextProgress;
      setProgress(nextProgress);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void saveProgress(visible.target.id, nextProgress), 900);
    }, { rootMargin: "-20% 0px -55% 0px", threshold: [0.2, 0.6] });
    sections.forEach((section) => observer.observe(section));
    const restore = document.getElementById(lesson.last_section ?? "");
    if (restore) requestAnimationFrame(() => restore.scrollIntoView({ block: "start" }));
    return () => {
      observer.disconnect();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [lesson.last_section, saveProgress]);

  async function completeLesson() {
    await saveProgress("revision", 100, true);
    progressRef.current = 100;
    setProgress(100);
    setCompleted(true);
  }

  return (
    <main className="lesson-page">
      <div className="lesson-progress-top"><span style={{ width: `${progress}%` }} /></div>
      <header className="lesson-hero">
        <div className="lesson-breadcrumbs">{lesson.course}<ChevronRight />{lesson.module}<ChevronRight />{lesson.topic}</div>
        <div className="lesson-title-row">
          <div><p className="eyebrow">Published lesson · Standard mode</p><h1>{lesson.title}</h1><p>{lesson.subtopic}</p></div>
          <div className="lesson-meta"><span>{lesson.difficulty}</span><span>{content.learning_design.estimated_learning_minutes} min</span><strong>{progress}%</strong></div>
        </div>
      </header>

      <div className="lesson-layout">
        <aside className="lesson-nav">
          <p>Lesson map</p>
          {navigation.map((item, index) => <a key={item.id} href={`#${item.id}`}><span>{index + 1}</span>{item.label}</a>)}
        </aside>

        <article className="lesson-content">
          <Section id="objectives" title="What you will learn" tone="violet">
            <div className="objective-grid">{content.learning_design.learning_objectives.map((item) => <div key={item.objective_id}><Target /><p>{item.objective}</p><small>{item.skill_level}</small></div>)}</div>
          </Section>

          <Section id="prerequisites" title="Before you begin">
            <div className="term-grid">{content.learning_design.prerequisites.map((item) => <div key={item.title}><h3>{item.title}</h3><p>{item.description}</p><small>{item.importance}</small></div>)}</div>
          </Section>

          <Section id="introduction" title="Introduction"><p className="lesson-lead">{content.core_content.introduction}</p></Section>
          <Section id="definition" title="Definition" tone="violet"><blockquote>{content.core_content.canonical_definition}</blockquote></Section>
          <Section id="why-it-matters" title="Why it matters"><p>{content.core_content.why_it_matters}</p></Section>
          <Section id="concept" title="Concept explanation"><p>{content.core_content.concept_explanation}</p></Section>

          <Section id="key-terms" title="Key terms">
            <div className="term-grid">{content.core_content.key_terms.map((term) => <div key={term.term}><h3>{term.term}</h3><p>{term.definition}</p>{term.example && <small>Example: {term.example}</small>}</div>)}</div>
          </Section>

          <Section id="principles" title="Rules and principles">
            <div className="lesson-stack">{content.principles.rules.map((rule) => <div className="rule-card" key={rule.rule_number}><span>Rule {rule.rule_number}</span><h3>{rule.title}</h3><p>{rule.explanation}</p><small><b>Why it works:</b> {rule.why_it_works}</small>{rule.exception && <small className="warning"><b>Exception:</b> {rule.exception}</small>}</div>)}</div>
            {content.principles.important_distinctions.map((item) => <div className="comparison-card" key={`${item.concept_a}-${item.concept_b}`}><b>{item.concept_a}</b><span>versus</span><b>{item.concept_b}</b><p>{item.difference}</p><small>{item.example}</small></div>)}
          </Section>

          <Section id="method" title="How to solve or apply it" tone="violet">
            <h3>{content.application_method.method_title}</h3><p>{content.application_method.method_overview}</p>
            <ol className="method-steps">{content.application_method.steps.map((step) => <li key={step.step_number}><span>{step.step_number}</span><div><h3>{step.title}</h3><p>{step.instruction}</p><small><b>Reason:</b> {step.reason}</small><small><b>Self-check:</b> {step.student_check}</small></div></li>)}</ol>
            <div className="use-grid"><div><b>Use when</b><p>{content.application_method.use_when}</p></div><div><b>Do not use when</b><p>{content.application_method.do_not_use_when}</p></div></div>
            {content.application_method.faster_method && <div className="quick-note"><Sparkles />{content.application_method.faster_method}</div>}
          </Section>

          <Section id="examples" title="Worked examples">
            <div className="lesson-stack">{content.worked_examples.map((example) => <details className="example-card" key={example.example_number}><summary><span>Example {example.example_number}</span><div><h3>{example.title}</h3><small>{example.difficulty} · Try it before revealing the solution</small></div></summary><div className="example-body"><h4>Question</h4><p>{example.question_or_scenario}</p>{example.given_information.length > 0 && <ul>{example.given_information.map((item) => <li key={item}>{item}</li>)}</ul>}<h4>Solution</h4>{example.reasoning_steps.map((step) => <div className="reason-step" key={step.step_number}><span>{step.step_number}</span><p>{step.explanation}</p></div>)}<div className="answer-card"><b>Final answer</b><p>{example.final_answer}</p><small>{example.why_the_answer_is_correct}</small></div><p><b>Takeaway:</b> {example.learning_takeaway}</p></div></details>)}</div>
          </Section>

          <Section id="comparisons" title="Correct versus incorrect usage">
            <div className="lesson-stack">{content.usage_comparisons.map((item, index) => <div className="usage-card" key={index}><div><Check />{item.correct_example}</div><div><span>×</span>{item.incorrect_example}</div><p>{item.explanation}</p></div>)}</div>
          </Section>

          <Section id="mistakes" title="Common mistakes" tone="amber">
            <div className="lesson-stack">{content.common_mistakes.map((item) => <div className="mistake-card" key={item.mistake_number}><h3>{item.title}</h3><p><b>Incorrect approach:</b> {item.incorrect_approach}</p><p><b>Why it happens:</b> {item.why_students_make_it}</p><p><b>Why it is wrong:</b> {item.why_it_is_wrong}</p><p><b>Correction:</b> {item.correction}</p><small>{item.prevention_tip}</small></div>)}</div>
          </Section>

          <Section id="memory" title="Memory support" tone="emerald"><div className="memory-grid"><div><Award /><b>Memory aid</b><p>{content.memory_support.memory_aid}</p></div><div><BookOpenCheck /><b>Mental model</b><p>{content.memory_support.mental_model}</p></div><div><Flame /><b>Quick recall</b><p>{content.memory_support.quick_recall_note}</p></div></div></Section>

          {present(Object.values(content.placement_support)) && <Section id="placement" title="Placement support"><ul>{content.placement_support.question_identification_signals.map((item) => <li key={item}>{item}</li>)}</ul><p><b>Time management:</b> {content.placement_support.time_management_tip}</p><p><b>Interview relevance:</b> {content.placement_support.interview_relevance}</p>{content.placement_support.exam_traps.length > 0 && <div className="quick-note"><LockKeyhole />Watch for: {content.placement_support.exam_traps.join("; ")}</div>}</Section>}

          <Section id="checkpoints" title="Check your understanding" tone="violet">
            <div className="lesson-stack">{content.checkpoint_questions.map((item) => {
              const state = checkpointState[item.question_number] ?? { value: "", revealed: false, correct: false };
              return <div className="checkpoint-card" key={item.question_number}><small>{item.type} · {item.difficulty}</small><h3>{item.question_number}. {item.question}</h3><input value={state.value} onChange={(event) => setCheckpointState((current) => ({ ...current, [item.question_number]: { ...state, value: event.target.value } }))} placeholder="Type your answer" /><button onClick={() => { const correct = state.value.trim().toLowerCase() === item.answer.trim().toLowerCase(); setCheckpointState((current) => ({ ...current, [item.question_number]: { ...state, revealed: true, correct } })); }}>Check answer</button>{state.revealed && <div className={state.correct ? "checkpoint-correct" : "checkpoint-review"}><b>{state.correct ? "Correct" : `Correct answer: ${item.answer}`}</b><p>{item.explanation}</p><small>Skill tested: {item.skill_tested}</small></div>}</div>;
            })}</div>
          </Section>

          <Section id="remediation" title="Need another explanation?"><div className="remediation-card"><p><b>Likely confusion:</b> {content.remediation.likely_confusion}</p><p>{content.remediation.simplified_explanation}</p><p><b>Simple example:</b> {content.remediation.simple_example}</p><p><b>Review:</b> {content.remediation.prerequisite_to_review}</p><small>Next step: {content.remediation.next_recommended_step}</small></div></Section>

          <Section id="revision" title="Revision" tone="emerald"><p className="lesson-lead">{content.revision_asset.summary}</p><ul>{content.revision_asset.key_points.map((item) => <li key={item}>{item}</li>)}</ul><div className="quick-note"><Flame />{content.revision_asset.one_minute_revision}</div><div className="revision-checklist">{content.revision_asset.final_checklist.map((item) => <label key={item}><input type="checkbox" />{item}</label>)}</div></Section>

          <div className="complete-card">
            {completed ? <><Award /><h2>Lesson completed</h2><p>You earned 50 XP. Your next lesson is now unlocked.</p>{nextSlug ? <Link className="btn-primary" href={`/student/learn/${nextSlug}`}>Continue to next lesson</Link> : <Link className="btn-primary" href="/student/courses">View course progress</Link>}</> : <><BookOpenCheck /><h2>Ready to complete this lesson?</h2><p>Mark it complete to earn XP and unlock the next subtopic.</p><button className="btn-primary" onClick={completeLesson}>Complete lesson · +50 XP</button></>}
          </div>
        </article>
      </div>
    </main>
  );
}
