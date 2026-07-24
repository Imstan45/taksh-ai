import { credentialsFromRequest, isSupabaseConfigured, supabaseRequest } from "@/lib/content-factory/supabase-rest";
import { takshContentSchema } from "@/lib/content-factory/schemas/taksh-content-schema";
import { requireFactorySession } from "@/lib/content-factory/auth";

export const runtime = "edge";

type Context = { params: Promise<{ id: string }> };
type AssetStatus = "draft" | "in_review" | "approved" | "published" | "archived";

const transitions: Record<AssetStatus, AssetStatus[]> = {
  draft: ["in_review"],
  in_review: ["draft", "approved"],
  approved: ["draft", "published"],
  published: ["archived"],
  archived: [],
};

export async function GET(request: Request, context: Context) {
  if (!await requireFactorySession(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const credentials = credentialsFromRequest(request);
  if (!isSupabaseConfigured(credentials)) return Response.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const { id } = await context.params;
    const [assets, versions] = await Promise.all([
      supabaseRequest<Array<Record<string, unknown>>>(`taksh_content_assets?id=eq.${encodeURIComponent(id)}&select=*`, {}, credentials),
      supabaseRequest<Array<Record<string, unknown>>>(`taksh_content_versions?asset_id=eq.${encodeURIComponent(id)}&select=*&order=version_number.desc`, {}, credentials),
    ]);
    if (!assets[0]) return Response.json({ error: "Asset not found." }, { status: 404 });
    return Response.json({ asset: assets[0], versions });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load asset." }, { status: 502 });
  }
}

export async function PATCH(request: Request, context: Context) {
  const session = await requireFactorySession(request);
  if (!session) return Response.json({ error: "Forbidden" }, { status: 403 });
  const credentials = credentialsFromRequest(request);
  if (!isSupabaseConfigured(credentials)) return Response.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const { id } = await context.params;
    const body = await request.json() as { content?: Record<string, unknown>; status?: string; changeNote?: string; changeType?: string };
    const existing = await supabaseRequest<Array<Record<string, unknown>>>(`taksh_content_assets?id=eq.${encodeURIComponent(id)}&select=*`, {}, credentials);
    if (!existing[0]) return Response.json({ error: "Asset not found." }, { status: 404 });
    const currentStatus = String(existing[0].status) as AssetStatus;
    const nextStatus = (body.status || currentStatus) as AssetStatus;
    if (!(nextStatus in transitions)) return Response.json({ error: "Invalid content status." }, { status: 422 });
    if (nextStatus !== currentStatus && !transitions[currentStatus].includes(nextStatus)) {
      return Response.json({ error: `Content cannot move from ${currentStatus} to ${nextStatus}.` }, { status: 409 });
    }
    const nextContent = body.content || existing[0].content;
    const validation = takshContentSchema.safeParse(nextContent);
    if (!validation.success) return Response.json({ error: "The edited content does not match the canonical schema." }, { status: 422 });
    const identity = validation.data.identity;
    const versions = await supabaseRequest<Array<{ version_number: number }>>(
      `taksh_content_versions?asset_id=eq.${encodeURIComponent(id)}&select=version_number&order=version_number.desc&limit=1`, {}, credentials,
    );
    const nextVersion = (versions[0]?.version_number || 0) + 1;
    const now = new Date().toISOString();
    const patch = {
      content: nextContent,
      status: nextStatus,
      title: identity.title || String(existing[0].title),
      difficulty: identity.difficulty || String(existing[0].difficulty),
      content_version: nextVersion,
      ...(nextStatus === "in_review" && currentStatus !== nextStatus ? { reviewed_by: session.sub, reviewed_at: now } : {}),
      ...(nextStatus === "approved" && currentStatus !== nextStatus ? { approved_by: session.sub, approved_at: now } : {}),
      ...(nextStatus === "published" && currentStatus !== nextStatus ? { published_by: session.sub, published_at: now } : {}),
      updated_at: now,
    };
    const records = await supabaseRequest<Array<Record<string, unknown>>>(`taksh_content_assets?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }, credentials);
    await supabaseRequest("taksh_content_versions", {
      method: "POST",
      body: JSON.stringify({
        asset_id: id,
        version_number: nextVersion,
        change_type: body.changeType || "edited",
        change_note: body.changeNote || "Content updated",
        content: nextContent,
        created_by: session.sub,
      }),
    }, credentials);
    if (nextStatus !== currentStatus) {
      await supabaseRequest("content_publication_history", {
        method: "POST",
        body: JSON.stringify({
          asset_id: id,
          version_number: nextVersion,
          from_status: currentStatus,
          to_status: nextStatus,
          actor_id: session.sub,
          change_summary: body.changeNote || `Status changed from ${currentStatus} to ${nextStatus}`,
        }),
      }, credentials);
      await supabaseRequest("audit_logs", {
        method: "POST",
        body: JSON.stringify({
          actor_id: session.sub,
          action: `content.${nextStatus}`,
          target_type: "taksh_content_asset",
          target_id: id,
          previous_values: { status: currentStatus, version: nextVersion - 1 },
          new_values: { status: nextStatus, version: nextVersion },
          metadata: { source: "content_factory" },
        }),
      }, credentials);
    }
    return Response.json({ asset: records[0] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update asset." }, { status: 502 });
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!await requireFactorySession(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const credentials = credentialsFromRequest(request);
  if (!isSupabaseConfigured(credentials)) return Response.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const { id } = await context.params;
    const [assets, progress] = await Promise.all([
      supabaseRequest<Array<{ status: AssetStatus }>>(`taksh_content_assets?id=eq.${encodeURIComponent(id)}&select=status`, {}, credentials),
      supabaseRequest<Array<{ id: string }>>(`student_content_progress?content_id=eq.${encodeURIComponent(id)}&select=id&limit=1`, {}, credentials),
    ]);
    if (!assets[0]) return Response.json({ error: "Asset not found." }, { status: 404 });
    if (assets[0].status === "published" || assets[0].status === "archived" || progress.length) {
      return Response.json({ error: "Published or referenced content must be archived and cannot be deleted." }, { status: 409 });
    }
    await supabaseRequest(`taksh_content_assets?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }, credentials);
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to delete asset." }, { status: 502 });
  }
}

