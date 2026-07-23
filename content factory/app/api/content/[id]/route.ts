import { credentialsFromRequest, isSupabaseConfigured, supabaseRequest } from "../../../../src/lib/supabase-rest";
import { takshContentSchema } from "../../../../src/lib/schemas/taksh-content-schema";

export const runtime = "edge";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
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
  const credentials = credentialsFromRequest(request);
  if (!isSupabaseConfigured(credentials)) return Response.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const { id } = await context.params;
    const body = await request.json() as { content?: Record<string, any>; status?: string; changeNote?: string; changeType?: string };
    const existing = await supabaseRequest<Array<Record<string, any>>>(`taksh_content_assets?id=eq.${encodeURIComponent(id)}&select=*`, {}, credentials);
    if (!existing[0]) return Response.json({ error: "Asset not found." }, { status: 404 });
    const nextContent = body.content || existing[0].content;
    const validation = takshContentSchema.safeParse(nextContent);
    if (!validation.success) return Response.json({ error: "The edited content does not match the canonical schema." }, { status: 422 });
    const identity = nextContent.identity || {};
    const patch = {
      content: nextContent,
      status: body.status || existing[0].status,
      title: identity.title || existing[0].title,
      difficulty: identity.difficulty || existing[0].difficulty,
      updated_at: new Date().toISOString(),
    };
    const records = await supabaseRequest<Array<Record<string, unknown>>>(`taksh_content_assets?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }, credentials);
    const versions = await supabaseRequest<Array<{ version_number: number }>>(
      `taksh_content_versions?asset_id=eq.${encodeURIComponent(id)}&select=version_number&order=version_number.desc&limit=1`, {}, credentials,
    );
    await supabaseRequest("taksh_content_versions", {
      method: "POST",
      body: JSON.stringify({
        asset_id: id,
        version_number: (versions[0]?.version_number || 0) + 1,
        change_type: body.changeType || "edited",
        change_note: body.changeNote || "Content updated",
        content: nextContent,
      }),
    }, credentials);
    return Response.json({ asset: records[0] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update asset." }, { status: 502 });
  }
}

export async function DELETE(request: Request, context: Context) {
  const credentials = credentialsFromRequest(request);
  if (!isSupabaseConfigured(credentials)) return Response.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const { id } = await context.params;
    await supabaseRequest(`taksh_content_assets?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }, credentials);
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to delete asset." }, { status: 502 });
  }
}
