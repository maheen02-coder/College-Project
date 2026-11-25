import { connectDB } from "@/lib/db";
import Announcement from "@/lib/models/Announcement";
import Category from "@/lib/models/Category";
import Certificate from "@/lib/models/Certificate";
import Competition from "@/lib/models/Competition";
import CompetitionEntry from "@/lib/models/CompetitionEntry";
import Event from "@/lib/models/Event";
import Institute from "@/lib/models/Institute";
import Registration from "@/lib/models/Registration";
import User from "@/lib/models/User";
import { competitionPhase, eventPhase } from "@/lib/utils";

export async function getInstitute() {
  await connectDB();
  const institute = await Institute.findOne({ isActive: true }).sort({ createdAt: 1 }).lean();
  return institute;
}

export function mapEvent(event, registeredCount = 0) {
  if (!event) return null;
  return {
    id: String(event._id),
    title: event.title,
    slug: event.slug,
    excerpt: event.excerpt,
    description: event.description,
    poster: event.poster,
    category: event.category,
    type: event.type,
    startAt: new Date(event.startAt).toISOString(),
    endAt: new Date(event.endAt).toISOString(),
    venue: event.venue,
    organizerId: event.organizer ? String(event.organizer) : "",
    organizerName: event.organizerName,
    registrationOpenAt: new Date(event.registrationOpenAt).toISOString(),
    registrationDeadline: new Date(event.registrationDeadline).toISOString(),
    capacity: event.capacity,
    registeredCount,
    requirements: event.requirements,
    rules: event.rules || [],
    highlights: event.highlights || [],
    featured: Boolean(event.featured),
    status: eventPhase(event),
    storedStatus: event.status,
    createdAt: event.createdAt ? new Date(event.createdAt).toISOString() : null,
  };
}

export function mapCompetition(competition, entryCount = 0) {
  if (!competition) return null;
  return {
    id: String(competition._id),
    title: competition.title,
    slug: competition.slug,
    excerpt: competition.excerpt,
    description: competition.description,
    poster: competition.poster,
    category: competition.category,
    type: competition.type,
    mode: competition.mode,
    teamSize: competition.teamSize,
    venue: competition.venue,
    startAt: new Date(competition.startAt).toISOString(),
    endAt: new Date(competition.endAt).toISOString(),
    registrationDeadline: new Date(competition.registrationDeadline).toISOString(),
    submissionDeadline: competition.submissionDeadline
      ? new Date(competition.submissionDeadline).toISOString()
      : null,
    capacity: competition.capacity,
    entryCount,
    prizeDetails: competition.prizeDetails,
    rules: competition.rules || [],
    requirements: competition.requirements,
    organizerId: competition.organizer ? String(competition.organizer) : "",
    organizerName: competition.organizerName,
    status: competitionPhase(competition),
    storedStatus: competition.status,
    leaderboardPublished: Boolean(competition.leaderboardPublished),
    createdAt: competition.createdAt ? new Date(competition.createdAt).toISOString() : null,
  };
}

export async function countRegistrations(eventIds, extraFilter = {}) {
  if (!eventIds.length) return {};
  await connectDB();
  const rows = await Registration.aggregate([
    {
      $match: {
        event: { $in: eventIds },
        status: { $in: ["pending", "approved", "attended", "absent"] },
        ...extraFilter,
      },
    },
    { $group: { _id: "$event", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
}

export async function countEntries(competitionIds) {
  if (!competitionIds.length) return {};
  await connectDB();
  const rows = await CompetitionEntry.aggregate([
    { $match: { competition: { $in: competitionIds }, status: { $in: ["pending", "approved"] } } },
    { $group: { _id: "$competition", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
}

export async function listEvents({ instituteId, filters = {}, limit = 60 }) {
  await connectDB();
  const query = { institute: instituteId };
  if (filters.category && filters.category !== "All") query.category = filters.category;
  if (filters.scope === "past") {
    query.endAt = { $lt: new Date() };
  } else {
    query.endAt = { $gte: new Date() };
  }
  if (filters.type) query.type = filters.type;
  if (filters.ids) query._id = { $in: filters.ids };

  let events = await Event.find(query).sort({ startAt: 1 }).limit(limit).lean();
  if (filters.q) {
    const q = filters.q.toLowerCase();
    events = events.filter((e) =>
      [e.title, e.category, e.venue, e.organizerName, e.excerpt].join(" ").toLowerCase().includes(q)
    );
  }
  if (filters.status) {
    events = events.filter((e) => eventPhase(e) === filters.status);
  }
  if (filters.sort === "newest") events = events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (filters.sort === "deadline")
    events = events.sort((a, b) => new Date(a.registrationDeadline) - new Date(b.registrationDeadline));

  const counts = await countRegistrations(events.map((e) => e._id));
  return events.map((event) => mapEvent(event, counts[String(event._id)] || 0));
}

export async function getEventBySlug(slug, instituteId) {
  await connectDB();
  const event = await Event.findOne({ slug, institute: instituteId }).lean();
  if (!event) return null;
  const [counts, registrations] = await Promise.all([
    countRegistrations([event._id]),
    Registration.find({ event: event._id })
      .populate("user", "name email rollNumber department program semester avatar")
      .sort({ createdAt: -1 })
      .lean(),
  ]);
  return {
    event: mapEvent(event, counts[String(event._id)] || 0),
    registrations: registrations.map((r) => ({
      id: String(r._id),
      registrationId: r.registrationId,
      status: r.status,
      attendance: r.attendance,
      registeredAt: new Date(r.createdAt).toISOString(),
      note: r.note,
      user: {
        id: String(r.user?._id || ""),
        name: r.user?.name || "Unknown student",
        email: r.user?.email || "",
        rollNumber: r.user?.rollNumber || "",
        department: r.user?.department || "",
        program: r.user?.program || "",
        semester: r.user?.semester || "",
        avatar: r.user?.avatar || "",
      },
    })),
  };
}

export async function listCompetitions({ instituteId, filters = {}, limit = 40 }) {
  await connectDB();
  const query = { institute: instituteId };
  if (filters.type && filters.type !== "All") query.type = filters.type;
  if (filters.category) query.category = filters.category;
  let competitions = await Competition.find(query).sort({ startAt: 1 }).limit(limit).lean();
  if (filters.q) {
    const q = filters.q.toLowerCase();
    competitions = competitions.filter((c) =>
      [c.title, c.category, c.type, c.venue].join(" ").toLowerCase().includes(q)
    );
  }
  const counts = await countEntries(competitions.map((c) => c._id));
  return competitions.map((c) => mapCompetition(c, counts[String(c._id)] || 0));
}

export async function getCompetitionBySlug(slug, instituteId) {
  await connectDB();
  const competition = await Competition.findOne({ slug, institute: instituteId }).lean();
  if (!competition) return null;
  const [counts, entries] = await Promise.all([
    countEntries([competition._id]),
    CompetitionEntry.find({ competition: competition._id })
      .populate("user", "name email rollNumber department avatar")
      .sort({ position: 1, createdAt: 1 })
      .lean(),
  ]);
  return {
    competition: mapCompetition(competition, counts[String(competition._id)] || 0),
    entries: entries.map((e) => ({
      id: String(e._id),
      entryId: e.entryId,
      teamName: e.teamName,
      members: e.members,
      status: e.status,
      score: e.score,
      position: e.position,
      remarks: e.remarks,
      submissionLink: e.submissionLink,
      createdAt: new Date(e.createdAt).toISOString(),
      user: {
        id: String(e.user?._id || ""),
        name: e.user?.name || "Unknown",
        email: e.user?.email || "",
        rollNumber: e.user?.rollNumber || "",
        department: e.user?.department || "",
        avatar: e.user?.avatar || "",
      },
    })),
  };
}

export async function getPublicStats(instituteId) {
  await connectDB();
  const [
    totalEvents,
    upcomingEvents,
    completedEvents,
    totalRegistrations,
    totalParticipants,
    totalCompetitions,
    certificatesIssued,
  ] = await Promise.all([
    Event.countDocuments({ institute: instituteId }),
    Event.countDocuments({ institute: instituteId, startAt: { $gte: new Date() }, status: { $ne: "cancelled" } }),
    Event.countDocuments({ institute: instituteId, endAt: { $lt: new Date() }, status: { $ne: "cancelled" } }),
    Registration.countDocuments({
      institute: instituteId,
      status: { $in: ["pending", "approved", "attended", "absent"] },
    }),
    Registration.distinct("user", { institute: instituteId }),
    Competition.countDocuments({ institute: instituteId }),
    Certificate.countDocuments({ institute: instituteId, status: "valid" }),
  ]);
  return {
    totalEvents,
    upcomingEvents,
    completedEvents,
    totalRegistrations,
    totalParticipants: totalParticipants.length,
    totalCompetitions,
    certificatesIssued,
  };
}

export async function getAdminStats(instituteId) {
  await connectDB();
  const [publicStats, totalStudents, totalOrganizers, totalAdmins, pendingRegistrations, attendedCount] =
    await Promise.all([
      getPublicStats(instituteId),
      User.countDocuments({ institute: instituteId, role: "student" }),
      User.countDocuments({ institute: instituteId, role: "organizer" }),
      User.countDocuments({ institute: instituteId, role: { $in: ["admin", "superadmin"] } }),
      Registration.countDocuments({ institute: instituteId, status: "pending" }),
      Registration.countDocuments({ institute: instituteId, attendance: "present" }),
    ]);
  const attendanceBase = await Registration.countDocuments({
    institute: instituteId,
    attendance: { $in: ["present", "absent"] },
  });
  return {
    ...publicStats,
    totalStudents,
    totalOrganizers,
    totalAdmins,
    pendingRegistrations,
    attendedCount,
    attendanceRate: attendanceBase ? Math.round((attendedCount / attendanceBase) * 100) : 0,
  };
}

export async function getActiveAnnouncements(instituteId, limit = 5) {
  await connectDB();
  const rows = await Announcement.find({ institute: instituteId, isActive: true })
    .sort({ pinned: -1, createdAt: -1 })
    .limit(limit)
    .lean();
  return rows.map((a) => ({
    id: String(a._id),
    title: a.title,
    body: a.body,
    pinned: a.pinned,
    audience: a.audience,
    publishedByName: a.publishedByName,
    createdAt: new Date(a.createdAt).toISOString(),
  }));
}

export async function getCategories(instituteId) {
  await connectDB();
  const rows = await Category.find({ institute: instituteId }).sort({ name: 1 }).lean();
  return rows.map((c) => ({
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    description: c.description,
    icon: c.icon,
    color: c.color,
    scope: c.scope,
  }));
}

export async function getLeaderboardPreview(instituteId) {
  await connectDB();
  const competition = await Competition.findOne({
    institute: instituteId,
    status: "completed",
    leaderboardPublished: true,
  })
    .sort({ endAt: -1 })
    .lean();
  if (!competition) return null;

  const entries = await CompetitionEntry.find({
    competition: competition._id,
    position: { $in: ["winner", "runner_up", "second_runner_up"] },
  })
    .populate("user", "name department avatar")
    .sort({ position: 1 })
    .limit(3)
    .lean();

  const rank = { winner: 0, runner_up: 1, second_runner_up: 2 };
  return {
    competition: {
      title: competition.title,
      slug: competition.slug,
      category: competition.category,
      type: competition.type,
    },
    entries: entries
      .sort((a, b) => (rank[a.position] ?? 9) - (rank[b.position] ?? 9))
      .map((entry) => ({
        id: String(entry._id),
        teamName: entry.teamName,
        position: entry.position,
        score: entry.score,
        name: entry.user?.name || "Unknown",
        department: entry.user?.department || "",
      })),
  };
}

export async function getCertificatesForUser(userId) {
  await connectDB();
  const rows = await Certificate.find({ user: userId }).sort({ issuedAt: -1 }).lean();
  return rows.map(mapCertificate);
}

export function mapCertificate(cert) {
  return {
    id: String(cert._id),
    certificateId: cert.certificateId,
    type: cert.type,
    recipientName: cert.recipientName,
    activityTitle: cert.activityTitle,
    activityKind: cert.activityKind,
    reason: cert.reason,
    issuedByName: cert.issuedByName,
    issuedAt: new Date(cert.issuedAt).toISOString(),
    status: cert.status,
  };
}
