import { describe, expect, it } from "vitest";
import { calculateJuniorsScore } from "@/lib/juniors-scoring";

describe("calculateJuniorsScore", () => {
  it("applies JEE Main negative marking", () => {
    expect(calculateJuniorsScore({ correct: 50, incorrect: 15, unanswered: 10, exam: "jee-main", sessionType: "mock" })).toEqual({ marks: 185, maximum: 300, attempted: 65, accuracy: 77 });
  });

  it("does not deduct marks for AP EAPCET", () => {
    expect(calculateJuniorsScore({ correct: 100, incorrect: 40, unanswered: 20, exam: "ap-eapcet", sessionType: "mock" }).marks).toBe(100);
  });

  it("keeps practice scoring question based", () => {
    expect(calculateJuniorsScore({ correct: 4, incorrect: 2, unanswered: 3, exam: "jee-main", sessionType: "practice" }).marks).toBe(4);
  });
});
