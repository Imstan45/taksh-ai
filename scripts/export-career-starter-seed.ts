import { buildAuthoredLesson } from "../src/lib/content-factory/authored-curriculum";
import { careerStarterCurriculum } from "../src/lib/content-factory/career-starter-curriculum";
const start=Math.max(0,Number(process.argv[2]??0));
const count=Math.min(10,Math.max(1,Number(process.argv[3]??10)));
console.log(JSON.stringify(careerStarterCurriculum.slice(start,start+count).map((row,index)=>({
  course:row.course,module:row.module,topic:row.topic,subtopic:row.subtopic,display_order:(start+index)%20+1,
  title:row.subtopic,slug:buildAuthoredLesson(row).identity.slug,difficulty:row.difficulty??"Beginner",content:buildAuthoredLesson(row)
}))));
