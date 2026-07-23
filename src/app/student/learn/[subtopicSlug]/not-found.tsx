import Link from "next/link";

export default function LessonUnavailable() {
  return (
    <main className="lesson-page grid min-h-screen place-items-center p-6">
      <div className="learning-empty max-w-xl">
        <h1 className="text-2xl font-semibold">This lesson is temporarily unavailable.</h1>
        <p>It may still be under review, not assigned to your course, or being prepared for publication.</p>
        <Link className="btn-primary mt-5" href="/student/courses">Return to my courses</Link>
      </div>
    </main>
  );
}
