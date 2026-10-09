import {z} from "zod";

export const setupSchema=z.object({
  targetRole:z.string().trim().min(2).max(120), mode:z.enum(["practice","real"]),
  interviewer:z.enum(["alex","maya"]), difficulty:z.enum(["beginner","intermediate","advanced"]),
  resumeId:z.string().uuid().nullable().optional(),
});
export const engineOutputSchema=z.object({
  reply:z.string().min(1).max(1600), stage:z.enum(["introduction","background","technical","behavioral","candidate_questions","closing"]),
  shouldComplete:z.boolean(), questionType:z.string().max(80),
});
export const reportSchema=z.object({
  overallScore:z.number().int().min(0).max(100),
  scores:z.object({communication:z.number().int().min(0).max(100),technical:z.number().int().min(0).max(100),problemSolving:z.number().int().min(0).max(100),confidence:z.number().int().min(0).max(100)}),
  strengths:z.array(z.string().max(300)).max(5), improvements:z.array(z.string().max(300)).max(5),
  evidence:z.array(z.object({observation:z.string().max(400),quote:z.string().max(240)})).max(8), summary:z.string().max(1200),
});
export type InterviewSetup=z.infer<typeof setupSchema>;
