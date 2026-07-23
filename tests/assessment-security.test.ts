import { describe, expect, it } from "vitest";
import { createAssessmentTicket, evaluateAnswers, verifyAssessmentTicket } from "@/lib/assessment-security";
import { readFileSync } from "node:fs";

describe("secure assessment evaluation", () => {
  it("binds tickets to a student and expiry", () => {
    const ticket = createAssessmentTicket("student-1", ["q1"], "a-secret-that-is-long-enough", 2000);
    expect(verifyAssessmentTicket(ticket, "student-1", "a-secret-that-is-long-enough", 1000)?.questionIds).toEqual(["q1"]);
    expect(verifyAssessmentTicket(ticket, "student-2", "a-secret-that-is-long-enough", 1000)).toBeNull();
    expect(verifyAssessmentTicket(ticket, "student-1", "a-secret-that-is-long-enough", 3000)).toBeNull();
  });
  it("scores answers only on the server result", () => {
    const result = evaluateAnswers([
      { id: "q1", correctAnswer: "A", explanation: "Because A." },
      { id: "q2", correctAnswer: "C", explanation: "Because C." },
    ], [{ questionId: "q1", selectedAnswer: "A" }, { questionId: "q2", selectedAnswer: "B" }]);
    expect(result).toMatchObject({ score: 1, maxScore: 2, percentage: 50 });
  });
  it("does not expose answer fields in the question-delivery response", () => {
    const source = readFileSync("src/app/api/assessment/questions/route.ts", "utf8");
    const responseMapping = source.slice(source.indexOf("return NextResponse.json"));
    expect(responseMapping).not.toContain("correctAnswer:");
    expect(responseMapping).not.toContain("explanation:");
  });
});
