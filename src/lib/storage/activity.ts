import { del, put } from "@vercel/blob";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg"]);

export async function uploadActivityFile(studentId: string, activityId: string, file: File) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Upload a PDF, DOCX, TXT, PNG or JPEG file.");
  if (file.size > MAX_SIZE) throw new Error("Attachment must be 10 MB or smaller.");
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Submission storage is not configured.");
  const name = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const key = `activity-submissions/${activityId}/${studentId}/${crypto.randomUUID()}-${name}`;
  const blob = await put(key, file, { access: "private", addRandomSuffix: false });
  return { url: blob.url, key: blob.pathname, name };
}

export async function deleteActivityFile(key?: string | null) {
  if (key && process.env.BLOB_READ_WRITE_TOKEN) await del(key);
}
