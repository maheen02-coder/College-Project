import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";

export const SESSION_COOKIE = "ceh_session";

const secretKey = new TextEncoder().encode(
  process.env.JWT_SECRET || "kips-campus-event-hub-development-secret"
);

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function signSession(user) {
  return new SignJWT({
    sub: String(user._id),
    role: user.role,
    institute: String(user.institute),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifySession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch {
    return null;
  }
}

export async function signAttendanceToken(eventId, instituteId) {
  return new SignJWT({ event: String(eventId), institute: String(instituteId), scope: "attendance" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2d")
    .sign(secretKey);
}

export async function verifyAttendanceToken(token) {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (payload.scope !== "attendance") return null;
    return payload;
  } catch {
    return null;
  }
}

export function serializeUser(user) {
  if (!user) return null;
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    adminRole: user.adminRole || "",
    adminPermissions: user.adminPermissions || [],
    instituteId: String(user.institute?._id || user.institute),
    instituteName: user.institute?.name || "",
    instituteShort: user.institute?.shortName || "",
    rollNumber: user.rollNumber || "",
    matricRollNumber: user.matricRollNumber || "",
    matricMarks: user.matricMarks ?? null,
    matricTotalMarks: user.matricTotalMarks ?? null,
    matricPercentage: user.matricPercentage ?? null,
    classYear: user.classYear || "",
    section: user.section || "",
    department: user.department || "",
    program: user.program || "",
    semester: user.semester || "",
    phone: user.phone || "",
    avatar: user.avatar || "",
    bio: user.bio || "",
    skills: user.skills || [],
    interests: user.interests || [],
    verificationStatus: user.verificationStatus || "pending",
    verificationNote: user.verificationNote || "",
    points: user.points || 0,
    organizerPermissions: user.organizerPermissions || [],
    isActive: user.isActive,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const payload = await verifySession(token);
  if (!payload?.sub) return null;

  await connectDB();
  const user = await User.findById(payload.sub).populate("institute").lean();
  if (!user || !user.isActive) return null;
  return serializeUser(user);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function isAdmin(user) {
  return Boolean(user && ["admin", "superadmin"].includes(user.role));
}

export function hasAdminPermission(user, permission) {
  if (!user) return false;
  if (user.role === "superadmin") return true;
  if (user.role !== "admin") return false;
  if (!permission) return true;
  return (user.adminPermissions || []).includes(permission);
}

export function canManageEvent(user, event) {
  if (!user) return false;
  if (isAdmin(user)) return hasAdminPermission(user, "manage_events");
  if (user.role !== "organizer") return false;
  if (!user.organizerPermissions?.includes("manage_events")) return false;
  return String(event?.organizer || "") === String(user.id);
}

export function canManageCompetition(user, competition) {
  if (!user) return false;
  if (isAdmin(user)) return hasAdminPermission(user, "manage_competitions") || hasAdminPermission(user, "manage_events");
  if (user.role !== "organizer") return false;
  if (!user.organizerPermissions?.includes("manage_events")) return false;
  return String(competition?.organizer || "") === String(user.id);
}

export function isStaff(user) {
  return Boolean(user && ["admin", "superadmin", "organizer"].includes(user.role));
}
