import { describe, expect, it } from "vitest";
import { authoredCurriculum, buildAuthoredLesson } from "../src/lib/content-factory/authored-curriculum";
import { lessonToCards } from "../src/lib/learning/cards";
import { takshContentSchema } from "../src/lib/content-factory/schemas/taksh-content-schema";

describe("authored placement curriculum",()=>{
  it("provides broad Logical Reasoning and English coverage",()=>{
    const logical=authoredCurriculum.filter(row=>row.course==="Logical Reasoning");
    const english=authoredCurriculum.filter(row=>row.course==="English Proficiency");
    expect(logical.length).toBeGreaterThanOrEqual(35);
    expect(english.length).toBeGreaterThanOrEqual(30);
    expect(new Set(logical.map(row=>row.topic)).size).toBeGreaterThanOrEqual(15);
    expect(new Set(english.map(row=>row.topic)).size).toBeGreaterThanOrEqual(15);
  });
  it("has unique curriculum identities",()=>{
    const keys=authoredCurriculum.map(row=>[row.course,row.module,row.topic,row.subtopic].join("::"));
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("builds canonical lessons that pass factory validation",()=>{
    for(const source of authoredCurriculum)expect(takshContentSchema.safeParse(buildAuthoredLesson(source)).success).toBe(true);
  });
  it("turns every lesson into concise progressive cards",()=>{
    for(const source of authoredCurriculum){const cards=lessonToCards(buildAuthoredLesson(source));expect(cards.length).toBeGreaterThanOrEqual(8);expect(cards.at(-1)?.type).toBe("revision");expect(cards.some(card=>card.type==="checkpoint")).toBe(true)}
  });
});
