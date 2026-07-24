import { requireFactorySession } from "@/lib/content-factory/auth";
import { generateGeminiText, GeminiError } from "@/lib/ai/gemini";

export async function POST(request: Request) {
  if (!await requireFactorySession(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const startedAt = Date.now();
  try {
    const result = await generateGeminiText({ prompt: "Reply with exactly: connected", maxOutputTokens: 8 });
    return Response.json({ connected: true, model: result.model, responseTime: result.responseTimeMs });
  } catch (error) {
    const safe = error instanceof GeminiError ? error : new GeminiError("Connection test failed.", "unknown");
    return Response.json({
      connected: false,
      model: "gemini-3.6-flash",
      responseTime: Date.now() - startedAt,
      errorCategory: safe.category,
      message: safe.message,
    }, { status: safe.status });
  }
}
