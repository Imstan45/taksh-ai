import { z } from "zod";

const text = z.string();

export const publishedLessonSchema = z.object({
  identity: z.object({
    course: text,
    module: text,
    topic: text,
    subtopic: text,
    title: text,
    slug: text,
    target_audience: text,
    difficulty: text,
    explanation_depth: text,
    exam_context: text,
  }),
  learning_design: z.object({
    learning_objectives: z.array(z.object({
      objective_id: text,
      objective: text,
      skill_level: text,
    })),
    prerequisites: z.array(z.object({
      title: text,
      description: text,
      importance: text,
    })),
    estimated_learning_minutes: z.number().nonnegative(),
  }),
  core_content: z.object({
    introduction: text,
    canonical_definition: text,
    why_it_matters: text,
    concept_explanation: text,
    key_terms: z.array(z.object({ term: text, definition: text, example: text })),
  }),
  principles: z.object({
    rules: z.array(z.object({
      rule_number: z.number(),
      title: text,
      explanation: text,
      why_it_works: text,
      exception: z.string().nullable(),
    })),
    important_distinctions: z.array(z.object({
      concept_a: text,
      concept_b: text,
      difference: text,
      example: text,
    })),
  }),
  application_method: z.object({
    method_title: text,
    method_overview: text,
    steps: z.array(z.object({
      step_number: z.number(),
      title: text,
      instruction: text,
      reason: text,
      student_check: text,
    })),
    use_when: text,
    do_not_use_when: text,
    faster_method: z.string().nullable(),
  }),
  worked_examples: z.array(z.object({
    example_number: z.number(),
    title: text,
    difficulty: text,
    question_or_scenario: text,
    given_information: z.array(text),
    reasoning_steps: z.array(z.object({ step_number: z.number(), explanation: text })),
    final_answer: text,
    why_the_answer_is_correct: text,
    learning_takeaway: text,
  })),
  usage_comparisons: z.array(z.object({
    correct_example: text,
    incorrect_example: text,
    explanation: text,
  })),
  common_mistakes: z.array(z.object({
    mistake_number: z.number(),
    title: text,
    incorrect_approach: text,
    why_students_make_it: text,
    why_it_is_wrong: text,
    correction: text,
    prevention_tip: text,
  })),
  memory_support: z.object({ memory_aid: text, mental_model: text, quick_recall_note: text }),
  placement_support: z.object({
    question_identification_signals: z.array(text),
    time_management_tip: text,
    exam_traps: z.array(text),
    interview_relevance: text,
  }),
  checkpoint_questions: z.array(z.object({
    question_number: z.number(),
    type: text,
    question: text,
    answer: text,
    explanation: text,
    skill_tested: text,
    difficulty: text,
  })),
  remediation: z.object({
    likely_confusion: text,
    simplified_explanation: text,
    simple_example: text,
    prerequisite_to_review: text,
    next_recommended_step: text,
  }),
  revision_asset: z.object({
    summary: text,
    key_points: z.array(text),
    one_minute_revision: text,
    final_checklist: z.array(text),
  }),
  quality_metadata: z.record(z.string(), z.unknown()).optional(),
});

export type PublishedLessonContent = z.infer<typeof publishedLessonSchema>;

export const lessonSectionIds = [
  "objectives", "prerequisites", "introduction", "definition", "why-it-matters",
  "concept", "key-terms", "principles", "method", "examples", "comparisons",
  "mistakes", "memory", "placement", "checkpoints", "remediation", "revision",
] as const;

