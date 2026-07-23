type FactoryTokenPayload = {
  sub: string;
  email: string;
  role: "SUPER_ADMIN";
  exp: number;
  nonce: string;
};

const encoder = new TextEncoder();
const base64url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

export async function createContentFactoryToken(
  payload: Omit<FactoryTokenPayload, "exp" | "nonce">,
  secret: string,
) {
  const complete: FactoryTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 60,
    nonce: crypto.randomUUID(),
  };
  const body = base64url(JSON.stringify(complete));
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(body)));
  return `${body}.${base64url(signature)}`;
}
