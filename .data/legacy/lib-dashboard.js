import { connectDB } from "@/lib/db";
import Announcement from "@/lib/models/Announcement";
import Certificate from "@/lib/models/Certificate";
import Competition from "@/lib/models/Competition";
import CompetitionEntry from "@/lib/models/CompetitionEntry";
import Event from "@/lib/models/Event";
import Notification from "@/lib/models/Notification";
import Registration from "@/lib/models/Registration";
import User from "@/lib/models/User";
import { competitionPhase, eventPhase } from "@/lib/utils";
import { mapCertificate } from "@/lib/queries";

const ACTIVE_REG = ["pending", "approved", "attended", "absent"];

function mapRegEvent(event) {
  return {
    id: String(event._id),
    title: event.title,
    slug: event.slug,
    poster: event.poster,
    category: event.category,
    type: event.type,
    startAt: new Date(event.startAt).toISOString(),
    endAt: new Date(event.endAt).toISOString(),
    venue: event.venue,
    status: eventPhase(event),
    registrationDeadline: new Date(event.registrationDeadline).toISOString(),
  };
}

export function mapRegRow(r) {
  return {
    id: String(r._id),
    registrationId: r.registrationId,
    status: r.status,
    attendance: r.attendance,
    note: r.note || "",
    registeredAt: new Date(r.createdAt).toISOString(),
    attendedAt: r.attendedAt ? new Date(r.attendedAt).toISOString() : null,
    user: r.user
      ? {
          id: String(r.user._id || ""),
          name: r.user.name || "Unknown",
          email: r.user.email || "",
          rollNumber: r.user.rollNumber || "",
          department: r.user.department || "",
          program: r.user.program || "",
          semester: r.user.semester || "",
          avatar: r.user.avatar || "",
        }
      : null,
    event: r.event ? mapRegEvent(r.event) : null,
  };
}

export function mapEntryRow(e) {
  return {
    id: String(e._id),
    entryId: e.entryId,
    teamName: e.teamName,
    members: e.members || [],
    status: e.status,
    score: e.score,
    position: e.position,
    remarks: e.remarks || "",
    submissionLink: e.submissionLink || "",
    createdAt: new Date(e.createdAt).toISOString(),
    user: {
      id: String(e.user?._id || ""),
      name: e.user?.name || "Unknown",
      email: e.user?.email || "",
      rollNumber: e.user?.rollNumber || "",
      department: e.user?.department || "",
      avatar: e.user?.avatar || "",
    },
    competition: e.competition
      ? {
          id: String(e.competition._id),
          title: e.competition.title,
          slug: e.competition.slug,
          poster: e.competition.poster,
          type: e.competition.type,
          category: e.competition.category,
          mode: e.competition.mode,
          startAt: new Date(e.competition.startAt).toISOString(),
          endAt: new Date(e.competition.endAt).toISOString(),
          status: competitionPhase(e.competition),
          leaderboardPublished: Boolean(e.competition.leaderboardPublished),
        }
      : null,
  };
}

export async function getStudentDashboard(user) {
  await connectDB();
  const [regs, entries, certificates, notifications, announcements] = await Promise.all([
    Registration.find({ user: user.id })
      .populate("event", "title slug poster category type startAt endAt venue registrationDeadline status")
      .sort({ createdAt: -1 })
      .lean(),
    CompetitionEntry.find({ user: user.id })
      .populate("competition", "title slug poster type category mode startAt endAt leaderboardPublished status")
      .sort({ createdAt: -1 })
      .lean(),
    Certificate.find({ user: user.id }).sort({ issuedAt: -1 }).lean(),
    Notification.find({ user: user.id }).sort({ createdAt: -1 }).limit(5).lean(),
    Announcement.find({ institute: user.instituteId, isActive: true }).sort({ pinned: -1, createdAt: -1 }).limit(3).lean(),
  ]);

  const registrations = regs.filter((r) => r.event).map(mapRegRow);
  const now = Date.now();
  const upcoming = registrations
    .filter(
      (r) =>
        new Date(r.event.startAt).getTime() >= now && ["pending", "approved"].includes(r.status)
    )
    .sort((a, b) => new Date(a.event.startAt) - new Date(b.event.startAt));

  return {
    registrations,
    upcoming,
    entries: entries.filter((e) => e.competition).map(mapEntryRow),
    certificates: certificates.map(mapCertificate),
    notifications: notifications.map((n) => ({
      id: String(n._id),
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      read: n.read,
      createdAt: new Date(n.createdAt).toISOString(),
    })),
    announcements: announcements.map((a) => ({
      id: String(a._id),
      title: a.title,
      body: a.body,
      pinned: a.pinned,
      publishedByName: a.publishedByName,
      createdAt: new Date(a.createdAt).toISOString(),
    })),
    stats: {
      registered: registrations.filter((r) => ACTIVE_REG.includes(r.status)).length,
      attended: registrations.filter((r) => r.attendance === "present").length,
      certificates: certificates.filter((c) => c.status === "valid").length,
      competitions: entries.filter((e) => ["pending", "approved"].includes(e.status)).length,
    },
  };
}

export async function getMyRegistrations(userId) {
  await connectDB();
  const rows = await Registration.find({ user: userId })
    .populate("event", "title slug poster category type startAt endAt venue registrationDeadline status")
    .sort({ createdAt: -1 })
    .lean();
  return rows.filter((r) => r.event).map(mapRegRow);
}

export async function getMyEntries(userId) {
  await connectDB();
  const rows = await CompetitionEntry.find({ user: userId })
    .populate("competition", "title slug poster type category mode startAt endAt leaderboardPublished status")
    .sort({ createdAt: -1 })
    .lean();
  return rows.filter((e) => e.competition).map(mapEntryRow);
}

export async function getStaffEvents(user) {
  await connectDB();
  const query = { institute: user.instituteId };
  if (user.role === "organizer") query.organizer = user.id;

  const events = await Event.find(query).sort({ startAt: -1 }).limit(200).lean();
  const ids = events.map((e) => e._id);
  const [counts, attendance] = await Promise.all([
    Registration.aggregate([
      { $match: { event: { $in: ids }, status: { $in: ACTIVE_REG } } },
      { $group: { _id: "$event", count: { $sum: 1 } } },
    ]),
    Registration.aggregate([
      { $match: { event: { $in: ids }, attendance: "present" } },
      { $group: { _id: "$event", count: { $sum: 1 } } },
    ]),
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
  const presentMap = Object.fromEntries(attendance.map((c) => [String(c._id), c.count]));

  return events.map((event) => ({
    id: String(event._id),
    title: event.title,
    slug: event.slug,
    poster: event.poster,
    category: event.category,
    type: event.type,
    startAt: new Date(event.startAt).toISOString(),
    endAt: new Date(event.endAt).toISOString(),
    venue: event.venue,
    organizerName: event.organizerName,
    capacity: event.capacity,
    featured: Boolean(event.featured),
    status: eventPhase(event),
    storedStatus: event.status,
    registeredCount: countMap[String(event._id)] || 0,
    presentCount: presentMap[String(event._id)] || 0,
    createdAt: new Date(event.createdAt).toISOString(),
  }));
}

export async function getEventConsole(eventId) {
  await connectDB();
  const event = await Event.findById(eventId).lean();
  if (!event) return null;
  const [regs, certificates] = await Promise.all([
    Registration.find({ event: event._id })
      .populate("user", "name email rollNumber department program semester avatar")
      .populate("event", "title slug poster category type startAt endAt venue registrationDeadline status")
      .sort({ createdAt: -1 })
      .lean(),
    Certificate.find({ event: event._id, status: "valid" }).select("user type").lean(),
  ]);

  const certMap = {};
  for (const cert of certificates) {
    const key = String(cert.user);
    certMap[key] = [...(certMap[key] || []), cert.type];
  }

  return {
    event: {
      id: String(event._id),
      title: event.title,
      slug: event.slug,
      poster: event.poster,
      category: event.category,
      type: event.type,
      startAt: new Date(event.startAt).toISOString(),
      endAt: new Date(event.endAt).toISOString(),
      venue: event.venue,
      organizerId: String(event.organizer || ""),
      organizerName: event.organizerName,
      capacity: event.capacity,
      status: eventPhase(event),
      storedStatus: event.status,
      registrationDeadline: new Date(event.registrationDeadline).toISOString(),
      description: event.description,
      requirements: event.requirements,
      rules: event.rules || [],
    },
    registrations: regs.map(mapRegRow),
    certificates: certMap,
  };
}

export async function getStaffCompetitions(user) {
  await connectDB();
  const query = { institute: user.instituteId };
  if (user.role === "organizer") query.organizer = user.id;

  const competitions = await Competition.find(query).sort({ startAt: -1 }).limit(200).lean();
  const ids = competitions.map((c) => c._id);
  const entries = await CompetitionEntry.aggregate([
    { $match: { competition: { $in: ids }, status: { $in: ["pending", "approved"] } } },
    { $group: { _id: "$competition", count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(entries.map((row) => [String(row._id), row.count]));

  return competitions.map((c) => ({
    id: String(c._id),
    title: c.title,
    slug: c.slug,
    poster: c.poster,
    type: c.type,
    category: c.category,
    mode: c.mode,
    teamSize: c.teamSize,
    venue: c.venue,
    startAt: new Date(c.startAt).toISOString(),
    endAt: new Date(c.endAt).toISOString(),
    registrationDeadline: new Date(c.registrationDeadline).toISOString(),
    submissionDeadline: c.submissionDeadline ? new Date(c.submissionDeadline).toISOString() : null,
    capacity: c.capacity,
    prizeDetails: c.prizeDetails,
    organizerName: c.organizerName,
    status: competitionPhase(c),
    storedStatus: c.status,
    leaderboardPublished: Boolean(c.leaderboardPublished),
    entryCount: countMap[String(c._id)] || 0,
    createdAt: new Date(c.createdAt).toISOString(),
  }));
}

export async function getCompetitionConsole(competitionId) {
  await connectDB();
  const competition = await Competition.findById(competitionId).lean();
  if (!competition) return null;
  const [entries, certificates] = await Promise.all([
    CompetitionEntry.find({ competition: competition._id })
      .populate("user", "name email rollNumber department avatar")
      .populate("competition", "title slug poster type category mode startAt endAt leaderboardPublished status")
      .sort({ createdAt: 1 })
      .lean(),
    Certificate.find({ competition: competition._id, status: "valid" }).select("user type").lean(),
  ]);

  const certMap = {};
  for (const cert of certificates) {
    const key = String(cert.user);
    certMap[key] = [...(certMap[key] || []), cert.type];
  }

  return {
    competition: {
      id: String(competition._id),
      title: competition.title,
      slug: competition.slug,
      poster: competition.poster,
      type: competition.type,
      category: competition.category,
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
      prizeDetails: competition.prizeDetails,
      rules: competition.rules || [],
      requirements: competition.requirements,
      organizerId: String(competition.organizer || ""),
      organizerName: competition.organizerName,
      status: competitionPhase(competition),
      storedStatus: competition.status,
      leaderboardPublished: Boolean(competition.leaderboardPublished),
    },
    entries: entries.map(mapEntryRow),
    certificates: certMap,
  };
}

export async function getOrganizerSummary(user) {
  await connectDB();
  const [events, competitions] = await Promise.all([getStaffEvents(user), getStaffCompetitions(user)]);
  const eventIds = events.map((event) => event.id);
  const pending = await Registration.countDocuments({
    event: { $in: eventIds },
    status: "pending",
  });

  const registered = events.reduce((sum, event) => sum + event.registeredCount, 0);
  const present = events.reduce((sum, event) => sum + event.presentCount, 0);
  const upcoming = events.filter((event) => ["upcoming", "registration_open", "registration_closed"].includes(event.status));

  return {
    events,
    competitions,
    totals: {
      events: events.length,
      upcoming: upcoming.length,
      registrations: registered,
      present,
      pending,
      attendanceRate: registered ? Math.round((present / registered) * 100) : 0,
      competitions: competitions.length,
      entries: competitions.reduce((sum, competition) => sum + competition.entryCount, 0),
    },
  };
}

export async function getStaffRegistrations(user) {
  await connectDB();
  const eventQuery = { institute: user.instituteId };
  if (user.role === "organizer") eventQuery.organizer = user.id;
  const events = await Event.find(eventQuery).select("_id").lean();
  const rows = await Registration.find({ event: { $in: events.map((event) => event._id) } })
    .populate("user", "name email rollNumber department program semester avatar")
    .populate("event", "title slug poster category type startAt endAt venue registrationDeadline status")
    .sort({ createdAt: -1 })
    .limit(600)
    .lean();
  return rows.filter((row) => row.event && row.user).map(mapRegRow);
}

export async function getStaffCertificates(user) {
  await connectDB();
  const eventQuery = { institute: user.instituteId };
  const competitionQuery = { institute: user.instituteId };
  if (user.role === "organizer") {
    eventQuery.organizer = user.id;
    competitionQuery.organizer = user.id;
  }
  const [events, competitions] = await Promise.all([
    Event.find(eventQuery).select("_id").lean(),
    Competition.find(competitionQuery).select("_id").lean(),
  ]);
  const rows = await Certificate.find({
    institute: user.instituteId,
    $or: [
      { event: { $in: events.map((event) => event._id) } },
      { competition: { $in: competitions.map((competition) => competition._id) } },
    ],
  })
    .populate("user", "name email rollNumber department")
    .sort({ issuedAt: -1 })
    .limit(400)
    .lean();

  return rows.map((cert) => ({
    ...mapCertificate(cert),
    user: {
      id: String(cert.user?._id || ""),
      name: cert.user?.name || "Unknown",
      email: cert.user?.email || "",
      rollNumber: cert.user?.rollNumber || "",
      department: cert.user?.department || "",
    },
  }));
}

export async function getEventEditorData(eventId) {
  await connectDB();
  const event = await Event.findById(eventId).lean();
  if (!event) return null;
  return {
    id: String(event._id),
    title: event.title,
    excerpt: event.excerpt || "",
    description: event.description,
    category: event.category,
    type: event.type,
    venue: event.venue,
    capacity: event.capacity,
    startAt: new Date(event.startAt).toISOString(),
    endAt: new Date(event.endAt).toISOString(),
    registrationOpenAt: new Date(event.registrationOpenAt).toISOString(),
    registrationDeadline: new Date(event.registrationDeadline).toISOString(),
    requirements: event.requirements || "",
    rules: event.rules || [],
    highlights: event.highlights || [],
    featured: Boolean(event.featured),
    poster: event.poster || "",
    storedStatus: event.status,
    organizerId: String(event.organizer || ""),
    organizerName: event.organizerName,
  };
}

export async function getCompetitionEditorData(competitionId) {
  await connectDB();
  const competition = await Competition.findById(competitionId).lean();
  if (!competition) return null;
  return {
    id: String(competition._id),
    title: competition.title,
    excerpt: competition.excerpt || "",
    description: competition.description,
    category: competition.category,
    type: competition.type,
    mode: competition.mode,
    teamSize: competition.teamSize,
    venue: competition.venue,
    capacity: competition.capacity,
    startAt: new Date(competition.startAt).toISOString(),
    endAt: new Date(competition.endAt).toISOString(),
    registrationDeadline: new Date(competition.registrationDeadline).toISOString(),
    submissionDeadline: competition.submissionDeadline
      ? new Date(competition.submissionDeadline).toISOString()
      : null,
    prizeDetails: competition.prizeDetails || "",
    rules: competition.rules || [],
    requirements: competition.requirements || "",
    poster: competition.poster || "",
    storedStatus: competition.status,
    leaderboardPublished: Boolean(competition.leaderboardPublished),
    organizerId: String(competition.organizer || ""),
    organizerName: competition.organizerName,
  };
}

export async function getUserDirectory(instituteId, role) {
  await connectDB();
  const query = { institute: instituteId };
  if (role) query.role = role;
  const users = await User.find(query).sort({ createdAt: -1 }).limit(500).lean();
  const ids = users.map((u) => u._id);

  const [regCounts, entryCounts, certCounts] = await Promise.all([
    Registration.aggregate([
      { $match: { user: { $in: ids }, status: { $in: ACTIVE_REG } } },
      { $group: { _id: "$user", count: { $sum: 1 } } },
    ]),
    CompetitionEntry.aggregate([
      { $match: { user: { $in: ids }, status: { $in: ["pending", "approved"] } } },
      { $group: { _id: "$user", count: { $sum: 1 } } },
    ]),
    Certificate.aggregate([
      { $match: { user: { $in: ids }, status: "valid" } },
      { $group: { _id: "$user", count: { $sum: 1 } } },
    ]),
  ]);

  const count = (rows) => Object.fromEntries(rows.map((row) => [String(row._id), row.count]));

  return users.map((u) => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    rollNumber: u.rollNumber,
    department: u.department,
    program: u.program,
    semester: u.semester,
    phone: u.phone,
    isActive: u.isActive,
    organizerPermissions: u.organizerPermissions || [],
    registrations: count(regCounts)[String(u._id)] || 0,
    entries: count(entryCounts)[String(u._id)] || 0,
    certificates: count(certCounts)[String(u._id)] || 0,
    createdAt: new Date(u.createdAt).toISOString(),
    lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
  }));
}

export async function getAllRegistrations(instituteId) {
  await connectDB();
  const rows = await Registration.find({ institute: instituteId })
    .populate("user", "name email rollNumber department program semester avatar")
    .populate("event", "title slug poster category type startAt endAt venue registrationDeadline status")
    .sort({ createdAt: -1 })
    .limit(600)
    .lean();
  return rows.filter((r) => r.event && r.user).map(mapRegRow);
}

export async function getAttendanceOverview(instituteId) {
  await connectDB();
  const rows = await Registration.aggregate([
    {
      $match: {
        institute: instituteId,
        status: { $in: ACTIVE_REG },
      },
    },
    {
      $group: {
        _id: "$event",
        active: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ["$attendance", "present"] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ["$attendance", "absent"] }, 1, 0] } },
        unmarked: { $sum: { $cond: [{ $eq: ["$attendance", "unmarked"] }, 1, 0] } },
      },
    },
  ]);

  const map = Object.fromEntries(rows.map((row) => [String(row._id), row]));
  const events = await Event.find({ institute: instituteId }).sort({ startAt: -1 }).limit(120).lean();

  return events.map((event) => {
    const stats = map[String(event._id)] || { active: 0, present: 0, absent: 0, unmarked: 0 };
    return {
      id: String(event._id),
      title: event.title,
      slug: event.slug,
      category: event.category,
      startAt: new Date(event.startAt).toISOString(),
      status: eventPhase(event),
      venue: event.venue,
      ...stats,
      rate: stats.present + stats.absent ? Math.round((stats.present / (stats.present + stats.absent)) * 100) : 0,
    };
  });
}

export async function getAllCertificates(instituteId) {
  await connectDB();
  const rows = await Certificate.find({ institute: instituteId })
    .populate("user", "name email rollNumber department")
    .sort({ issuedAt: -1 })
    .limit(400)
    .lean();
  return rows.map((cert) => ({
    ...mapCertificate(cert),
    user: {
      id: String(cert.user?._id || ""),
      name: cert.user?.name || "Unknown",
      email: cert.user?.email || "",
      rollNumber: cert.user?.rollNumber || "",
      department: cert.user?.department || "",
    },
  }));
}

export async function getResultsOverview(instituteId) {
  await connectDB();
  const competitions = await Competition.find({ institute: instituteId }).sort({ endAt: -1 }).limit(80).lean();
  const ids = competitions.map((c) => c._id);
  const entries = await CompetitionEntry.find({ competition: { $in: ids } })
    .populate("user", "name department")
    .lean();

  const rank = { winner: 0, runner_up: 1, second_runner_up: 2, participant: 3, none: 4 };
  return competitions.map((competition) => {
    const related = entries
      .filter((entry) => String(entry.competition) === String(competition._id))
      .sort((a, b) => (rank[a.position] ?? 9) - (rank[b.position] ?? 9) || (b.score ?? 0) - (a.score ?? 0));
    const placed = related.filter((entry) => entry.position && entry.position !== "none");
    return {
      id: String(competition._id),
      title: competition.title,
      slug: competition.slug,
      type: competition.type,
      mode: competition.mode,
      status: competitionPhase(competition),
      leaderboardPublished: Boolean(competition.leaderboardPublished),
      entryCount: related.length,
      judged: placed.length,
      winners: placed.slice(0, 3).map((entry) => ({
        id: String(entry._id),
        name: entry.teamName || entry.user?.name || "Unknown",
        captain: entry.user?.name || "",
        position: entry.position,
        score: entry.score,
      })),
    };
  });
}

export async function getAnnouncementBoard(instituteId) {
  await connectDB();
  const rows = await Announcement.find({ institute: instituteId }).sort({ pinned: -1, createdAt: -1 }).lean();
  return rows.map((a) => ({
    id: String(a._id),
    title: a.title,
    body: a.body,
    audience: a.audience,
    pinned: a.pinned,
    isActive: a.isActive,
    publishedByName: a.publishedByName,
    createdAt: new Date(a.createdAt).toISOString(),
  }));
}

export async function getAnalytics(instituteId) {
  await connectDB();
  const [events, competitions, registrations, certificates, students, organizers, entries] = await Promise.all([
    Event.find({ institute: instituteId }).lean(),
    Competition.find({ institute: instituteId }).lean(),
    Registration.find({ institute: instituteId }).lean(),
    Certificate.find({ institute: instituteId, status: "valid" }).lean(),
    User.countDocuments({ institute: instituteId, role: "student" }),
    User.countDocuments({ institute: instituteId, role: "organizer" }),
    CompetitionEntry.find({ institute: instituteId }).lean(),
  ]);

  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString("en-GB", { month: "short" }),
      count: 0,
    });
  }
  const monthMap = Object.fromEntries(months.map((m) => [m.key, m]));
  for (const registration of registrations) {
    const date = new Date(registration.createdAt);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (monthMap[key]) monthMap[key].count += 1;
  }

  const categoryMap = {};
  for (const event of events) categoryMap[event.category] = (categoryMap[event.category] || 0) + 1;
  const categories = Object.entries(categoryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const perEvent = {};
  for (const registration of registrations) {
    if (!ACTIVE_REG.includes(registration.status)) continue;
    const key = String(registration.event);
    perEvent[key] = (perEvent[key] || 0) + 1;
  }
  const topEvents = events
    .map((event) => ({
      id: String(event._id),
      title: event.title,
      slug: event.slug,
      category: event.category,
      startAt: new Date(event.startAt).toISOString(),
      registrations: perEvent[String(event._id)] || 0,
      capacity: event.capacity,
    }))
    .sort((a, b) => b.registrations - a.registrations)
    .slice(0, 6);

  const statusCounts = {};
  for (const event of events) statusCounts[eventPhase(event)] = (statusCounts[eventPhase(event)] || 0) + 1;

  const presented = registrations.filter((r) => r.attendance === "present").length;
  const marked = registrations.filter((r) => ["present", "absent"].includes(r.attendance)).length;

  return {
    months,
    categories,
    topEvents,
    statusCounts,
    roleCounts: { students, organizers },
    totals: {
      events: events.length,
      competitions: competitions.length,
      registrations: registrations.filter((r) => ACTIVE_REG.includes(r.status)).length,
      entries: entries.filter((e) => ["pending", "approved"].includes(e.status)).length,
      certificates: certificates.length,
      attendanceRate: marked ? Math.round((presented / marked) * 100) : 0,
    },
  };
}
