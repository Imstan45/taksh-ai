import { describe, expect, it } from "vitest";
import { courseAudience, institutionCanAccessCourse } from "@/lib/institution-content";

describe("institution content eligibility", () => {
  it("routes entrance preparation to schools", () => {
    for (const course of ["EAPCET", "JEE Main", "JEE Advanced"]) expect(courseAudience(course)).toBe("school");
    expect(institutionCanAccessCourse("college", "JEE Advanced")).toBe(false);
  });

  it("routes graduation skills to colleges", () => {
    for (const course of ["Logical Reasoning", "English", "Verbal Ability"]) expect(courseAudience(course)).toBe("college");
    expect(institutionCanAccessCourse("school", "Logical Reasoning")).toBe(false);
  });

  it("keeps uncategorized courses available to both", () => {
    expect(institutionCanAccessCourse("school", "Mathematics")).toBe(true);
    expect(institutionCanAccessCourse("college", "Mathematics")).toBe(true);
  });
});
