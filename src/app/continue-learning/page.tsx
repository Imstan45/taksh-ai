import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { getGamification, getStudentLearningOverview } from "@/lib/learning/service";
import { Award, BookOpen, Flame, Trophy } from "lucide-react";

export default async function ContinueLearningPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/continue-learning");
  const [courses, game] = await Promise.all([
    getStudentLearningOverview(session.user.id),
    getGamification(session.user.id),
  ]);
  const resume = courses.find((course) => course.lastSlug) ?? courses[0];

  return (
    <DashboardShell {...session.user}>
      <div className="student-page-heading"><div><p className="eyebrow">Your learning journey</p><h2>Continue learning</h2><p>Resume from the exact lesson section where you stopped.</p></div><Link className="btn-ghost border border-white/10" href="/student/courses">View all courses</Link></div>
      <div className="game-stats">
        <div><Trophy /><span><b>Level {game.level}</b><small>{game.xp} total XP</small></span></div>
        <div><Flame /><span><b>{game.streak} day streak</b><small>Learn today to continue it</small></span></div>
        <div><Award /><span><b>{game.completed} lessons</b><small>Completed</small></span></div>
      </div>
      {resume ? <section className="continue-hero"><div><p className="eyebrow">Up next</p><h3>{resume.lastSubtopic ?? resume.course}</h3><p>{resume.course} · {resume.completedCount} of {resume.lessonCount} lessons completed</p><div className="course-progress"><span style={{ width: `${resume.progress}%` }} /></div></div><Link className="btn-primary" href={resume.lastSlug ? `/student/learn/${resume.lastSlug}` : `/student/courses/${resume.slug}`}><BookOpen className="size-4" />{resume.progress ? "Resume lesson" : "Start course"}</Link></section> :
      <div className="learning-empty"><BookOpen /><h3>You do not have an assigned course yet.</h3><p>Your learning path will appear here after your course is assigned.</p></div>}
      {courses.length > 1 && <div className="course-grid mt-6">{courses.filter((course) => course.course !== resume?.course).map((course) => <article className="course-card" key={course.course}><h3>{course.course}</h3><p>{course.completedCount} of {course.lessonCount} lessons completed</p><div className="course-progress"><span style={{ width: `${course.progress}%` }} /></div><div className="course-card-footer"><b>{course.progress}%</b><Link href={`/student/courses/${course.slug}`}>Open</Link></div></article>)}</div>}
    </DashboardShell>
  );
}
