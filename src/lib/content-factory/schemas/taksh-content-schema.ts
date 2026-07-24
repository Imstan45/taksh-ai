import { z } from "zod";

const nonEmpty = z.string().min(1);
const numberedReasoningStep = z.object({
  step_number: z.number().int().positive(),
  explanation: nonEmpty,
});

export const takshContentSchema = z.object({
  identity: z.object({
    course: nonEmpty,
    module: nonEmpty,
    topic: nonEmpty,
    subtopic: nonEmpty,
    title: nonEmpty,
    slug: nonEmpty,
    target_audience: nonEmpty,
    difficulty: nonEmpty,
    explanation_depth: nonEmpty,
    exam_context: z.string(),
  }),
  learning_design: z.object({
    learning_objectives: z.array(z.object({
      objective_id: nonEmpty,
      objective: nonEmpty,
      skill_level: z.enum(["identify", "understand", "apply", "analyse", "evaluate"]),
    })).min(1),
    prerequisites: z.array(z.object({
      title: nonEmpty,
      description: nonEmpty,
      importance: nonEmpty,
    })),
    estimated_learning_minutes: z.number().int().nonnegative(),
  }),
  core_content: z.object({
    introduction: nonEmpty,
    canonical_definition: nonEmpty,
    why_it_matters: nonEmpty,
    concept_explanation: nonEmpty,
    key_terms: z.array(z.object({ term: nonEmpty, definition: nonEmpty, example: z.string() })),
  }),
  principles: z.object({
    rules: z.array(z.object({
      rule_number: z.number().int().positive(),
      title: nonEmpty,
      explanation: nonEmpty,
      why_it_works: nonEmpty,
      exception: z.string().nullable(),
    })),
    important_distinctions: z.array(z.object({
      concept_a: nonEmpty,
      concept_b: nonEmpty,
      difference: nonEmpty,
      example: z.string(),
    })),
  }),
  application_method: z.object({
    method_title: z.string(),
    method_overview: z.string(),
    steps: z.array(z.object({
      step_number: z.number().int().positive(),
      title: nonEmpty,
      instruction: nonEmpty,
      reason: nonEmpty,
      student_check: nonEmpty,
    })),
    use_when: z.string(),
    do_not_use_when: z.string(),
    faster_method: z.string().nullable(),
  }),
  worked_examples: z.array(z.object({
    example_number: z.number().int().positive(),
    title: nonEmpty,
    difficulty: nonEmpty,
    question_or_scenario: nonEmpty,
    given_information: z.array(z.string()),
    reasoning_steps: z.array(numberedReasoningStep).min(1),
    final_answer: nonEmpty,
    why_the_answer_is_correct: nonEmpty,
    learning_takeaway: nonEmpty,
  })).min(1),
  usage_comparisons: z.array(z.object({
    correct_example: nonEmpty,
    incorrect_example: nonEmpty,
    explanation: nonEmpty,
  })),
  common_mistakes: z.array(z.object({
    mistake_number: z.number().int().positive(),
    title: nonEmpty,
    incorrect_approach: nonEmpty,
    why_students_make_it: nonEmpty,
    why_it_is_wrong: nonEmpty,
    correction: nonEmpty,
    prevention_tip: nonEmpty,
  })).min(1),
  memory_support: z.object({
    memory_aid: z.string(),
    mental_model: z.string(),
    quick_recall_note: z.string(),
  }),
  placement_support: z.object({
    question_identification_signals: z.array(z.string()),
    time_management_tip: z.string(),
    exam_traps: z.array(z.string()),
    interview_relevance: z.string(),
  }),
  checkpoint_questions: z.array(z.object({
    question_number: z.number().int().positive(),
    type: z.enum(["recognition", "application", "error_identification", "reasoning", "conceptual"]),
    question: nonEmpty,
    answer: nonEmpty,
    explanation: nonEmpty,
    skill_tested: nonEmpty,
    difficulty: nonEmpty,
  })),
  remediation: z.object({
    likely_confusion: nonEmpty,
    simplified_explanation: nonEmpty,
    simple_example: nonEmpty,
    prerequisite_to_review: nonEmpty,
    next_recommended_step: nonEmpty,
  }),
  revision_asset: z.object({
    summary: nonEmpty,
    key_points: z.array(z.string()).min(1),
    one_minute_revision: nonEmpty,
    final_checklist: z.array(z.string()).min(1),
  }),
  quality_metadata: z.object({
    content_origin: z.literal("original_ai_draft"),
    review_status: z.literal("pending_human_review"),
    copyright_review_status: z.literal("pending"),
    prompt_version: z.literal("taksh-content-master-v1"),
    generated_by: z.literal("gemini"),
    sections_not_applicable: z.array(z.string()),
  }),
});

export type TakshContent = z.infer<typeof takshContentSchema>;

