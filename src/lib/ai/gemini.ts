import "server-only";

const DEFAULT_MODEL = "gemini-3.6-flash";
const ALLOWED_MODELS = new Set([DEFAULT_MODEL, "gemini-3.5-flash-lite", "gemini-flash-latest"]);

type GeminiPayload = {
  error?: { message?: string; status?: string };
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

export class GeminiError extends Error {
  constructor(message: string, public readonly category: string, public readonly status = 502) {
    super(message);
  }
}

export function geminiConfigured() {
  return typeof process.env.GEMINI_API_KEY === "string" && process.env.GEMINI_API_KEY.length >= 20;
}

export function resolveGeminiModel(requested?: string) {
  return requested && ALLOWED_MODELS.has(requested) ? requested : DEFAULT_MODEL;
}

export async function generateGeminiText(input: {
  systemInstruction?: string;
  prompt: string;
  model?: string;
  json?: boolean;
  maxOutputTokens?: number;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("Gemini is not configured in the deployment environment.", "configuration", 503);
  const model = resolveGeminiModel(input.model);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  let lastError: GeminiError | undefined;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          ...(input.systemInstruction ? { system_instruction: { parts: [{ text: input.systemInstruction }] } } : {}),
          contents: [{ role: "user", parts: [{ text: input.prompt }] }],
          generationConfig: {
            ...(input.json ? { responseMimeType: "application/json" } : {}),
            maxOutputTokens: input.maxOutputTokens ?? 65536,
          },
        }),
        signal: AbortSignal.timeout(90_000),
      });
      const payload = await response.json() as GeminiPayload;
      if (!response.ok) {
        const category = response.status === 429 ? "rate_limit" : response.status >= 500 ? "provider" : "request";
        throw new GeminiError(payload.error?.message || "Gemini rejected the request.", category, response.status);
      }
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
      if (!text) throw new GeminiError("Gemini returned an empty response.", "empty_response");
      return { text, model, responseTimeMs: Date.now() - startedAt };
    } catch (error) {
      lastError = error instanceof GeminiError
        ? error
        : new GeminiError(error instanceof Error ? error.message : "Gemini request failed.", "network");
      if (attempt < 2 && (lastError.category === "rate_limit" || lastError.category === "provider" || lastError.category === "network")) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (2 ** attempt)));
        continue;
      }
      break;
    }
  }
  throw lastError ?? new GeminiError("Gemini request failed.", "unknown");
}
