import { describe, expect, it } from "vitest";
import { authoredCurriculum, buildAuthoredLesson } from "../src/lib/content-factory/authored-curriculum";
import { lessonToCards } from "../src/lib/learning/cards";
import { takshContentSchema } from "../src/lib/content-factory/schemas/taksh-content-schema";
import { SERVICENOW_COURSE, serviceNowCurriculum } from "../src/lib/content-factory/servicenow-curriculum";

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
  it("includes the complete ServiceNow career program",()=>{
    expect(serviceNowCurriculum).toHaveLength(25);
    expect(new Set(serviceNowCurriculum.map(row=>row.module))).toEqual(new Set([
      "Track 1 - ServiceNow ITSM","Track 2 - ServiceNow Development","Track 3 - Prompt Engineering","Track 4 - Capstone Projects","Track 5 - Assessment & Career Readiness",
    ]));
    expect(serviceNowCurriculum.every(row=>row.course===SERVICENOW_COURSE&&row.practical&&row.coverage?.length)).toBe(true);
    expect(serviceNowCurriculum.every(row=>row.detailedSections?.length===3)).toBe(true);
    const foundations=serviceNowCurriculum.find(row=>row.subtopic==="ServiceNow and ITSM Foundations");
    expect(foundations?.keyTerms?.map(item=>item.term)).toEqual(expect.arrayContaining(["ITSM","ITIL","Incident","Service request","Problem","Change","SLA","CI","CMDB"]));
    const detailedLesson=buildAuthoredLesson(foundations!);
    expect(detailedLesson.principles.rules.every(rule=>rule.explanation.length>120&&rule.why_it_works.startsWith("Example:"))).toBe(true);
    expect(lessonToCards(detailedLesson).some(card=>card.id==="terms"&&card.points!.length>=9)).toBe(true);
    const assessment=serviceNowCurriculum.find(row=>row.subtopic==="How You Will Be Assessed");
    expect(assessment?.coverage).toEqual(expect.arrayContaining(["Weekly quizzes - 15%","Hands-on labs - 30%","ServiceNow application - 25%","Final demonstration - 5%"]));
    const outcomes=serviceNowCurriculum.find(row=>row.subtopic==="Career-ready Outcomes");
    expect(outcomes?.coverage).toHaveLength(9);
  });
});
