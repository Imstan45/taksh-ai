import { describe, expect, it } from "vitest";
import { buildAuthoredLesson } from "../src/lib/content-factory/authored-curriculum";
import { launchCatalogueCurriculum, launchCourses } from "../src/lib/content-factory/launch-catalogue";
import { takshContentSchema } from "../src/lib/content-factory/schemas/taksh-content-schema";

describe("launch course catalogue", () => {
  it("defines eleven unique, tagged launch courses with eight modules each", () => {
    expect(launchCourses).toHaveLength(11);
    expect(new Set(launchCourses.map((course) => course.code)).size).toBe(11);
    expect(new Set(launchCourses.map((course) => course.slug)).size).toBe(11);
    for (const course of launchCourses) {
      expect(course.skills.length).toBeGreaterThanOrEqual(5);
      expect(course.modules).toHaveLength(8);
      expect(course.modules.every((module) => module.skills.length >= 2)).toBe(true);
    }
  });

  it("provides 25 meaningful lessons and nine assessments per course", () => {
    expect(launchCatalogueCurriculum).toHaveLength(275);
    for (const course of launchCourses) {
      const lessons = launchCatalogueCurriculum.filter((lesson) => lesson.course === course.title);
      const moduleChecks = lessons.filter((lesson) => lesson.topic === "Assess");
      const finalAssessments = lessons.filter((lesson) => lesson.topic === "Final assessment");
      expect(lessons).toHaveLength(25);
      expect(moduleChecks).toHaveLength(8);
      expect(finalAssessments).toHaveLength(1);
      expect(moduleChecks.every((lesson) => lesson.practiceQuestions?.length === 5)).toBe(true);
      expect(finalAssessments[0].practiceQuestions).toHaveLength(5);
      for (const [index, module] of course.modules.entries()) {
        const moduleLessons = lessons.filter((lesson) => lesson.module === `Module ${index + 1} · ${module.title}`);
        expect(moduleLessons).toHaveLength(index === 7 ? 4 : 3);
      }
    }
  });

  it("builds every lesson into valid, substantial student content", () => {
    for (const source of launchCatalogueCurriculum) {
      const lesson = buildAuthoredLesson(source);
      expect(takshContentSchema.safeParse(lesson).success).toBe(true);
      expect(lesson.core_content.concept_explanation.length).toBeGreaterThan(80);
      expect(lesson.principles.rules).toHaveLength(3);
      expect(lesson.application_method.steps.length).toBeGreaterThanOrEqual(3);
      expect(lesson.worked_examples.length).toBeGreaterThanOrEqual(1);
      expect(lesson.checkpoint_questions.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps every curriculum identity unique for idempotent publication", () => {
    const identities = launchCatalogueCurriculum.map((lesson) =>
      [lesson.course, lesson.module, lesson.topic, lesson.subtopic].join("::"),
    );
    expect(new Set(identities).size).toBe(identities.length);
  });
});
