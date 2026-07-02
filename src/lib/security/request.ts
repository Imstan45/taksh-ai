import { headers } from "next/headers";
import { hashToken } from "./tokens";

export async function requestFingerprint() {
  const values = await headers();
  const forwarded = values.get("x-forwarded-for")?.split(",")[0]?.trim();
  return hashToken(forwarded || values.get("x-real-ip") || "unknown");
}
