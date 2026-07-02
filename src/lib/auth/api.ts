import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { firstValidationError } from "./validation";

export async function parseJson<T>(request: Request, schema: ZodType<T>) {
  try {
    const result = schema.safeParse(await request.json());
    if (!result.success) return { error: NextResponse.json({ error: firstValidationError(result.error) }, { status: 400 }) };
    return { data: result.data };
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON request" }, { status: 400 }) };
  }
}

export function authError(error: unknown) {
  console.error("Authentication request failed", error);
  if (error instanceof Error && error.message === "RATE_LIMITED")
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  return NextResponse.json({ error: "Unable to complete the request" }, { status: 500 });
}
