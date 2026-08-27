import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, BookOpen, Flame, Trophy } from "lucide-react";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { getGamification, getStudentLearningOverview } from "@/lib/learning/service";

export default async function StudentCoursesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/student/courses");
  const [courses, game] = await Promise.all([
    getStudentLearningOverview(session.user.id),
    getGamification(session.user.id),
  ]);
  return <DashboardShell {...session.user}>
    <div className="student-page-heading"><div><p className="eyebrow">My learning</p><h2>Your courses</h2><p>Only courses currently assigned to you or included in products you own appear here.</p></div><Link className="btn-primary" href="/programs">Browse programs</Link></div>
    <div className="game-stats">
      <div><Trophy/><span><b>Level {game.level}</b><small>{game.xp} total XP</small></span></div>
      <div><Flame/><span><b>{game.streak} day streak</b><small>Keep learning daily</small></span></div>
      <div><Award/><span><b>{game.completed} lessons</b><small>Completed</small></span></div>
    </div>
    {courses.length === 0 ? <div className="learning-empty"><BookOpen/><h3>No courses yet</h3><p>Browse available programs or ask your institution to assign a course.</p><Link className="btn-primary" href="/programs">Browse programs</Link></div> :
      <div className="course-grid">{courses.map(course => <article className="course-card" key={course.course}><div className="course-card-top"><BookOpen/><span>{course.moduleCount} modules</span></div><h3>{course.course}</h3><p>{course.completedCount} of {course.lessonCount} published lessons completed</p><div className="course-progress"><span style={{width:`${course.progress}%`}}/></div><div className="course-card-footer"><b>{course.progress}%</b><Link href={`/student/courses/${course.slug}`}>{course.progress ? "Resume learning" : "Start course"}</Link></div></article>)}</div>}
  </DashboardShell>;
}
