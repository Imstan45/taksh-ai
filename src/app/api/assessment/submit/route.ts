import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateAnswers, verifyAssessmentTicket } from "@/lib/assessment-security";
import { mainEnvironment } from "@/lib/env";

const submissionSchema = z.object({
  attemptTicket: z.string().min(40),
  startedAt: z.string().datetime(),
  answers: z.array(z.object({ questionId: z.string().uuid(), selectedAnswer: z.enum(["A", "B", "C", "D"]).optional() })).max(100),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = submissionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid submission." }, { status: 400 });
  const ticket = verifyAssessmentTicket(parsed.data.attemptTicket, session.user.id, mainEnvironment().AUTH_SECRET);
  if (!ticket) return Response.json({ error: "Assessment attempt is invalid or expired." }, { status: 410 });
  const answerIds = new Set(parsed.data.answers.map((answer) => answer.questionId));
  if ([...answerIds].some((id) => !ticket.questionIds.includes(id))) return Response.json({ error: "Submission contains an unauthorized question." }, { status: 403 });
  try {
    return await prisma.$transaction(async tx => {
      const sessions = await tx.$queryRaw<Array<{ started_at: Date }>>`
        SELECT started_at FROM public.aptitude_assessment_sessions
        WHERE id=${ticket.attemptId}::uuid AND student_id=${session.user.id}::uuid
          AND submitted_at IS NULL AND expires_at>=now() FOR UPDATE
      `;
      if (!sessions[0]) return Response.json({ error: "Assessment attempt is already submitted or expired." }, { status: 409 });
      const keys = await tx.$queryRaw<Array<{ id: string; correctAnswer: string; explanation: string | null }>>`
        SELECT id,correct_answer AS "correctAnswer",explanation FROM public.question_bank
        WHERE id=ANY(${ticket.questionIds}::uuid[]) AND status='active'
      `;
      if (keys.length !== ticket.questionIds.length) return Response.json({ error: "Assessment questions changed. Start a new attempt." }, { status: 409 });
      const result = evaluateAnswers(keys, parsed.data.answers);
      const timeUsed = Math.max(0, Math.min(1800, Math.round((Date.now()-sessions[0].started_at.getTime())/1000)));
      await tx.$executeRaw`UPDATE public.aptitude_assessment_sessions SET submitted_at=now() WHERE id=${ticket.attemptId}::uuid`;
      const inserted = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO public.aptitude_assessment_attempts(student_id,question_ids,responses,score,max_score,percentage,started_at,time_used_seconds)
        VALUES(${session.user.id}::uuid,${ticket.questionIds}::uuid[],${JSON.stringify(result.results)}::jsonb,
          ${result.score},${result.maxScore},${result.percentage},${sessions[0].started_at},${timeUsed}) RETURNING id
      `;
      await tx.$executeRaw`UPDATE public.sales_referral_attributions SET assessment_completed_at=coalesce(assessment_completed_at,now()),updated_at=now() WHERE registered_user_id=${session.user.id}::uuid AND validity_status<>'invalid'`;
      return Response.json({ attemptId: inserted[0].id, ...result });
    });
  } catch (error) {
    console.error("Aptitude submission failed", error);
    return Response.json({ error: "Unable to submit the assessment." }, { status: 500 });
  }
}
