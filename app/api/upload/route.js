import fs from "node:fs/promises";
import path from "node:path";
import { fail, ok, requireUser } from "@/lib/api";
import { randomCode } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ALLOWED = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function POST(request) {
  const { response } = await requireUser(["admin", "superadmin"]);
  if (response) return response;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") return fail("Choose an image to upload.", 422);

  const extension = ALLOWED[file.type];
  if (!extension) return fail("Only JPG, PNG, WebP or AVIF images are allowed.", 415);
  if (file.size > 5 * 1024 * 1024) return fail("Images must be 5 MB or smaller.", 413);

  const dir = path.join(process.cwd(), "public", "uploads", "posters");
  await fs.mkdir(dir, { recursive: true });
  const name = `upload-${Date.now()}-${randomCode(4).toLowerCase()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, name), buffer);

  return ok({ url: `/uploads/posters/${name}` });
}
