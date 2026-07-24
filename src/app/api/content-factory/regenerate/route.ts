import {
  buildTakshSectionRegenerationPrompt,
  TAKSH_SECTION_REGENERATION_SYSTEM_PROMPT,
} from "@/lib/content-factory/prompts/taksh-content-master-prompt";
import { requireFactorySession } from "@/lib/content-factory/auth";
import { generateGeminiText, GeminiError } from "@/lib/ai/gemini";

export async function POST(request: Request) {
  if (!await requireFactorySession(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json() as {
      model?: string;
      selectedSection?: string;
      regenerationInstruction?: string;
      existingContentJson?: Record<string, unknown>;
    };
    if (!body.selectedSection || !body.existingContentJson) {
      return Response.json({ error: "A section and existing content are required." }, { status: 400 });
    }
    const result = await generateGeminiText({
      systemInstruction: TAKSH_SECTION_REGENERATION_SYSTEM_PROMPT,
      prompt: buildTakshSectionRegenerationPrompt({
        selectedSection: body.selectedSection,
        regenerationInstruction: body.regenerationInstruction || "Improve academic clarity, completeness and accuracy.",
        existingContentJson: body.existingContentJson,
      }),
      model: body.model,
      json: true,
      maxOutputTokens: 32768,
    });
    try {
      return Response.json({ section: JSON.parse(result.text), model: result.model });
    } catch {
      return Response.json({ error: "Gemini returned an invalid section." }, { status: 502 });
    }
  } catch (error) {
    const safe = error instanceof GeminiError ? error : new GeminiError("Regeneration failed.", "unknown", 500);
    return Response.json({ error: safe.message, errorCategory: safe.category }, { status: safe.status });
  }
}
