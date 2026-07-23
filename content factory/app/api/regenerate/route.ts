import {
  buildTakshSectionRegenerationPrompt,
  TAKSH_SECTION_REGENERATION_SYSTEM_PROMPT,
} from "../../../src/lib/prompts/taksh-content-master-prompt";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      apiKey?: string;
      model?: string;
      selectedSection?: string;
      regenerationInstruction?: string;
      existingContentJson?: Record<string, unknown>;
    };
    const apiKey = process.env.GEMINI_API_KEY || body.apiKey;
    if (!apiKey || !body.selectedSection || !body.existingContentJson) {
      return Response.json({ error: "Gemini configuration, section and existing content are required." }, { status: 400 });
    }
    const allowedModels = new Set(["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"]);
    const model = allowedModels.has(body.model ?? "") ? body.model : "gemini-3.6-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: TAKSH_SECTION_REGENERATION_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: buildTakshSectionRegenerationPrompt({
          selectedSection: body.selectedSection,
          regenerationInstruction: body.regenerationInstruction || "Improve academic clarity, completeness and accuracy.",
          existingContentJson: body.existingContentJson,
        }) }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 32768 },
      }),
    });
    const payload = await response.json() as any;
    if (!response.ok) return Response.json({ error: payload.error?.message || "Gemini rejected the request." }, { status: response.status });
    const text = payload.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("") || "";
    try {
      return Response.json({ section: JSON.parse(text) });
    } catch {
      return Response.json({ error: "Gemini returned an invalid section." }, { status: 502 });
    }
  } catch {
    return Response.json({ error: "The regeneration request could not be processed." }, { status: 500 });
  }
}
