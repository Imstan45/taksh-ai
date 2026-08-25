import { describe,expect,it } from "vitest";
import { authoredCurriculum,buildAuthoredLesson } from "@/lib/content-factory/authored-curriculum";
const CAREER_STARTER_COURSES=["Python Fundamentals","Prompt Engineering Fundamentals","UI/UX Fundamentals"] as const;

describe("Career Starter curriculum",()=>{
  it.each(CAREER_STARTER_COURSES.slice(0,3))("publishes exactly 20 detailed lessons for %s",course=>{
    const lessons=authoredCurriculum.filter(x=>x.course===course).map(buildAuthoredLesson);
    expect(lessons).toHaveLength(20);
    for(const lesson of lessons){
      expect(lesson.core_content.concept_explanation.length).toBeGreaterThan(250);
      expect(lesson.worked_examples).toHaveLength(1);
      expect(lesson.common_mistakes.length).toBeGreaterThan(0);
      expect(lesson.checkpoint_questions.length).toBeGreaterThanOrEqual(3);
      expect(lesson.revision_asset.key_points.length).toBeGreaterThanOrEqual(4);
    }
  });
  it("keeps every lesson identity unique",()=>{
    const lessons=authoredCurriculum.filter(x=>CAREER_STARTER_COURSES.slice(0,3).includes(x.course as never)).map(buildAuthoredLesson);
    expect(new Set(lessons.map(x=>x.identity.slug)).size).toBe(60);
  });
});
