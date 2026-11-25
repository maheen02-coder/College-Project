import { cookies } from "next/headers";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson } from "@/lib/api";
import { SESSION_COOKIE, serializeUser, sessionCookieOptions, signSession, verifyPassword } from "@/lib/auth";
import User from "@/lib/models/User";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function POST(request) {
  const body = await readJson(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);

  await connectDB();
  const user = await User.findOne({ email: parsed.data.email })
    .select("+passwordHash")
    .populate("institute");

  if (!user) return fail("Incorrect email or password.", 401);
  if (!user.isActive) return fail("This account has been deactivated. Contact the activities office.", 403);

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return fail("Incorrect email or password.", 401);

  user.lastLoginAt = new Date();
  await user.save();

  const token = await signSession(user);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());

  return ok({ user: serializeUser(user) });
}
