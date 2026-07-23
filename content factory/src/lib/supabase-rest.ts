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

export type SupabaseCredentials = Record<string, never>;

export function credentialsFromRequest(_request: Request): SupabaseCredentials {
  void _request;
  return {};
}

function config() {
  const env = factoryEnvironment();
  return { url: env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, ""), key: env.SUPABASE_SERVICE_ROLE_KEY };
}

export function isSupabaseConfigured(_credentials?: SupabaseCredentials) {
  void _credentials;
  try {
    factoryEnvironment();
    return true;
  } catch {
    return false;
  }
}

export async function supabaseRequest<T>(
  path: string,
  init: RequestInit = {},
  _credentials?: SupabaseCredentials,
): Promise<T> {
  void _credentials;
  const { url, key } = config();
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
import { factoryEnvironment } from "./env";
