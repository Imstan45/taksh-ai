import { z } from "zod";
import { generateGeminiText } from "@/lib/ai/gemini";

export const diagnosticCategories = ["quantitative_aptitude","logical_reasoning","english_verbal","database_technical"] as const;
const generatedQuestionSchema = z.object({
  question: z.string().min(60).max(1200),
  options: z.array(z.string().min(1).max(500)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(80).max(1500),
  subcategory: z.string().min(3).max(100),
  competency: z.enum(["multi_step_reasoning","application_and_edge_cases","inference","formal_logic"]),
  estimatedTimeSeconds: z.number().int().min(90).max(180),
});
const batchSchema=z.object({questions:z.array(generatedQuestionSchema).length(25)});
const criticSchema=z.object({reviews:z.array(z.object({index:z.number().int().min(0).max(24),valid:z.boolean(),reason:z.string(),provenCorrectIndex:z.number().int().min(0).max(3)})).length(25)});
export type ExtremeQuestion=z.infer<typeof generatedQuestionSchema>&{category:typeof diagnosticCategories[number]};

function normalized(value:string){return value.toLowerCase().replace(/\d+(?:\.\d+)?/g,"#").replace(/[^a-z# ]/g," ").replace(/\s+/g," ").trim()}
function tokens(value:string){return new Set(normalized(value).split(" ").filter(token=>token.length>2))}
function similarity(left:string,right:string){const a=tokens(left),b=tokens(right),intersection=[...a].filter(token=>b.has(token)).length;return intersection/Math.max(1,a.size+b.size-intersection)}

export function validateExtremeQuestions(candidate:ExtremeQuestion[],existingTexts:string[]=[]){
  if(candidate.length!==200)throw new Error(`Expected 200 questions, received ${candidate.length}.`);
  for(const category of diagnosticCategories)if(candidate.filter(item=>item.category===category).length!==50)throw new Error(`${category} must contain exactly 50 questions.`);
  const all=[...existingTexts.map(question=>({question,external:true})),...candidate.map(question=>({question:question.question,external:false}))];
  for(const [index,item] of candidate.entries()){
    const options=item.options.map(normalized);if(new Set(options).size!==4)throw new Error(`Question ${index+1} has duplicate answer options.`);
    if(!item.explanation.toLowerCase().includes(item.options[item.correctIndex].toLowerCase().slice(0,Math.min(20,item.options[item.correctIndex].length))))throw new Error(`Question ${index+1} explanation does not identify its answer.`);
  }
  for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)if((!all[i].external||!all[j].external)&&similarity(all[i].question,all[j].question)>=.86)throw new Error(`Near-duplicate questions detected: "${all[i].question.slice(0,80)}" and "${all[j].question.slice(0,80)}".`);
  return candidate;
}

const system=`You are a senior assessment author and psychometric reviewer. Produce original, academically defensible MCQs for a high-stakes graduate placement diagnostic. Difficulty must be EXTREME because each item requires multi-step reasoning, application, inference, edge-case analysis, or combining concepts. Difficulty must never come from trivia, missing information, deceptive wording, or excessive arithmetic. Each item must have exactly one defensible answer. Distractors must be plausible but demonstrably wrong. Explanations must prove the answer and rule out the closest distractor. Never reuse a question structure with only names or numbers changed. Return JSON only.`;
function categoryGuidance(category:string){return category==="quantitative_aptitude"?"Use diverse applied quantitative domains: rates, constraints, probability, data interpretation, mixtures, optimization, weighted change, combinatorics, and financial reasoning. Keep arithmetic feasible without a calculator.":category==="logical_reasoning"?"Use diverse constraint, conditional, causal, scheduling, set, graph, counterexample, ordering, and argument problems. Every arrangement must be fully determined by stated facts.":category==="english_verbal"?"Use original short passages and professional scenarios testing inference, argument structure, scope, assumptions, ambiguity resolution, editing, and precise meaning. Do not test obscure vocabulary.":"Use language-neutral software and database scenarios covering SQL, transactions, concurrency, security, networking, algorithms, APIs, distributed systems, testing, cloud and debugging. Include all code/schema facts needed in the question."}

async function generateBatch(category:ExtremeQuestion["category"],batch:number,avoid:string[]){
  for(let attempt=1;attempt<=3;attempt++){
    const prompt=`Create exactly 25 independent ${category} questions for batch ${batch}. ${categoryGuidance(category)} Use at least 12 distinct subcategories in this batch. Avoid these prior question concepts and structures:\n${avoid.slice(-80).map((q,i)=>`${i+1}. ${q}`).join("\n")}\nReturn {"questions":[{"question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"...","subcategory":"...","competency":"multi_step_reasoning|application_and_edge_cases|inference|formal_logic","estimatedTimeSeconds":150}]}.`;
    const generated=await generateGeminiText({systemInstruction:system,prompt,json:true});
    const parsed=batchSchema.safeParse(JSON.parse(generated.text));if(!parsed.success)continue;
    const critic=await generateGeminiText({systemInstruction:"Act as an adversarial assessment validator. Independently solve every question. A question is valid only if all information is present, exactly one option is defensibly correct, the supplied answer is correct, the explanation proves it, distractors are definitely wrong, wording is unambiguous, and difficulty is genuinely exceptional without trivia or tricks. Return JSON only.",prompt:`Review these 25 indexed questions:\n${JSON.stringify(parsed.data.questions.map((question,index)=>({index,...question})))}\nReturn {"reviews":[{"index":0,"valid":true,"reason":"...","provenCorrectIndex":0}]}.`,json:true});
    const reviewed=criticSchema.safeParse(JSON.parse(critic.text));if(!reviewed.success)continue;
    if(reviewed.data.reviews.every((review,index)=>review.index===index&&review.valid&&review.provenCorrectIndex===parsed.data.questions[index].correctIndex))return parsed.data.questions.map(question=>({...question,category}));
  }
  throw new Error(`Gemini could not produce a fully validated ${category} batch ${batch} after three attempts.`);
}

export async function generateValidatedExtremeBank(existingTexts:string[]){
  const groups=await Promise.all(diagnosticCategories.map(async category=>{const categoryQuestions:ExtremeQuestion[]=[];for(let batch=1;batch<=2;batch++)categoryQuestions.push(...await generateBatch(category,batch,[...existingTexts,...categoryQuestions.map(item=>item.question)]));return categoryQuestions}));
  const result=groups.flat();
  return validateExtremeQuestions(result,existingTexts);
}
