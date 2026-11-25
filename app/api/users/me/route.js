import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireUser } from "@/lib/api";
import { serializeUser } from "@/lib/auth";
import { CLASS_YEARS, DEPARTMENTS } from "@/lib/constants";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

const ACADEMIC_KEYS = ["matricRollNumber", "marksObtained", "totalMarks", "classYear", "section", "department"];

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80).optional(),
  phone: z.string().trim().max(30).optional(),
  bio: z.string().trim().max(600).optional(),
  avatar: z.string().trim().max(400).optional(),
  skills: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  interests: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  matricRollNumber: z.string().trim().toUpperCase().min(2).max(40).optional(),
  marksObtained: z.coerce.number().int().min(0).optional(),
  totalMarks: z.coerce.number().int().positive().optional(),
  classYear: z.enum(CLASS_YEARS).optional(),
  section: z.string().trim().min(1).max(3).optional(),
  department: z.enum(DEPARTMENTS).optional(),
});

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;
  return ok({ user });
}

export async function PATCH(request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await readJson(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  const touchedAcademic = ACADEMIC_KEYS.filter(
    (key) => Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined && body[key] !== ""
  );

  if (touchedAcademic.length) {
    if (user.role !== "student") {
      return fail("Administrative accounts do not have academic records.", 409);
    }
    if (user.verificationStatus === "verified") {
      return fail("Academic details are locked after verification. Contact the activities office to correct them.", 409);
    }
  }

  await connectDB();

  const updates = {};
  for (const key of ["name", "phone", "bio", "avatar"]) {
    if (data[key] !== undefined) updates[key] = data[key];
  }
  if (data.skills !== undefined) updates.skills = [...new Set(data.skills)];
  if (data.interests !== undefined) updates.interests = [...new Set(data.interests)];
  if (data.matricRollNumber !== undefined) updates.matricRollNumber = data.matricRollNumber;
  if (data.classYear !== undefined) updates.classYear = data.classYear;
  if (data.section !== undefined) updates.section = data.section;
  if (data.department !== undefined) updates.department = data.department;

  if (data.marksObtained !== undefined || data.totalMarks !== undefined) {
    const marks = data.marksObtained !== undefined ? data.marksObtained : user.matricMarks;
    const total = data.totalMarks !== undefined ? data.totalMarks : user.matricTotalMarks;
    if (!total || marks === null || marks === undefined) {
      return fail("Provide both marks obtained and total marks.", 422);
    }
    if (marks > total) return fail("Marks cannot exceed total marks.", 422);
    updates.matricMarks = marks;
    updates.matricTotalMarks = total;
    updates.matricPercentage = Math.round((marks / total) * 1000) / 10;
  }

  try {
    if (Object.keys(updates).length) {
      await User.updateOne({ _id: user.id }, { $set: updates });
    }
  } catch (error) {
    if (error?.code === 11000) return fail("That matric roll number is already registered.", 409);
    return fail("Could not update your profile. Please try again.", 500);
  }

  const fresh = await User.findById(user.id).populate("institute").lean();
  return ok({ user: serializeUser(fresh) });
}
