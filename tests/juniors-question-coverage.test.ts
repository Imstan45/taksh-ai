import { describe, expect, it } from "vitest";
import { auditQuestionCoverage } from "@/lib/juniors-question-coverage";

describe("auditQuestionCoverage", () => {
  it("measures published coverage against every mapped subtopic", () => {
    const audit = auditQuestionCoverage([{ subject: "mathematics", chapter_slug: "algebra", topic: "Quadratic equations", subtopic: "Nature of roots", status: "published" }]);
    expect(audit.total).toBe(440);
    expect(audit.covered).toBe(1);
    expect(audit.missing).toHaveLength(439);
  });

  it("does not count drafts as validated coverage", () => {
    expect(auditQuestionCoverage([{ subject: "mathematics", chapter_slug: "algebra", topic: "Quadratic equations", subtopic: "Nature of roots", status: "draft" }]).covered).toBe(0);
  });
});
