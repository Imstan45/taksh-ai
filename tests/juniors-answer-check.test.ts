import { describe, expect, it } from "vitest";
import { isNumericalAnswerCorrect } from "@/lib/juniors-answer-check";

describe("isNumericalAnswerCorrect", () => {
  it("accepts exact integer and decimal representations", () => {
    expect(isNumericalAnswerCorrect("42", 42, 0)).toBe(true);
    expect(isNumericalAnswerCorrect("42.0", 42, 0)).toBe(true);
  });

  it("honours an explicit tolerance", () => {
    expect(isNumericalAnswerCorrect("3.141", 3.14, 0.01)).toBe(true);
    expect(isNumericalAnswerCorrect("3.2", 3.14, 0.01)).toBe(false);
  });

  it("rejects non-finite input", () => {
    expect(isNumericalAnswerCorrect("1e999", 1, 0)).toBe(false);
  });
});
