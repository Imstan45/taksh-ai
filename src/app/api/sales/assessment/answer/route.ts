import { z } from "zod";
import { auth } from "@/auth";
import { saveRepAssessmentAnswer } from "@/lib/sales-logical-assessment";
const schema = z.object({ attemptId: z.string().uuid(), questionId: z.string().uuid(), answer: z.enum(["A","B","C","D"]) });
export async function PATCH(request: Request) { const session = await auth(); if (!session?.user || session.user.role !== "SALES_REP") return Response.json({ error: "Unauthorized" }, { status: 401 }); const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return Response.json({ error: "Invalid answer" }, { status: 400 }); const saved = await saveRepAssessmentAnswer(session.user.id, parsed.data.attemptId, parsed.data.questionId, parsed.data.answer); return saved ? Response.json({ saved: true }) : Response.json({ error: "Attempt is locked or unavailable." }, { status: 409 }); }
