import {
  buildTakshContentUserPrompt,
  TAKSH_CONTENT_MASTER_SYSTEM_PROMPT,
  type TakshContentPromptInput,
} from "@/lib/content-factory/prompts/taksh-content-master-prompt";
import { takshContentSchema } from "@/lib/content-factory/schemas/taksh-content-schema";
import { factoryEnvironment } from "@/lib/content-factory/env";
import { requireFactorySession } from "@/lib/content-factory/auth";

export const runtime = "edge";

export async function POST(request: Request) {
  if (!await requireFactorySession(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = (await request.json()) as {
      model?: string;
      input?: TakshContentPromptInput;
    };

    const apiKey = factoryEnvironment().GEMINI_API_KEY;
    if (!body.input) {
      return Response.json({ error: "Gemini is not configured. Add GEMINI_API_KEY to the app environment." }, { status: 400 });
    }

    const allowedModels = new Set(["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"]);
    const model = allowedModels.has(body.model ?? "") ? body.model : "gemini-3.6-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: TAKSH_CONTENT_MASTER_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: buildTakshContentUserPrompt(body.input) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 65536,
        },
      }),
    });

    const payload = (await response.json()) as {
      error?: { message?: string };
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    if (!response.ok) {
      return Response.json({ error: payload.error?.message || "Gemini rejected the generation request." }, { status: response.status });
    }

    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    if (!text) return Response.json({ error: "Gemini returned an empty response. Please try again." }, { status: 502 });

    try {
      const parsed = JSON.parse(text);
      const validation = takshContentSchema.safeParse(parsed);
      if (!validation.success) {
        const issues = validation.error.issues.slice(0, 8).map((issue) => `${issue.path.join(".")}: ${issue.message}`);
        return Response.json({
          error: "Gemini returned incomplete structured content. Generate again.",
          validationIssues: issues,
        }, { status: 422 });
      }
      return Response.json({ content: validation.data });
    } catch {
      return Response.json({ error: "Gemini returned content that was not valid JSON. Please generate again." }, { status: 502 });
    }
  } catch {
    return Response.json({ error: "The generation request could not be processed." }, { status: 500 });
  }
}

