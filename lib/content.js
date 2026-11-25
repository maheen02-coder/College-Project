import { connectDB } from "@/lib/db";
import Announcement from "@/lib/models/Announcement";
import Certificate from "@/lib/models/Certificate";
import Competition from "@/lib/models/Competition";
import CompetitionEntry from "@/lib/models/CompetitionEntry";
import Event from "@/lib/models/Event";
import Gallery from "@/lib/models/Gallery";
import Question from "@/lib/models/Question";
import Recruitment from "@/lib/models/Recruitment";
import Registration from "@/lib/models/Registration";
import Society from "@/lib/models/Society";
import SocietyMember from "@/lib/models/SocietyMember";
import User from "@/lib/models/User";
import { competitionPhase, eventPhase } from "@/lib/utils";
import { getInstitute } from "@/lib/queries";

const iso = (value) => (value ? new Date(value).toISOString() : null);

export function mapSociety(society, extra = {}) {
  if (!society) return null;
  const leaderList = (extra.leaders || []).map((leader) => ({
    name: leader.user?.name || "",
    role: leader.role,
    avatar: leader.user?.avatar || "",
  }));
  return {
    id: String(society._id),
    name: society.name,
    slug: society.slug,
    tagline: society.tagline,
    description: society.description,
    purpose: society.purpose,
    activities: society.activities || [],
    logo: society.logo,
    cover: society.cover,
    color: society.color,
    category: society.category,
    foundedYear: society.foundedYear,
    email: society.email,
    meetingSchedule: society.meetingSchedule,
    featured: Boolean(society.featured),
    isActive: society.isActive,
    memberCount: extra.memberCount ?? 0,
    leaders: leaderList,
    openRecruitments: extra.openRecruitments ?? 0,
    eventCount: extra.eventCount ?? 0,
  };
}

export function mapEvent(event, extra = {}) {
  if (!event) return null;
  const registeredCount = extra.registeredCount ?? 0;
  return {
    id: String(event._id),
    title: event.title,
    slug: event.slug,
    excerpt: event.excerpt,
    description: event.description,
    poster: event.poster,
    category: event.category,
    type: event.type,
    startAt: iso(event.startAt),
    endAt: iso(event.endAt),
    venue: event.venue,
    capacity: event.capacity,
    registeredCount,
    seatsLeft: Math.max(0, (event.capacity || 0) - registeredCount),
    status: eventPhase(event),
    storedStatus: event.status,
    featured: Boolean(event.featured),
    feedbackEnabled: Boolean(event.feedbackEnabled),
    registrationType: event.registrationType,
    registrationDeadline: iso(event.registrationDeadline),
    registrationOpenAt: iso(event.registrationOpenAt),
    society: extra.society || null,
  };
}

export function mapCompetition(competition, extra = {}) {
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
    startAt: iso(competition.startAt),
    endAt: iso(competition.endAt),
    registrationDeadline: iso(competition.registrationDeadline),
    venue: competition.venue,
    capacity: competition.capacity,
    entryCount: extra.entryCount ?? 0,
    prizeDetails: competition.prizeDetails,
    status: competitionPhase(competition),
    leaderboardPublished: Boolean(competition.leaderboardPublished),
    society: extra.society || null,
  };
}

export function mapAnnouncement(item) {
  if (!item) return null;
  return {
    id: String(item._id),
    title: item.title,
    body: item.body,
    category: item.category,
    priority: item.priority,
    pinned: Boolean(item.pinned),
    image: item.image,
    link: item.link,
    publishedByName: item.publishedByName,
    createdAt: iso(item.createdAt),
    society: item.society?.name ? { name: item.society.name, slug: item.society.slug, color: item.society.color } : null,
  };
}

export function mapGallery(item) {
  if (!item) return null;
  return {
    id: String(item._id),
    title: item.title,
    description: item.description,
    cover: item.cover,
    images: item.images || [],
    createdAt: iso(item.createdAt),
    society: item.society?.name ? { name: item.society.name, slug: item.society.slug } : null,
    event: item.event?.title ? { title: item.event.title, slug: item.event.slug } : null,
  };
}

async function societySummaries(ids) {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (!unique.length) return {};
  const rows = await Society.find({ _id: { $in: unique } }).select("name slug color logo").lean();
  return Object.fromEntries(rows.map((row) => [String(row._id), { name: row.name, slug: row.slug, color: row.color, logo: row.logo }]));
}

async function registrationCounts(eventIds, extra = {}) {
  if (!eventIds.length) return {};
  const rows = await Registration.aggregate([
    {
      $match: {
        event: { $in: eventIds },
        status: { $in: ["pending", "approved", "attended", "absent"] },
        ...extra,
      },
    },
    { $group: { _id: "$event", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
}

async function entryCounts(competitionIds) {
  if (!competitionIds.length) return {};
  const rows = await CompetitionEntry.aggregate([
    { $match: { competition: { $in: competitionIds }, status: { $in: ["pending", "approved"] } } },
    { $group: { _id: "$competition", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
}

export async function getHomeData() {
  await connectDB();
  const institute = await getInstitute();
  if (!institute) {
    return { institute: null, featured: [], upcoming: [], updates: [], societies: [], competitions: [], recruitments: [], stats: {}, topStudents: [], galleries: [] };
  }
  const instituteId = institute._id;
  const now = new Date();

  const [featuredDocs, upcomingDocs, updateDocs, societyDocs, competitionDocs, recruitmentDocs, galleryDocs, studentCount, verifiedCount, certCount, registrationCount, topStudentDocs] = await Promise.all([
    Event.find({ institute: instituteId, featured: true, status: { $nin: ["cancelled", "completed"] }, endAt: { $gte: now } }).sort({ startAt: 1 }).limit(4).lean(),
    Event.find({ institute: instituteId, status: { $nin: ["cancelled"] }, endAt: { $gte: now } }).sort({ startAt: 1 }).limit(6).lean(),
    Announcement.find({ institute: instituteId, $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }] }).sort({ pinned: -1, createdAt: -1 }).limit(5).populate("society", "name slug color").lean(),
    Society.find({ institute: instituteId, isActive: true }).sort({ featured: -1, name: 1 }).limit(8).lean(),
    Competition.find({ institute: instituteId, status: { $nin: ["cancelled", "completed"] }, endAt: { $gte: now } }).sort({ startAt: 1 }).limit(4).lean(),
    Recruitment.find({ institute: instituteId, status: "open", closesAt: { $gt: now } }).sort({ closesAt: 1 }).limit(3).populate("society", "name slug color logo").lean(),
    Gallery.find({ institute: instituteId, isPublished: true }).sort({ createdAt: -1 }).limit(3).populate("society", "name slug").populate("event", "title slug").lean(),
    User.countDocuments({ institute: instituteId, role: "student" }),
    User.countDocuments({ institute: instituteId, role: "student", verificationStatus: "verified" }),
    Certificate.countDocuments({ institute: instituteId, status: "valid" }),
    Registration.countDocuments({ institute: instituteId }),
    User.find({ institute: instituteId, role: "student", verificationStatus: "verified" }).sort({ points: -1 }).limit(5).select("name points classYear department avatar").lean(),
  ]);

  const featuredSource = featuredDocs.length ? featuredDocs : upcomingDocs.slice(0, 4);
  const [eventRegs, societyMemberCounts, societyEventCounts, openRecruitmentCounts, compEntries, questionCounts] = await Promise.all([
    registrationCounts([...featuredSource, ...upcomingDocs].map((e) => e._id)),
    SocietyMember.aggregate([{ $match: { institute: instituteId, status: "active" } }, { $group: { _id: "$society", count: { $sum: 1 } } }]),
    Event.aggregate([{ $match: { institute: instituteId, endAt: { $gte: now }, status: { $ne: "cancelled" } } }, { $group: { _id: "$society", count: { $sum: 1 } } }]),
    Recruitment.aggregate([{ $match: { institute: instituteId, status: "open", closesAt: { $gt: now } } }, { $group: { _id: "$society", count: { $sum: 1 } } }]),
    entryCounts(competitionDocs.map((c) => c._id)),
    Question.aggregate([
      { $match: { recruitment: { $in: recruitmentDocs.map((r) => r._id) }, isActive: true } },
      { $group: { _id: "$recruitment", count: { $sum: 1 } } },
    ]),
  ]);

  const eventSocieties = await societySummaries([...featuredSource, ...upcomingDocs].map((e) => e.society));
  const compSocieties = await societySummaries(competitionDocs.map((c) => c.society));
  const memberMap = Object.fromEntries(societyMemberCounts.map((row) => [String(row._id), row.count]));
  const eventMap = Object.fromEntries(societyEventCounts.map((row) => [String(row._id), row.count]));
  const recruitMap = Object.fromEntries(openRecruitmentCounts.map((row) => [String(row._id), row.count]));
  const questionMap = Object.fromEntries(questionCounts.map((row) => [String(row._id), row.count]));

  return {
    institute: {
      name: institute.name,
      shortName: institute.shortName,
      tagline: institute.tagline,
      city: institute.city,
      emailDomain: institute.emailDomain,
      leadership: institute.leadership,
    },
    featured: featuredSource.map((event) => mapEvent(event, { registeredCount: eventRegs[String(event._id)] || 0, society: eventSocieties[String(event.society)] })),
    upcoming: upcomingDocs.map((event) => mapEvent(event, { registeredCount: eventRegs[String(event._id)] || 0, society: eventSocieties[String(event.society)] })),
    updates: updateDocs.map(mapAnnouncement),
    societies: societyDocs.map((society) => mapSociety(society, { memberCount: memberMap[String(society._id)] || 0, eventCount: eventMap[String(society._id)] || 0, openRecruitments: recruitMap[String(society._id)] || 0 })),
    competitions: competitionDocs.map((competition) => mapCompetition(competition, { entryCount: compEntries[String(competition._id)] || 0, society: compSocieties[String(competition.society)] })),
    recruitments: recruitmentDocs.map((recruitment) => ({
      id: String(recruitment._id),
      title: recruitment.title,
      description: recruitment.description,
      closesAt: iso(recruitment.closesAt),
      isOpen: true,
      questionCount: questionMap[String(recruitment._id)] || 0,
      society: recruitment.society ? { name: recruitment.society.name, slug: recruitment.society.slug, color: recruitment.society.color, logo: recruitment.society.logo } : null,
    })),
    galleries: galleryDocs.map(mapGallery),
    topStudents: topStudentDocs.map((student) => ({
      id: String(student._id),
      name: student.name,
      points: student.points || 0,
      classYear: student.classYear,
      department: student.department,
      avatar: student.avatar,
    })),
    stats: {
      students: studentCount,
      verifiedStudents: verifiedCount,
      certificates: certCount,
      registrations: registrationCount,
      societies: societyDocs.length,
      events: upcomingDocs.length,
    },
  };
}

export async function getPublicEvents({ q = "", category = "", type = "", scope = "all", society = "", sort = "soonest" } = {}) {
  await connectDB();
  const institute = await getInstitute();
  if (!institute) return { items: [], categories: [], societies: [] };
  const now = new Date();
  const query = { institute: institute._id, status: { $ne: "cancelled" } };
  if (q) query.$or = [{ title: new RegExp(q, "i") }, { excerpt: new RegExp(q, "i") }, { venue: new RegExp(q, "i") }];
  if (category && category !== "All") query.category = category;
  if (type && type !== "All") query.type = type;
  if (scope === "upcoming") query.endAt = { $gte: now };
  if (scope === "past") query.endAt = { $lt: now };
  if (society) {
    const societyDoc = await Society.findOne({ institute: institute._id, slug: society }).select("_id").lean();
    if (societyDoc) query.society = societyDoc._id;
  }
  const sortSpec = sort === "latest" ? { createdAt: -1 } : { startAt: 1 };

  const [docs, categoryRows, societyRows] = await Promise.all([
    Event.find(query).sort(sortSpec).limit(60).lean(),
    Event.distinct("category", { institute: institute._id }),
    Society.find({ institute: institute._id, isActive: true }).select("name slug color").sort({ name: 1 }).lean(),
  ]);
  const [counts, summaries] = await Promise.all([
    registrationCounts(docs.map((event) => event._id)),
    societySummaries(docs.map((event) => event.society)),
  ]);
  return {
    items: docs.map((event) => mapEvent(event, { registeredCount: counts[String(event._id)] || 0, society: summaries[String(event.society)] })),
    categories: categoryRows.sort(),
    societies: societyRows.map((row) => ({ name: row.name, slug: row.slug, color: row.color })),
  };
}

export async function getEventDetail(slug, userId = null) {
  await connectDB();
  const institute = await getInstitute();
  if (!institute) return null;
  const event = await Event.findOne({ institute: institute._id, slug }).populate("society", "name slug color logo tagline").lean();
  if (!event) return null;
  const [counts, related, feedbackRows, galleryRows, myRegistration] = await Promise.all([
    registrationCounts([event._id]),
    Event.find({ institute: institute._id, _id: { $ne: event._id }, category: event.category, endAt: { $gte: new Date() } }).sort({ startAt: 1 }).limit(3).lean(),
    event.feedbackEnabled ? EventFeedbackAggregate(event._id) : Promise.resolve({ average: 0, count: 0 }),
    Gallery.find({ event: event._id, isPublished: true }).lean(),
    userId ? Registration.findOne({ event: event._id, user: userId }).select("status registrationId attendance").lean() : Promise.resolve(null),
  ]);
  const relatedCounts = await registrationCounts(related.map((item) => item._id));
  const summaries = await societySummaries(related.map((item) => item.society));
  return {
    event: mapEvent(event, {
      registeredCount: counts[String(event._id)] || 0,
      society: event.society ? { name: event.society.name, slug: event.society.slug, color: event.society.color, logo: event.society.logo } : null,
    }),
    raw: {
      requirements: event.requirements,
      rules: event.rules || [],
      highlights: event.highlights || [],
      notes: event.notes,
      gallery: event.gallery || [],
    },
    related: related.map((item) => mapEvent(item, { registeredCount: relatedCounts[String(item._id)] || 0, society: summaries[String(item.society)] })),
    feedback: feedbackRows,
    galleries: galleryRows.map(mapGallery),
    myRegistration: myRegistration
      ? {
          id: String(myRegistration._id),
          status: myRegistration.status,
          registrationId: myRegistration.registrationId,
          attendance: myRegistration.attendance,
        }
      : null,
  };
}

async function EventFeedbackAggregate(eventId) {
  const EventFeedback = (await import("@/lib/models/EventFeedback")).default;
  const rows = await EventFeedback.aggregate([
    { $match: { event: eventId } },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  return { average: rows[0]?.average ? Math.round(rows[0].average * 10) / 10 : 0, count: rows[0]?.count || 0 };
}

export async function getPublicSocieties() {
  await connectDB();
  const institute = await getInstitute();
  if (!institute) return { items: [] };
  const [societies, memberCounts, eventCounts, recruitCounts, leaders] = await Promise.all([
    Society.find({ institute: institute._id, isActive: true }).sort({ featured: -1, name: 1 }).lean(),
    SocietyMember.aggregate([{ $match: { institute: institute._id, status: "active" } }, { $group: { _id: "$society", count: { $sum: 1 } } }]),
    Event.aggregate([{ $match: { institute: institute._id, endAt: { $gte: new Date() }, status: { $ne: "cancelled" } } }, { $group: { _id: "$society", count: { $sum: 1 } } }]),
    Recruitment.aggregate([{ $match: { institute: institute._id, status: "open", closesAt: { $gt: new Date() } } }, { $group: { _id: "$society", count: { $sum: 1 } } }]),
    SocietyMember.find({ institute: institute._id, status: "active", role: { $in: ["president", "vice_president"] } }).populate("user", "name avatar").lean(),
  ]);
  const memberMap = Object.fromEntries(memberCounts.map((row) => [String(row._id), row.count]));
  const eventMap = Object.fromEntries(eventCounts.map((row) => [String(row._id), row.count]));
  const recruitMap = Object.fromEntries(recruitCounts.map((row) => [String(row._id), row.count]));
  const leadersBySociety = leaders.reduce((acc, row) => {
    const key = String(row.society);
    acc[key] = [...(acc[key] || []), row];
    return acc;
  }, {});
  return {
    items: societies.map((society) =>
      mapSociety(society, {
        memberCount: memberMap[String(society._id)] || 0,
        eventCount: eventMap[String(society._id)] || 0,
        openRecruitments: recruitMap[String(society._id)] || 0,
        leaders: leadersBySociety[String(society._id)] || [],
      })
    ),
  };
}

export async function getSocietyDetail(slug) {
  await connectDB();
  const institute = await getInstitute();
  if (!institute) return null;
  const society = await Society.findOne({ institute: institute._id, slug, isActive: true }).lean();
  if (!society) return null;
  const [members, memberCount, events, recruitments, competitions, gallery, eventCount] = await Promise.all([
    SocietyMember.find({ society: society._id, status: "active" }).populate("user", "name avatar classYear department").sort({ role: 1, joinedAt: 1 }).lean(),
    SocietyMember.countDocuments({ society: society._id, status: "active" }),
    Event.find({ society: society._id, endAt: { $gte: new Date() }, status: { $ne: "cancelled" } }).sort({ startAt: 1 }).limit(6).lean(),
    Recruitment.find({ society: society._id, status: { $in: ["open", "closed"] } }).sort({ createdAt: -1 }).limit(4).lean(),
    Competition.find({ society: society._id, endAt: { $gte: new Date() }, status: { $ne: "cancelled" } }).sort({ startAt: 1 }).limit(4).lean(),
    Gallery.find({ society: society._id, isPublished: true }).sort({ createdAt: -1 }).limit(6).populate("event", "title slug").lean(),
    Event.countDocuments({ society: society._id, endAt: { $gte: new Date() } }),
  ]);
  const [eventRegs, compEntries] = await Promise.all([registrationCounts(events.map((event) => event._id)), entryCounts(competitions.map((competition) => competition._id))]);
  const societySummary = { name: society.name, slug: society.slug, color: society.color, logo: society.logo };
  const order = ["president", "vice_president", "secretary", "treasurer", "event_manager", "team_lead", "member", "volunteer"];
  const sortedMembers = [...members].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
  return {
    society: mapSociety(society, { memberCount, eventCount, openRecruitments: recruitments.filter((item) => item.status === "open" && new Date(item.closesAt) > new Date()).length }),
    members: sortedMembers.map((member) => ({
      id: String(member._id),
      role: member.role,
      joinedAt: iso(member.joinedAt),
      name: member.user?.name || "",
      avatar: member.user?.avatar || "",
      classYear: member.user?.classYear || "",
      department: member.user?.department || "",
    })),
    events: events.map((event) => mapEvent(event, { registeredCount: eventRegs[String(event._id)] || 0, society: societySummary })),
    competitions: competitions.map((competition) => mapCompetition(competition, { entryCount: compEntries[String(competition._id)] || 0, society: societySummary })),
    recruitments: recruitments.map((recruitment) => ({
      id: String(recruitment._id),
      title: recruitment.title,
      status: recruitment.status,
      opensAt: iso(recruitment.opensAt),
      closesAt: iso(recruitment.closesAt),
      instructions: recruitment.instructions,
    })),
    gallery: gallery.map(mapGallery),
  };
}

export async function getPublicCompetitions() {
  await connectDB();
  const institute = await getInstitute();
  if (!institute) return { items: [] };
  const [docs, societyRows, now] = await Promise.all([
    Competition.find({ institute: institute._id, status: { $ne: "cancelled" } }).sort({ startAt: 1 }).limit(60).lean(),
    Society.find({ institute: institute._id, isActive: true }).select("name slug color").lean(),
    Promise.resolve(new Date()),
  ]);
  const counts = await entryCounts(docs.map((item) => item._id));
  const societyMap = Object.fromEntries(societyRows.map((row) => [String(row._id), { name: row.name, slug: row.slug, color: row.color }]));
  return {
    items: docs.map((competition) => mapCompetition(competition, { entryCount: counts[String(competition._id)] || 0, society: societyMap[String(competition.society)] })),
    now,
  };
}

export async function getCompetitionDetail(slug, userId = null) {
  await connectDB();
  const institute = await getInstitute();
  if (!institute) return null;
  const competition = await Competition.findOne({ institute: institute._id, slug }).populate("society", "name slug color logo").lean();
  if (!competition) return null;
  const [entries, related, societyRows, myEntry] = await Promise.all([
    CompetitionEntry.find({ competition: competition._id, status: "approved" }).populate("user", "name avatar").sort({ score: -1, createdAt: 1 }).lean(),
    Competition.find({ institute: institute._id, _id: { $ne: competition._id }, category: competition.category, endAt: { $gte: new Date() } }).sort({ startAt: 1 }).limit(3).lean(),
    Society.find({ institute: institute._id, isActive: true }).select("name slug color").lean(),
    userId
      ? CompetitionEntry.findOne({ competition: competition._id, user: userId })
          .select("status teamName members entryId position score remarks")
          .lean()
      : Promise.resolve(null),
  ]);
  const relatedCounts = await entryCounts(related.map((item) => item._id));
  const societyMap = Object.fromEntries(societyRows.map((row) => [String(row._id), { name: row.name, slug: row.slug, color: row.color }]));
  return {
    competition: mapCompetition(competition, {
      entryCount: entries.length,
      society: competition.society ? { name: competition.society.name, slug: competition.society.slug, color: competition.society.color, logo: competition.society.logo } : null,
    }),
    entries: entries.map((entry) => ({
      id: String(entry._id),
      teamName: entry.teamName,
      name: entry.user?.name || entry.members?.[0]?.name || "Participant",
      avatar: entry.user?.avatar || "",
      members: entry.members || [],
      score: entry.score,
      position: entry.position,
      remarks: entry.remarks,
    })),
    related: related.map((item) => mapCompetition(item, { entryCount: relatedCounts[String(item._id)] || 0, society: societyMap[String(item.society)] })),
    raw: { rules: competition.rules || [], requirements: competition.requirements },
    myEntry: myEntry
      ? {
          id: String(myEntry._id),
          entryId: myEntry.entryId,
          status: myEntry.status,
          teamName: myEntry.teamName || "",
          position: myEntry.position || "none",
          score: myEntry.score ?? null,
          remarks: myEntry.remarks || "",
          members: myEntry.members || [],
        }
      : null,
  };
}

export async function getUpdatesFeed({ category = "", priority = "" } = {}) {
  await connectDB();
  const institute = await getInstitute();
  if (!institute) return { items: [] };
  const now = new Date();
  const query = {
    institute: institute._id,
    $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
  };
  if (category && category !== "All") query.category = category;
  if (priority && priority !== "All") query.priority = priority;
  const [items, pinned] = await Promise.all([
    Announcement.find(query).sort({ pinned: -1, createdAt: -1 }).limit(40).populate("society", "name slug color").lean(),
    Announcement.find({ institute: institute._id, pinned: true }).sort({ createdAt: -1 }).limit(3).populate("society", "name slug color").lean(),
  ]);
  return { items: items.map(mapAnnouncement), pinned: pinned.map(mapAnnouncement) };
}

export async function getCalendarData() {
  await connectDB();
  const institute = await getInstitute();
  if (!institute) return { events: [], competitions: [], recruitments: [] };
  const [events, competitions, recruitments] = await Promise.all([
    Event.find({ institute: institute._id, status: { $ne: "cancelled" } }).sort({ startAt: 1 }).select("title slug startAt endAt category venue poster status").lean(),
    Competition.find({ institute: institute._id, status: { $ne: "cancelled" } }).sort({ startAt: 1 }).select("title slug startAt endAt category venue type status").lean(),
    Recruitment.find({ institute: institute._id, status: "open" }).sort({ closesAt: 1 }).populate("society", "name slug color").select("title closesAt society").lean(),
  ]);
  return {
    events: events.map((event) => ({
      id: String(event._id), title: event.title, slug: event.slug, startAt: iso(event.startAt), endAt: iso(event.endAt), category: event.category, venue: event.venue, poster: event.poster, status: eventPhase(event),
    })),
    competitions: competitions.map((competition) => ({
      id: String(competition._id), title: competition.title, slug: competition.slug, startAt: iso(competition.startAt), endAt: iso(competition.endAt), category: competition.category, venue: competition.venue, type: competition.type, status: competitionPhase(competition),
    })),
    recruitments: recruitments.map((recruitment) => ({
      id: String(recruitment._id), title: recruitment.title, closesAt: iso(recruitment.closesAt), society: recruitment.society?.name || "",
    })),
  };
}

export async function getRecruitmentDetail(id, userId = null) {
  await connectDB();
  const institute = await getInstitute();
  if (!institute) return null;
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) return null;
  const recruitment = await Recruitment.findOne({ _id: id, institute: institute._id }).populate("society", "name slug color logo tagline").lean();
  if (!recruitment) return null;
  const now = new Date();
  const [questions, myApplication] = await Promise.all([
    Question.find({ recruitment: recruitment._id, isActive: true }).sort({ order: 1 }).lean(),
    userId
      ? (await import("@/lib/models/Application")).default
          .findOne({ recruitment: recruitment._id, user: userId })
          .lean()
      : Promise.resolve(null),
  ]);
  return {
    recruitment: {
      id: String(recruitment._id),
      title: recruitment.title,
      description: recruitment.description,
      status: recruitment.status,
      opensAt: iso(recruitment.opensAt),
      closesAt: iso(recruitment.closesAt),
      instructions: recruitment.instructions,
      rounds: recruitment.rounds || [],
      isOpen: recruitment.status === "open" && new Date(recruitment.closesAt) > now,
      society: recruitment.society
        ? {
            name: recruitment.society.name,
            slug: recruitment.society.slug,
            color: recruitment.society.color,
            logo: recruitment.society.logo,
            tagline: recruitment.society.tagline,
          }
        : null,
    },
    questions: questions.map((question) => ({
      id: String(question._id),
      label: question.label,
      helpText: question.helpText,
      type: question.type,
      required: Boolean(question.required),
      options: question.options || [],
      order: question.order,
    })),
    myApplication: myApplication
      ? {
          id: String(myApplication._id),
          status: myApplication.status,
          submittedAt: iso(myApplication.submittedAt),
          statusHistory: (myApplication.statusHistory || []).map((entry) => ({
            status: entry.status,
            at: iso(entry.at),
            note: entry.note,
          })),
        }
      : null,
  };
}

export async function getRecruitmentBoard() {
  await connectDB();
  const institute = await getInstitute();
  if (!institute) return { items: [] };
  const now = new Date();
  const [items, questionCounts, societyRows] = await Promise.all([
    Recruitment.find({ institute: institute._id, status: { $in: ["open", "closed"] }, closesAt: { $gte: new Date(now.getTime() - 14 * 864e5) } }).sort({ status: 1, closesAt: 1 }).lean(),
    Question.aggregate([{ $match: { institute: institute._id, isActive: true } }, { $group: { _id: "$recruitment", count: { $sum: 1 } } }]),
    Society.find({ institute: institute._id, isActive: true }).select("name slug color logo tagline").lean(),
  ]);
  const qMap = Object.fromEntries(questionCounts.map((row) => [String(row._id), row.count]));
  const societyMap = Object.fromEntries(societyRows.map((row) => [String(row._id), row]));
  return {
    items: items.map((recruitment) => {
      const society = societyMap[String(recruitment.society)];
      return {
        id: String(recruitment._id),
        title: recruitment.title,
        description: recruitment.description,
        status: recruitment.status,
        opensAt: iso(recruitment.opensAt),
        closesAt: iso(recruitment.closesAt),
        instructions: recruitment.instructions,
        isOpen: recruitment.status === "open" && new Date(recruitment.closesAt) > now,
        rounds: recruitment.rounds || [],
        questionCount: qMap[String(recruitment._id)] || 0,
        society: society ? { name: society.name, slug: society.slug, color: society.color, logo: society.logo, tagline: society.tagline } : null,
      };
    }),
  };
}
