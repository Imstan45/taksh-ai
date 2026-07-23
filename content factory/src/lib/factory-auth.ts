import { factoryEnvironment } from "./env";

export const FACTORY_SESSION_COOKIE = "taksh_factory_session";
const encoder = new TextEncoder();

export type FactorySession = {
  sub: string;
  email: string;
  role: "SUPER_ADMIN";
  exp: number;
  nonce: string;
};

function decodeBase64url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeBase64url(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function createFactorySessionToken(payload: FactorySession) {
  const body = encodeBase64url(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(factoryEnvironment().CONTENT_FACTORY_AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(body)));
  return `${body}.${encodeBase64url(signature)}`;
}

export async function verifyFactoryToken(token: string): Promise<FactorySession | null> {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(factoryEnvironment().CONTENT_FACTORY_AUTH_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify("HMAC", key, decodeBase64url(signature), encoder.encode(body));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64url(body))) as FactorySession;
    if (payload.role !== "SUPER_ADMIN" || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1);
}

export async function requireFactorySession(request: Request) {
  const token = cookieValue(request, FACTORY_SESSION_COOKIE);
  return token ? verifyFactoryToken(token) : null;
}
