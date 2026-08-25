import { buildAuthoredLesson } from "../src/lib/content-factory/authored-curriculum";
import { serviceNowCurriculum } from "../src/lib/content-factory/servicenow-curriculum";

console.log(JSON.stringify(serviceNowCurriculum.map((row, index) => {
  const content = buildAuthoredLesson(row);
  return {
    course: row.course, module: row.module, topic: row.topic, subtopic: row.subtopic,
    display_order: index + 1, title: content.identity.title, slug: content.identity.slug,
    difficulty: content.identity.difficulty, content,
  };
})));
