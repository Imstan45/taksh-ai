export type AssetStatus = "draft" | "in_review" | "approved" | "published" | "archived";

export interface ContentAssetRecord {
  id: string;
  course: string;
  module: string;
  topic: string;
  subtopic: string;
  title: string;
  slug: string;
  status: AssetStatus;
  difficulty: string;
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type SupabaseCredentials = { url?: string | null; key?: string | null };

export function credentialsFromRequest(request: Request): SupabaseCredentials {
  return {
    url: request.headers.get("x-supabase-url"),
    key: request.headers.get("x-supabase-key"),
  };
}

function config(credentials?: SupabaseCredentials) {
  const url = (credentials?.url || process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, "");
  const key = credentials?.key || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  return { url, key };
}

export function isSupabaseConfigured(credentials?: SupabaseCredentials) {
  return Boolean(
    (credentials?.url && credentials?.key) ||
    (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

export async function supabaseRequest<T>(
  path: string,
  init: RequestInit = {},
  credentials?: SupabaseCredentials,
): Promise<T> {
  const { url, key } = config(credentials);
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${detail}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
