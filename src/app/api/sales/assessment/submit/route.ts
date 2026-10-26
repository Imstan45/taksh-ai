import { z } from "zod";
import { auth } from "@/auth";
import { submitRepAssessment } from "@/lib/sales-logical-assessment";
const schema = z.object({ attemptId: z.string().uuid() });
export async function POST(request: Request) { const session = await auth(); if (!session?.user || session.user.role !== "SALES_REP") return Response.json({ error: "Unauthorized" }, { status: 401 }); const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return Response.json({ error: "Invalid attempt" }, { status: 400 }); const result = await submitRepAssessment(session.user.id, parsed.data.attemptId); if ("error" in result) return Response.json({ error: result.error }, { status: result.status }); return Response.json(result); }
