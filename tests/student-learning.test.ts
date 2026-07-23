import { describe, expect, it } from "vitest";
import { publishedLessonSchema } from "@/lib/learning/schema";
import { applySequentialLocks, ownsStudentRecord, selectLatestPublishedCandidate, slugify } from "@/lib/learning/logic";

const lesson = {
  identity: {
    course: "Logical Reasoning", module: "Reasoning", topic: "Directions", subtopic: "Turns",
    title: "Turns", slug: "turns", target_audience: "Students", difficulty: "Foundation",
    explanation_depth: "Standard", exam_context: "",
  },
  learning_design: {
    learning_objectives: [], prerequisites: [], estimated_learning_minutes: 20,
  },
  core_content: {
    introduction: "Intro", canonical_definition: "Definition", why_it_matters: "Why",
    concept_explanation: "Explanation", key_terms: [],
  },
  principles: { rules: [], important_distinctions: [] },
  application_method: {
    method_title: "", method_overview: "", steps: [], use_when: "", do_not_use_when: "", faster_method: null,
  },
  worked_examples: [],
  usage_comparisons: [],
  common_mistakes: [],
  memory_support: { memory_aid: "", mental_model: "", quick_recall_note: "" },
  placement_support: {
    question_identification_signals: [], time_management_tip: "", exam_traps: [], interview_relevance: "",
  },
  checkpoint_questions: [],
  remediation: {
    likely_confusion: "", simplified_explanation: "", simple_example: "",
    prerequisite_to_review: "", next_recommended_step: "",
  },
  revision_asset: { summary: "", key_points: [], one_minute_revision: "", final_checklist: [] },
};

const row = (id: string, status: "not_started" | "in_progress" | "completed" | null) => ({
  id, course: "Course", module: "Module", topic: "Topic", subtopic: id, title: id,
  slug: id, difficulty: "Foundation", display_order: Number(id), progress_status: status,
  progress_percentage: status === "completed" ? 100 : 0,
});

describe("published student learning", () => {
  it("validates canonical lesson JSON and rejects malformed content", () => {
    expect(publishedLessonSchema.safeParse(lesson).success).toBe(true);
    expect(publishedLessonSchema.safeParse({ identity: lesson.identity }).success).toBe(false);
  });

  it("creates stable curriculum slugs", () => {
    expect(slugify("English Proficiency")).toBe("english-proficiency");
  });

  it("unlocks the first incomplete lesson and locks subsequent lessons", () => {
    const lessons = applySequentialLocks([row("1", "completed"), row("2", "in_progress"), row("3", null)]);
    expect(lessons.map((item) => item.locked)).toEqual([false, false, true]);
  });

  it("allows students to revisit every completed lesson", () => {
    const lessons = applySequentialLocks([row("1", "completed"), row("2", "completed"), row("3", null)]);
    expect(lessons.map((item) => item.locked)).toEqual([false, false, false]);
  });

  it("does not require optional placement content to be populated", () => {
    expect(publishedLessonSchema.safeParse(lesson).success).toBe(true);
  });

  it("never selects draft content and returns the latest published version", () => {
    const selected = selectLatestPublishedCandidate([
      { status: "draft", content_version: 9, published_at: "2026-07-23" },
      { status: "published", content_version: 1, published_at: "2026-07-20" },
      { status: "published", content_version: 2, published_at: "2026-07-21" },
    ]);
    expect(selected?.status).toBe("published");
    expect(selected?.content_version).toBe(2);
  });

  it("permits progress ownership only for the signed-in student", () => {
    expect(ownsStudentRecord("student-a", "student-a")).toBe(true);
    expect(ownsStudentRecord("student-a", "student-b")).toBe(false);
  });
});
