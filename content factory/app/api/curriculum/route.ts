import { credentialsFromRequest, isSupabaseConfigured, supabaseRequest } from "../../../src/lib/supabase-rest";

export const runtime = "edge";

type CurriculumRow = {
  course: string;
  module: string;
  topic: string;
  subtopic: string;
};

export async function GET(request: Request) {
  const credentials = credentialsFromRequest(request);
  if (!isSupabaseConfigured(credentials)) {
    return Response.json({ configured: false, courses: [], modules: [], topics: [], subtopics: [] });
  }

  try {
    const url = new URL(request.url);
    const selectedCourse = url.searchParams.get("course") || "";
    const selectedModule = url.searchParams.get("module") || "";
    const selectedTopic = url.searchParams.get("topic") || "";

    const rows = await supabaseRequest<CurriculumRow[]>(
      "taksh_curriculum?select=course,module,topic,subtopic&active=eq.true&order=course.asc,module.asc,topic.asc,subtopic.asc",
      {},
      credentials,
    );
    const unique = (items: string[]) => [...new Set(items.filter(Boolean))];
    if (url.searchParams.get("all") === "true") {
      return Response.json({ configured: true, rows });
    }
    const courseRows = selectedCourse ? rows.filter((row) => row.course === selectedCourse) : [];
    const moduleRows = selectedModule ? courseRows.filter((row) => row.module === selectedModule) : [];
    const topicRows = selectedTopic ? moduleRows.filter((row) => row.topic === selectedTopic) : [];

    return Response.json({
      configured: true,
      courses: unique(rows.map((row) => row.course)),
      modules: unique(courseRows.map((row) => row.module)),
      topics: unique(moduleRows.map((row) => row.topic)),
      subtopics: unique(topicRows.map((row) => row.subtopic)),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load curriculum." }, { status: 502 });
  }
}
