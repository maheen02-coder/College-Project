import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin, requireUser } from "@/lib/api";
import { hasAdminPermission } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { notifyMany } from "@/lib/notify";
import { CERTIFICATE_TYPES, CERTIFICATE_TYPE_META } from "@/lib/constants";
import { randomCode } from "@/lib/utils";
import Certificate from "@/lib/models/Certificate";
import CertificateTemplate from "@/lib/models/CertificateTemplate";
import Competition from "@/lib/models/Competition";
import CompetitionEntry from "@/lib/models/CompetitionEntry";
import Event from "@/lib/models/Event";
import Registration from "@/lib/models/Registration";
import Society from "@/lib/models/Society";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

const isObjectId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || ""));

const POSITION_TYPE = {
  winner: "winner",
  runner_up: "runner_up",
  second_runner_up: "special_recognition",
  participant: "participation",
  none: "participation",
};

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serialize(cert) {
  return {
    id: String(cert._id),
    certificateId: cert.certificateId,
    type: cert.type,
    recipientName: cert.recipientName,
    activityTitle: cert.activityTitle,
    activityKind: cert.activityKind || "Event",
    reason: cert.reason || "",
    issuedByName: cert.issuedByName || "",
    issuedAt: cert.issuedAt ? new Date(cert.issuedAt).toISOString() : null,
    status: cert.status,
    event:
      cert.event && cert.event.title
        ? { id: String(cert.event._id), title: cert.event.title, slug: cert.event.slug }
        : null,
    competition:
      cert.competition && cert.competition.title
        ? { id: String(cert.competition._id), title: cert.competition.title, slug: cert.competition.slug }
        : null,
    society:
      cert.society && cert.society.name
        ? { id: String(cert.society._id), name: cert.society.name, slug: cert.society.slug }
        : null,
  };
}

async function makeCertificateId() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = `CEH-CERT-${new Date().getFullYear()}-${randomCode(5)}`;
    if (!(await Certificate.exists({ certificateId: candidate }))) return candidate;
  }
  return `CEH-CERT-${new Date().getFullYear()}-${randomCode(8)}`;
}

function buildReason(type, activityTitle) {
  const meta = CERTIFICATE_TYPE_META[type];
  if (!meta) return `Awarded in recognition of ${activityTitle}.`;
  return `${meta.title} ${meta.action} ${activityTitle}.`;
}

export async function GET(request) {
  const { user, response } = await requireUser();
  if (response) return response;

  await connectDB();
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");
  const admin = ["admin", "superadmin"].includes(user.role);

  if (scope === "all" && admin) {
    if (!hasAdminPermission(user, "manage_certificates")) {
      return fail("You do not have permission to do that.", 403);
    }

    const query = { institute: user.instituteId };
    const type = searchParams.get("type");
    if (type && CERTIFICATE_TYPES.includes(type)) query.type = type;
    const status = searchParams.get("status");
    if (status === "valid" || status === "revoked") query.status = status;

    const q = (searchParams.get("q") || "").trim();
    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
      const matches = await User.find({
        institute: user.instituteId,
        $or: [{ name: regex }, { email: regex }, { matricRollNumber: regex }],
      })
        .select("_id")
        .limit(200)
        .lean();
      query.$or = [
        { certificateId: regex },
        { recipientName: regex },
        { activityTitle: regex },
        { user: { $in: matches.map((row) => row._id) } },
      ];
    }

    const rows = await Certificate.find(query)
      .populate("user", "name email matricRollNumber classYear")
      .populate("event", "title slug")
      .populate("competition", "title slug")
      .populate("society", "name slug")
      .sort({ issuedAt: -1 })
      .limit(300)
      .lean();

    return ok({
      certificates: rows.map((cert) => ({
        ...serialize(cert),
        user: cert.user
          ? {
              id: String(cert.user._id),
              name: cert.user.name,
              email: cert.user.email,
              matricRollNumber: cert.user.matricRollNumber || "",
              classYear: cert.user.classYear || "",
            }
          : null,
      })),
    });
  }

  const rows = await Certificate.find({ user: user.id })
    .populate("event", "title slug")
    .populate("competition", "title slug")
    .populate("society", "name slug")
    .sort({ issuedAt: -1 })
    .lean();

  return ok({ certificates: rows.map(serialize) });
}

const schema = z.object({
  type: z.enum(CERTIFICATE_TYPES).optional(),
  templateId: z.string().trim().optional(),
  activityKind: z.enum(["Event", "Competition", "Society", "Achievement"]).optional(),
  activityTitle: z.string().trim().max(160).optional(),
  eventId: z.string().trim().optional(),
  competitionId: z.string().trim().optional(),
  societyId: z.string().trim().optional(),
  reason: z.string().trim().max(300).optional().default(""),
  recipients: z
    .array(
      z.object({
        userId: z.string().trim().min(1),
        position: z.string().trim().optional(),
        reason: z.string().trim().max(300).optional(),
      })
    )
    .optional(),
  entryIds: z.array(z.string().trim().min(1)).max(500).optional(),
  fromAttendance: z.boolean().optional(),
});

export async function POST(request) {
  const { user, response } = await requireAdmin("manage_certificates");
  if (response) return response;

  const body = await readJson(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  if (data.fromAttendance && !data.eventId) {
    return fail("Choose an event for attendance-based certificates.", 422);
  }

  const hasRecipients = Boolean(data.recipients?.length);
  const hasEntries = Boolean(data.entryIds?.length);
  const hasAttendance = Boolean(data.fromAttendance && data.eventId);
  if (!hasRecipients && !hasEntries && !hasAttendance) {
    return fail("Select recipients or entries to issue certificates to.", 422);
  }

  await connectDB();

  if (data.templateId) {
    if (!isObjectId(data.templateId)) return fail("Template not found.", 404);
    const template = await CertificateTemplate.findOne({
      _id: data.templateId,
      institute: user.instituteId,
    }).lean();
    if (!template) return fail("Template not found.", 404);
  }

  let eventDoc = null;
  let competitionDoc = null;
  let societyDoc = null;

  if (data.eventId) {
    if (!isObjectId(data.eventId)) return fail("Event not found.", 404);
    eventDoc = await Event.findOne({ _id: data.eventId, institute: user.instituteId }).lean();
    if (!eventDoc) return fail("Event not found.", 404);
  }
  if (data.competitionId) {
    if (!isObjectId(data.competitionId)) return fail("Competition not found.", 404);
    competitionDoc = await Competition.findOne({
      _id: data.competitionId,
      institute: user.instituteId,
    }).lean();
    if (!competitionDoc) return fail("Competition not found.", 404);
  }
  if (data.societyId) {
    if (!isObjectId(data.societyId)) return fail("Society not found.", 404);
    societyDoc = await Society.findOne({ _id: data.societyId, institute: user.instituteId }).lean();
    if (!societyDoc) return fail("Society not found.", 404);
  }

  let baseTitle = data.activityTitle || "";
  let baseKind = data.activityKind || "";
  if (competitionDoc) {
    baseTitle = baseTitle || competitionDoc.title;
    baseKind = baseKind || "Competition";
  }
  if (eventDoc && !competitionDoc) {
    baseTitle = baseTitle || eventDoc.title;
    baseKind = baseKind || "Event";
  }
  if (societyDoc && !competitionDoc && !eventDoc) {
    baseTitle = baseTitle || societyDoc.name;
    baseKind = baseKind || "Society";
  }
  if (!baseTitle && !data.entryIds?.length) return fail("Provide the activity title.", 422);
  if (!baseKind) baseKind = "Achievement";

  const skipped = [];
  const jobs = [];

  if (data.entryIds?.length) {
    const ids = data.entryIds.filter(isObjectId);
    const entries = ids.length
      ? await CompetitionEntry.find({ _id: { $in: ids }, institute: user.instituteId }).lean()
      : [];
    const found = new Set(entries.map((entry) => String(entry._id)));
    for (const raw of data.entryIds) {
      if (!found.has(String(raw))) skipped.push({ entryId: String(raw), reason: "Entry not found." });
    }

    const competitionIds = [...new Set(entries.map((entry) => String(entry.competition)))];
    const competitions = competitionIds.length
      ? await Competition.find({ _id: { $in: competitionIds } }).lean()
      : [];
    const competitionMap = Object.fromEntries(competitions.map((row) => [String(row._id), row]));

    for (const entry of entries) {
      if (["disqualified", "rejected", "withdrawn"].includes(entry.status)) {
        skipped.push({ userId: String(entry.user), reason: "Entry is not eligible." });
        continue;
      }
      const competition = competitionMap[String(entry.competition)];
      if (!competition) {
        skipped.push({ userId: String(entry.user), reason: "Competition not found." });
        continue;
      }
      jobs.push({
        userId: String(entry.user),
        type: data.type || POSITION_TYPE[entry.position] || "participation",
        eventId: undefined,
        competitionId: entry.competition,
        societyId: competition.society,
        activityTitle: competition.title,
        activityKind: "Competition",
        reason: data.reason,
      });
    }
  }

  if (hasAttendance) {
    const registrations = await Registration.find({
      event: data.eventId,
      institute: user.instituteId,
      $or: [{ attendance: "present" }, { status: "attended" }],
    })
      .select("user")
      .lean();

    for (const registration of registrations) {
      jobs.push({
        userId: String(registration.user),
        type: data.type || "participation",
        eventId: data.eventId,
        competitionId: undefined,
        societyId: undefined,
        activityTitle: baseTitle,
        activityKind: baseKind,
        reason: data.reason,
      });
    }
  }

  for (const recipient of data.recipients || []) {
    jobs.push({
      userId: recipient.userId,
      type: data.type || POSITION_TYPE[recipient.position] || "participation",
      eventId: data.eventId,
      competitionId: data.competitionId,
      societyId: data.societyId,
      activityTitle: baseTitle,
      activityKind: baseKind,
      reason: recipient.reason || data.reason,
    });
  }

  const userIds = [...new Set(jobs.map((job) => job.userId).filter(isObjectId))];
  const students = userIds.length
    ? await User.find({ _id: { $in: userIds }, institute: user.instituteId }).lean()
    : [];
  const studentMap = Object.fromEntries(students.map((student) => [String(student._id), student]));

  const created = [];
  const notifications = [];

  for (const job of jobs) {
    const student = studentMap[job.userId];
    if (!student) {
      skipped.push({ userId: job.userId, reason: "Student not found." });
      continue;
    }
    if (!CERTIFICATE_TYPES.includes(job.type)) {
      skipped.push({ userId: job.userId, reason: "Unsupported certificate type." });
      continue;
    }
    if (!job.activityTitle) {
      skipped.push({ userId: job.userId, reason: "Activity title could not be resolved." });
      continue;
    }

    const duplicateQuery = { user: student._id, type: job.type, status: "valid" };
    if (job.eventId) duplicateQuery.event = job.eventId;
    else if (job.competitionId) duplicateQuery.competition = job.competitionId;
    else if (job.societyId) duplicateQuery.society = job.societyId;
    else duplicateQuery.activityTitle = job.activityTitle;

    if (await Certificate.exists(duplicateQuery)) {
      skipped.push({ userId: job.userId, reason: "Certificate already issued." });
      continue;
    }

    const certificate = await Certificate.create({
      institute: user.instituteId,
      certificateId: await makeCertificateId(),
      user: student._id,
      event: job.eventId || undefined,
      competition: job.competitionId || undefined,
      society: job.societyId || undefined,
      type: job.type,
      recipientName: student.name,
      activityTitle: job.activityTitle,
      activityKind: job.activityKind || "Achievement",
      reason: job.reason || buildReason(job.type, job.activityTitle),
      issuedBy: user.id,
      issuedByName: user.name,
      issuedAt: new Date(),
      status: "valid",
    });
    created.push(certificate);

    notifications.push({
      institute: user.instituteId,
      user: student._id,
      type: "certificate",
      title: `Certificate issued · ${job.activityTitle}`,
      message: "Your certificate is ready to download from your dashboard.",
      link: "/dashboard/certificates",
    });
  }

  if (notifications.length) await notifyMany(notifications);

  if (created.length) {
    const summaryTitle = baseTitle || created[0].activityTitle;
    await logActivity({
      institute: user.instituteId,
      actor: user,
      action: "certificate.issued",
      entityType: "Certificate",
      entityId: created[0]._id,
      summary: `Issued ${created.length} certificate(s) for ${summaryTitle}.`,
    });
  }

  return ok(
    {
      created: created.length,
      certificates: created.map((certificate) => ({
        id: String(certificate._id),
        certificateId: certificate.certificateId,
        userId: String(certificate.user),
        type: certificate.type,
        activityTitle: certificate.activityTitle,
      })),
      skipped,
    },
    { status: created.length ? 201 : 200 }
  );
}
