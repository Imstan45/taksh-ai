import { credentialsFromRequest, isSupabaseConfigured, supabaseRequest } from "@/lib/content-factory/supabase-rest";
import { takshContentSchema } from "@/lib/content-factory/schemas/taksh-content-schema";
import { requireFactorySession } from "@/lib/content-factory/auth";

export const runtime = "edge";

export async function GET(request: Request) {
  if (!await requireFactorySession(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const credentials = credentialsFromRequest(request);
  if (!isSupabaseConfigured(credentials)) return Response.json({ assets: [], configured: false });
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim();
    const status = url.searchParams.get("status")?.trim();
    const filters = [
      "select=*",
      "order=updated_at.desc",
      "limit=100",
      search ? `or=(title.ilike.*${encodeURIComponent(search)}*,course.ilike.*${encodeURIComponent(search)}*,topic.ilike.*${encodeURIComponent(search)}*,subtopic.ilike.*${encodeURIComponent(search)}*)` : "",
      status && status !== "all" ? `status=eq.${encodeURIComponent(status)}` : "",
    ].filter(Boolean).join("&");
    const assets = await supabaseRequest(`taksh_content_assets?${filters}`, {}, credentials);
    return Response.json({ assets, configured: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load content." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const session = await requireFactorySession(request);
  if (!session) return Response.json({ error: "Forbidden" }, { status: 403 });
  const credentials = credentialsFromRequest(request);
  if (!isSupabaseConfigured(credentials)) return Response.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await request.json() as { content?: Record<string, unknown>; status?: string };
    const validation = takshContentSchema.safeParse(body.content);
    if (!validation.success) return Response.json({ error: "The teaching asset does not match the canonical schema." }, { status: 422 });
    const content = validation.data;
    const identity = content.identity;
    const payload = {
      course: identity.course,
      module: identity.module,
      topic: identity.topic,
      subtopic: identity.subtopic,
      title: identity.title || identity.subtopic,
      slug: identity.slug,
      difficulty: identity.difficulty,
      status: "draft",
      content,
      created_by: session.sub,
      updated_at: new Date().toISOString(),
    };
    const records = await supabaseRequest<Array<Record<string, unknown>>>("taksh_content_assets", {
      method: "POST",
      body: JSON.stringify(payload),
    }, credentials);
    const asset = records[0];
    if (asset?.id) {
      await supabaseRequest("taksh_content_versions", {
        method: "POST",
        body: JSON.stringify({
          asset_id: asset.id,
          version_number: 1,
          change_type: "generated",
          change_note: "Initial Gemini generation",
          content,
          created_by: session.sub,
        }),
      }, credentials);
    }
    return Response.json({ asset }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save content." }, { status: 502 });
  }
}

