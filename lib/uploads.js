import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fail } from "@/lib/api";

export const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const EXTENSIONS = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/plain": ".txt",
};

export async function saveUpload(file, kind = "application") {
  if (!file || typeof file === "string" || !file.arrayBuffer) {
    return { error: "Choose a file to upload." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Unsupported file type. Use PDF, DOC, DOCX, PNG, JPG or WEBP." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Files must be 8 MB or smaller." };
  }
  const safeBase = String(file.name || "upload")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .slice(0, 60) || "upload";
  const storedName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeBase}${EXTENSIONS[file.type] || ""}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOAD_DIR, storedName), buffer);
  return {
    name: file.name || storedName,
    storedName,
    mimeType: file.type,
    size: file.size,
    kind,
  };
}

export async function readUpload(storedName) {
  const safe = path.basename(String(storedName || ""));
  return fs.readFile(path.join(UPLOAD_DIR, safe));
}

export async function removeUpload(storedName) {
  try {
    await fs.unlink(path.join(UPLOAD_DIR, path.basename(String(storedName || ""))));
  } catch {}
}

export function uploadResponse(meta) {
  return fail(meta.error || "Upload failed.", 422);
}
