import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { PublishedLessonRenderer } from "@/components/learning/published-lesson-renderer";
import { getPublishedLessonBySubtopic } from "@/lib/learning/service";

export default async function LessonPage({ params }: { params: Promise<{ subtopicSlug: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const result = await getPublishedLessonBySubtopic(session.user.id, (await params).subtopicSlug);
  if (!result) notFound();
  return <PublishedLessonRenderer lesson={result.lesson} nextSlug={result.nextSlug} />;
}

