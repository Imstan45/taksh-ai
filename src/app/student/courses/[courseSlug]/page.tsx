import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { getAssignedCourseLessons } from "@/lib/learning/service";
import { CheckCircle2, Circle, LockKeyhole, PlayCircle } from "lucide-react";

export default async function CoursePage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const course = await getAssignedCourseLessons(session.user.id, (await params).courseSlug);
  if (!course) notFound();
  const grouped = Map.groupBy(course.lessons, (lesson) => lesson.module);

  return (
    <DashboardShell {...session.user}>
      <div className="student-page-heading"><div><p className="eyebrow">Assigned course</p><h2>{course.course}</h2><p>Complete each published subtopic to unlock the next lesson.</p></div><Link className="btn-ghost border border-white/10" href="/student/courses">All courses</Link></div>
      {course.lessons.length === 0 ? <div className="learning-empty"><h3>Content is being prepared for this lesson.</h3></div> :
      <div className="module-stack">{[...grouped.entries()].map(([module, lessons], moduleIndex) => <section className="module-card" key={module}><div className="module-heading"><span>{String(moduleIndex + 1).padStart(2, "0")}</span><div><small>Module</small><h3>{module}</h3></div></div><div className="topic-stack">{[...Map.groupBy(lessons, (lesson) => lesson.topic).entries()].map(([topic, topicLessons]) => <div className="topic-group" key={topic}><h4>{topic}</h4>{topicLessons.map((lesson) => {
        const completed = lesson.progress_status === "completed";
        const Icon = lesson.locked ? LockKeyhole : completed ? CheckCircle2 : lesson.progress_status === "in_progress" ? PlayCircle : Circle;
        return lesson.locked ? <div className="lesson-row locked" key={lesson.id}><Icon /><span><b>{lesson.subtopic}</b><small>Complete the previous lesson to unlock</small></span></div> : <Link className="lesson-row" href={`/student/learn/${lesson.slug}`} key={lesson.id}><Icon /><span><b>{lesson.subtopic}</b><small>{completed ? "Completed" : lesson.progress_status === "in_progress" ? `${lesson.progress_percentage}% complete` : lesson.difficulty}</small></span><em>{completed ? "Review" : "Open"}</em></Link>;
      })}</div>)}</div></section>)}</div>}
    </DashboardShell>
  );
}

