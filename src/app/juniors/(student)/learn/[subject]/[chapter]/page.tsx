import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { CheckCircle2, Clock3 } from "lucide-react";
import { findJuniorsChapter } from "@/lib/juniors-curriculum";
import { LessonCompleteButton } from "@/components/juniors/lesson-complete-button";
import { getJuniorsProgress } from "@/lib/juniors-data";

export default async function ChapterPage({params}:{params:Promise<{subject:string;chapter:string}>}){
  const {subject:subjectSlug,chapter:chapterSlug}=await params;
  const found=findJuniorsChapter(subjectSlug,chapterSlug); if(!found)notFound();
  const session=await auth(); const progress=await getJuniorsProgress(session!.user.id); const completed=new Set(progress.filter(p=>p.status==="completed").map(p=>p.lesson_slug));
  return <div className="js-content"><header className="js-page-head"><span className="j-eyebrow">{found.subject.title} · Curriculum v1.0</span><h1>{found.chapter.title}</h1><p>{found.chapter.description}</p></header>{found.chapter.lessons.length ? found.chapter.lessons.map(lesson=><article className="js-lesson" key={lesson.slug}><header><div><span className="j-pill">Representative original lesson</span><h2>{lesson.title}</h2></div><span><Clock3/> {lesson.minutes} min</span></header><section><h3>Learning objective</h3><p>{lesson.objective}</p></section><section><h3>Concept</h3><p>{lesson.explanation}</p></section><section className="js-example"><h3>Worked example</h3><p>{lesson.example}</p></section><section className="js-check"><CheckCircle2/><div><h3>Quick checkpoint</h3><p>{lesson.checkpoint}</p><details><summary>Reveal answer</summary><p>{lesson.answer}</p></details></div></section><LessonCompleteButton lessonSlug={lesson.slug} initialComplete={completed.has(lesson.slug)}/></article>) : <div className="js-empty"><h2>Lessons are being reviewed</h2><p>This chapter is visible in the approved curriculum map. Learning content will appear here after review; no placeholder lesson has been fabricated.</p></div>}</div>;
}
