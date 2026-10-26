import { auth } from "@/auth";
import { LogicalReasoningAssessment } from "@/components/sales/logical-reasoning-assessment";
import { SalesPortalShell } from "@/components/sales/sales-portal-shell";
import { redirect } from "next/navigation";
export default async function SalesAssessmentPage() { const session = await auth(); if (!session?.user || session.user.role !== "SALES_REP") redirect("/sales/login"); if (session.user.accountStatus !== "active") redirect("/sales/pending"); return <SalesPortalShell><main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12"><LogicalReasoningAssessment/></main></SalesPortalShell>; }
