import { requireFactorySession } from "@/lib/content-factory/auth";
import { supabaseRequest } from "@/lib/content-factory/supabase-rest";

const allowed = new Set(["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"]);

export async function GET(request: Request) {
  if (!await requireFactorySession(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    const rows = await supabaseRequest<Array<Record<string, unknown>>>("content_factory_settings?id=eq.true&select=*");
    return Response.json({ settings: rows[0] ?? null });
  } catch {
    return Response.json({ settings: null });
  }
}

export async function PATCH(request: Request) {
  const session = await requireFactorySession(request);
  if (!session) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const model = String(body.default_model || "");
  const batchSize = Number(body.default_batch_size);
  if (!allowed.has(model) || !Number.isInteger(batchSize) || batchSize < 1 || batchSize > 25) {
    return Response.json({ error: "Invalid settings." }, { status: 422 });
  }
  const payload = {
    default_model: model,
    default_teaching_style: String(body.default_teaching_style || "").slice(0, 120),
    default_difficulty: String(body.default_difficulty || "").slice(0, 80),
    default_language: String(body.default_language || "").slice(0, 80),
    default_content_depth: String(body.default_content_depth || "").slice(0, 80),
    default_batch_size: batchSize,
    auto_save_drafts: Boolean(body.auto_save_drafts),
    require_manual_approval: Boolean(body.require_manual_approval),
    updated_by: session.sub,
    updated_at: new Date().toISOString(),
  };
  try {
    const rows = await supabaseRequest<Array<Record<string, unknown>>>("content_factory_settings?id=eq.true", { method: "PATCH", body: JSON.stringify(payload) });
    return Response.json({ settings: rows[0] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Settings could not be saved." }, { status: 502 });
  }
}
