import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20261027090000_sales_logical_reasoning_assessment.sql", "utf8");
const assessment = readFileSync("src/lib/sales-logical-assessment.ts", "utf8");
const startRoute = readFileSync("src/app/api/sales/assessment/route.ts", "utf8");
const answerRoute = readFileSync("src/app/api/sales/assessment/answer/route.ts", "utf8");
const submitRoute = readFileSync("src/app/api/sales/assessment/submit/route.ts", "utf8");
const exportRoute = readFileSync("src/app/api/super-admin/assessment-results/export/route.ts", "utf8");

describe("Sales Logical Reasoning Assessment", () => {
  it("creates a constrained one-attempt, ten-question immutable model", () => {
    expect(migration).toContain("sales_rep_id uuid not null unique");
    expect(migration).toContain("position between 1 and 10");
    expect(migration).toContain("question_snapshot jsonb not null");
    expect(migration).toContain("Logical assessment seed is incomplete");
    expect(migration).toContain("count(*) from public.sales_logical_questions where approved) < 100");
  });
  it("uses server-side active-status enforcement, assignment persistence, and locked scoring", () => {
    expect(assessment).toContain("rep.status !== \"active\"");
    expect(assessment).toContain("for update");
    expect(assessment).toContain("status='IN_PROGRESS'");
    expect(assessment).toContain("status='COMPLETED'");
    expect(assessment).toContain("item.question_snapshot->>'correct_option'");
  });
  it("does not expose answer keys through Sales Rep APIs", () => {
    expect(startRoute).toContain("startRepAssessment");
    expect(answerRoute).toContain("saveRepAssessmentAnswer");
    expect(submitRoute).toContain("submitRepAssessment");
    expect(assessment).not.toContain("correct_option:");
  });
  it("restricts exports to Super Admins and retains blank unattempted scores", () => {
    expect(exportRoute).toContain('session.user.role!=="SUPER_ADMIN"');
    expect(exportRoute).toContain('row.assessment_status==="COMPLETED"?row.score:""');
  });
});
