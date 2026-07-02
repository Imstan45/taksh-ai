import { del, put } from "@vercel/blob";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf"]);

export async function uploadResume(userId: string, file: File) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Only PDF resumes are accepted");
  if (file.size > MAX_SIZE) throw new Error("Resume must be 5 MB or smaller");
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Resume storage is not configured");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const key = `resumes/${userId}/${crypto.randomUUID()}-${safeName}`;
  const blob = await put(key, file, { access: "private", addRandomSuffix: false });
  return { url: blob.url, key: blob.pathname, name: safeName };
}

export async function deleteResume(key: string | null) {
  if (key && process.env.BLOB_READ_WRITE_TOKEN) await del(key);
}
