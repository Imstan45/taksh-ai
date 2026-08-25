import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { getGamification, getStudentLearningOverview } from "@/lib/learning/service";
import { Award, BookOpen, Flame, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { hasCareerStarterAccess } from "@/lib/entitlements/career-starter";

export default async function StudentCoursesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/student/courses");
  const [courses, game, paid, catalogue, plans] = await Promise.all([
    getStudentLearningOverview(session.user.id),
    getGamification(session.user.id),
    hasCareerStarterAccess(session.user.id).catch(()=>false),
    prisma.$queryRaw<Array<{title:string;slug:string;short_description:string;category:string;lesson_count:number}>>`select distinct c.title,c.slug,c.short_description,c.category,c.lesson_count from public.courses c join public.plan_course_entitlements m on m.course=c.title join public.plans p on p.id=m.plan_id where p.code='career_starter' and c.published order by c.category,c.title`,
    prisma.$queryRaw<Array<{id:string;price_in_paise:number}>>`select id,price_in_paise from public.plans where code='career_starter' and active limit 1`,
  ]);

  return (
    <DashboardShell {...session.user}>
      <div className="student-page-heading"><div><p className="eyebrow">Learning path</p><h2>{paid?"Your available courses":"Career Starter course catalogue"}</h2><p>{paid?"Every course unlocked by your active Career Starter access.":"Preview the complete learning package, then activate access securely with Razorpay."}</p></div>{!paid&&plans[0]&&<Link className="btn-primary" href={`/checkout?plan=${plans[0].id}`}>Pay ₹{plans[0].price_in_paise/100} and activate</Link>}</div>
      <div className="game-stats">
        <div><Trophy /><span><b>Level {game.level}</b><small>{game.xp} total XP</small></span></div>
        <div><Flame /><span><b>{game.streak} day streak</b><small>Keep learning daily</small></span></div>
        <div><Award /><span><b>{game.completed} lessons</b><small>Completed</small></span></div>
      </div>
      {!paid&&<div className="course-grid">{catalogue.map(course=><article className="course-card" key={course.title}><div className="course-card-top"><BookOpen/><span>{course.lesson_count} lessons</span></div><small className="career-course-label">{course.category} · Preview</small><h3>{course.title}</h3><p>{course.short_description}</p><div className="course-card-footer"><b>Locked</b>{plans[0]?<Link href={`/checkout?plan=${plans[0].id}`}>Activate access</Link>:<span>Unavailable</span>}</div></article>)}</div>}
      {paid&&courses.length === 0 ? <div className="learning-empty"><BookOpen /><h3>Your courses are being activated.</h3><p>Refresh shortly. Verified payment access is assigned automatically by the database.</p></div> : paid&&
      <div className="course-grid">{courses.map((course) => <article className="course-card" data-career-course={course.course.startsWith("ServiceNow")||undefined} key={course.course}><div className="course-card-top"><BookOpen /><span>{course.moduleCount} modules</span></div>{course.course.startsWith("ServiceNow")&&<small className="career-course-label">Career pathway · 3 capstones</small>}<h3>{course.course}</h3><p>{course.completedCount} of {course.lessonCount} published lessons completed</p><div className="course-progress"><span style={{ width: `${course.progress}%` }} /></div><div className="course-card-footer"><b>{course.progress}%</b><Link href={`/student/courses/${course.slug}`}>{course.progress ? "Resume learning" : "Start course"}</Link></div></article>)}</div>}
    </DashboardShell>
  );
}
