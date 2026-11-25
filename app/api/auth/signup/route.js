import { cookies } from "next/headers";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson } from "@/lib/api";
import { hashPassword, SESSION_COOKIE, serializeUser, sessionCookieOptions, signSession } from "@/lib/auth";
import { CLASS_YEARS, DEPARTMENTS } from "@/lib/constants";
import { clientKey, rateLimit } from "@/lib/ratelimit";
import { getInstitute } from "@/lib/queries";
import User from "@/lib/models/User";

const schema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name.").max(80),
    matricRollNumber: z
      .string()
      .trim()
      .toUpperCase()
      .min(2, "Enter your matric roll number.")
      .max(40),
    marksObtained: z.coerce.number().int("Marks must be a whole number.").min(0, "Marks cannot be negative."),
    totalMarks: z.coerce.number().int("Total marks must be a whole number.").positive("Total marks must be greater than zero."),
    classYear: z.enum(CLASS_YEARS),
    section: z.string().trim().min(1, "Enter your section.").max(3, "Section must be 1-3 characters."),
    department: z.enum(DEPARTMENTS),
    email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(120),
    phone: z.string().trim().min(6, "Enter your phone number.").max(30),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72)
      .regex(/[a-z]/, "Include a lowercase letter.")
      .regex(/[A-Z]/, "Include an uppercase letter.")
      .regex(/[0-9]/, "Include a number."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .superRefine((data, ctx) => {
    if (data.marksObtained > data.totalMarks) {
      ctx.addIssue({ code: "custom", path: ["marksObtained"], message: "Marks cannot exceed total marks." });
    }
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match." });
    }
  });

export async function POST(request) {
  const limit = rateLimit(clientKey(request, "signup"), { limit: 6, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) {
    return fail("Too many sign-up attempts. Please try again later.", 429, { retryAfter: limit.retryAfter });
  }

  const body = await readJson(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);

  const data = parsed.data;

  try {
    await connectDB();
    const institute = await getInstitute();
    if (!institute) return fail("Platform is not configured yet. Please try again later.", 503);

    if (await User.exists({ email: data.email })) {
      return fail("An account with this email already exists.", 409);
    }
    if (await User.exists({ institute: institute._id, matricRollNumber: data.matricRollNumber })) {
      return fail("This matric roll number is already registered.", 409);
    }

    const percentage = Math.round((data.marksObtained / data.totalMarks) * 1000) / 10;

    const user = await User.create({
      institute: institute._id,
      name: data.fullName,
      email: data.email,
      passwordHash: await hashPassword(data.password),
      role: "student",
      matricRollNumber: data.matricRollNumber,
      matricMarks: data.marksObtained,
      matricTotalMarks: data.totalMarks,
      matricPercentage: percentage,
      classYear: data.classYear,
      section: data.section,
      department: data.department,
      phone: data.phone,
      verificationStatus: "pending",
      points: 0,
    });

    user.lastLoginAt = new Date();
    await user.save();

    const token = await signSession(user);
    const store = await cookies();
    store.set(SESSION_COOKIE, token, sessionCookieOptions());

    return ok({ user: serializeUser({ ...user.toObject(), institute }) }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) {
      return fail("An account with this email or matric roll number already exists.", 409);
    }
    return fail("Could not create your account. Please try again.", 500);
  }
}
