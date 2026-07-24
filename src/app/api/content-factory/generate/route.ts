import {
  buildTakshContentUserPrompt,
  TAKSH_CONTENT_MASTER_SYSTEM_PROMPT,
  type TakshContentPromptInput,
} from "@/lib/content-factory/prompts/taksh-content-master-prompt";
import { takshContentSchema } from "@/lib/content-factory/schemas/taksh-content-schema";
import { requireFactorySession } from "@/lib/content-factory/auth";
import { generateGeminiText, GeminiError } from "@/lib/ai/gemini";

export async function POST(request: Request) {
  if (!await requireFactorySession(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json() as { model?: string; input?: TakshContentPromptInput };
    if (!body.input) return Response.json({ error: "Generation input is required." }, { status: 400 });
    const result = await generateGeminiText({
      systemInstruction: TAKSH_CONTENT_MASTER_SYSTEM_PROMPT,
      prompt: buildTakshContentUserPrompt(body.input),
      model: body.model,
      json: true,
    });
    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      return Response.json({ error: "Gemini returned content that was not valid JSON." }, { status: 502 });
    }
    const validation = takshContentSchema.safeParse(parsed);
    if (!validation.success) {
      return Response.json({
        error: "Gemini returned incomplete structured content.",
        validationIssues: validation.error.issues.slice(0, 8).map((issue) => `${issue.path.join(".")}: ${issue.message}`),
      }, { status: 422 });
    }
    return Response.json({ content: validation.data, model: result.model, responseTime: result.responseTimeMs });
  } catch (error) {
    const safe = error instanceof GeminiError ? error : new GeminiError("Generation failed.", "unknown", 500);
    return Response.json({ error: safe.message, errorCategory: safe.category }, { status: safe.status });
  }
}
