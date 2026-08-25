import type { PublishedLessonContent } from "@/lib/learning/schema";

export type LessonCard = {
  id: string;
  type: "goal" | "concept" | "rule" | "method" | "example" | "mistake" | "memory" | "checkpoint" | "revision";
  eyebrow: string;
  title: string;
  body: string;
  points?: string[];
  answer?: string;
  explanation?: string;
  prompt?: string;
};

const clean = (values: Array<string | null | undefined>) => values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));

export function lessonToCards(content: PublishedLessonContent): LessonCard[] {
  const cards: LessonCard[] = [];
  cards.push({ id: "goal", type: "goal", eyebrow: "Start here", title: "What you will learn", body: content.core_content.introduction, points: content.learning_design.learning_objectives.map((item) => item.objective) });
  cards.push({ id: "concept", type: "concept", eyebrow: "Core idea", title: content.identity.title, body: content.core_content.canonical_definition, points: clean([content.core_content.why_it_matters, content.core_content.concept_explanation]) });
  if(content.core_content.key_terms.length)cards.push({id:"terms",type:"rule",eyebrow:"Plain-language glossary",title:"Key terms and meanings",body:"Learn these terms before working through the platform workflow.",points:content.core_content.key_terms.map(item=>`${item.term}: ${item.definition}${item.example?` Example: ${item.example}`:""}`)});
  content.principles.rules.forEach((rule) => cards.push({ id: `rule-${rule.rule_number}`, type: "rule", eyebrow: `Rule ${rule.rule_number}`, title: rule.title, body: rule.explanation, points: clean([rule.why_it_works && `Why it works: ${rule.why_it_works}`, rule.exception && `Exception: ${rule.exception}`]) }));
  if (content.application_method.steps.length) cards.push({ id: "method", type: "method", eyebrow: "Method", title: content.application_method.method_title || "How to solve it", body: content.application_method.method_overview, points: content.application_method.steps.map((step) => `${step.step_number}. ${step.title}: ${step.instruction}`) });
  content.worked_examples.forEach((example) => cards.push({ id: `example-${example.example_number}`, type: "example", eyebrow: `Worked example ${example.example_number}`, title: example.title, body: example.question_or_scenario, points: example.reasoning_steps.map((step) => `${step.step_number}. ${step.explanation}`), answer: example.final_answer, explanation: example.learning_takeaway }));
  content.common_mistakes.slice(0, 3).forEach((mistake) => cards.push({ id: `mistake-${mistake.mistake_number}`, type: "mistake", eyebrow: "Avoid this", title: mistake.title, body: mistake.incorrect_approach, points: clean([mistake.why_it_is_wrong, `Better approach: ${mistake.correction}`, mistake.prevention_tip]) }));
  cards.push({ id: "memory", type: "memory", eyebrow: "Remember", title: "Make it stick", body: content.memory_support.memory_aid, points: clean([content.memory_support.mental_model, content.memory_support.quick_recall_note, content.placement_support.time_management_tip]) });
  content.checkpoint_questions.forEach((question) => cards.push({ id: `checkpoint-${question.question_number}`, type: "checkpoint", eyebrow: `Quick check ${question.question_number}`, title: question.skill_tested, body: question.question, prompt: "Think of your answer, then reveal the solution.", answer: question.answer, explanation: question.explanation }));
  cards.push({ id: "revision", type: "revision", eyebrow: "One-minute review", title: "What to remember", body: content.revision_asset.summary, points: content.revision_asset.key_points });
  return cards.filter((card) => card.body || card.points?.length);
}
