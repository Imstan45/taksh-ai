import { z } from "zod";
import { auth } from "@/auth";
import { getRepAssessment, startRepAssessment } from "@/lib/sales-logical-assessment";

export async function GET() { const session = await auth(); if (!session?.user || session.user.role !== "SALES_REP") return Response.json({ error: "Unauthorized" }, { status: 401 }); const assessment = await getRepAssessment(session.user.id); return Response.json({ assessment, eligible: session.user.accountStatus === "active" }); }
export async function POST(request: Request) { const session = await auth(); if (!session?.user || session.user.role !== "SALES_REP") return Response.json({ error: "Unauthorized" }, { status: 401 }); if (!z.object({}).safeParse(await request.json().catch(() => ({}))).success) return Response.json({ error: "Invalid request" }, { status: 400 }); const result = await startRepAssessment(session.user.id); if ("ineligible" in result && result.ineligible) return Response.json({ error: "Only currently active Sales Reps are eligible.", ineligible: true }, { status: 403 }); return Response.json({ assessment: result.attempt }, { status: 201 }); }
