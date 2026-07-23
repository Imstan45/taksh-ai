import { createHmac, timingSafeEqual } from "node:crypto";

export type StudentAnswer = { questionId: string; selectedAnswer?: string };
export type QuestionKey = { id: string; correctAnswer: string; explanation: string | null; points?: number };

export function createAssessmentTicket(studentId: string, questionIds: string[], secret: string, expiresAt: number) {
  const payload = Buffer.from(JSON.stringify({ studentId, questionIds, expiresAt })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAssessmentTicket(ticket: string, studentId: string, secret: string, now = Date.now()) {
  const [payload, signature] = ticket.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret).update(payload).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as { studentId: string; questionIds: string[]; expiresAt: number };
  if (parsed.studentId !== studentId || parsed.expiresAt < now || !Array.isArray(parsed.questionIds)) return null;
  return parsed;
}

export function evaluateAnswers(keys: QuestionKey[], answers: StudentAnswer[]) {
  const submitted = new Map(answers.map((answer) => [answer.questionId, answer.selectedAnswer?.trim().toUpperCase() ?? null]));
  const results = keys.map((key) => {
    const selectedAnswer = submitted.get(key.id) ?? null;
    const correctAnswer = key.correctAnswer.trim().toUpperCase();
    const correct = selectedAnswer === correctAnswer;
    return { questionId: key.id, selectedAnswer, correctAnswer, explanation: key.explanation, correct, pointsAwarded: correct ? (key.points ?? 1) : 0, maxPoints: key.points ?? 1 };
  });
  const score = results.reduce((total,result)=>total+result.pointsAwarded,0);
  const maxScore = results.reduce((total,result)=>total+result.maxPoints,0);
  return { score, maxScore, percentage: maxScore ? Math.round(score / maxScore * 10000) / 100 : 0, results };
}
