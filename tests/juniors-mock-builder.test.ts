import { describe, expect, it } from "vitest";
import { buildMockQuestionSet, type MockCandidate } from "@/lib/juniors-mock-builder";

const make = (subject: string, type: "mcq" | "numerical", count: number): MockCandidate[] => Array.from({ length: count }, (_, index) => ({ id: `${subject}-${type}-${index}`, subject, question_type: type }));

describe("buildMockQuestionSet", () => {
  it("builds the exact JEE Main 20 MCQ + 5 numerical pattern per subject", () => {
    const candidates = ["mathematics", "physics", "chemistry"].flatMap((subject) => [...make(subject, "mcq", 20), ...make(subject, "numerical", 5)]);
    const result = buildMockQuestionSet("jee-main", candidates);
    expect(result.shortages).toEqual([]);
    expect(result.questions).toHaveLength(75);
    for (const subject of ["mathematics", "physics", "chemistry"]) {
      expect(result.questions.filter((question) => question.subject === subject && question.question_type === "mcq")).toHaveLength(20);
      expect(result.questions.filter((question) => question.subject === subject && question.question_type === "numerical")).toHaveLength(5);
    }
  });

  it("builds the exact EAPCET 80/40/40 subject allocation", () => {
    const candidates = [...make("mathematics", "mcq", 80), ...make("physics", "mcq", 40), ...make("chemistry", "mcq", 40)];
    expect(buildMockQuestionSet("ap-eapcet", candidates).questions).toHaveLength(160);
    expect(buildMockQuestionSet("tg-eapcet", candidates).questions).toHaveLength(160);
  });

  it("refuses to create a partial or duplicate-filled mock", () => {
    const result = buildMockQuestionSet("jee-main", make("mathematics", "mcq", 20));
    expect(result.questions).toEqual([]);
    expect(result.shortages.length).toBeGreaterThan(0);
  });
});
