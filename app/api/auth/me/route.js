import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireUser } from "@/lib/api";
import { getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  return ok({ user });
}

const profileSchema = z.object({
  name: z.string().trim().min(3).max(80).optional(),
  phone: z.string().trim().max(30).optional(),
  department: z.string().trim().max(80).optional(),
  program: z.string().trim().max(80).optional(),
  semester: z.string().trim().max(20).optional(),
  rollNumber: z.string().trim().max(30).optional(),
  bio: z.string().trim().max(400).optional(),
  skills: z.array(z.string().trim().max(40)).max(12).optional(),
  avatar: z.string().trim().max(300).optional(),
});

export async function PATCH(request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await readJson(request);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);

  await connectDB();
  const update = { ...parsed.data };

  if (body.currentPassword || body.newPassword) {
    if (!body.currentPassword || !body.newPassword) {
      return fail("Provide your current and new password.", 422);
    }
    if (String(body.newPassword).length < 8) {
      return fail("New password must be at least 8 characters.", 422);
    }
    const record = await User.findById(user.id).select("+passwordHash");
    const valid = await verifyPassword(body.currentPassword, record.passwordHash);
    if (!valid) return fail("Current password is incorrect.", 401);
    update.passwordHash = await hashPassword(body.newPassword);
  }

  await User.updateOne({ _id: user.id }, { $set: update });
  return ok({ updated: true });
}
