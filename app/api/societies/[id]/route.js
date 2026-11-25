import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { getInstitute } from "@/lib/queries";
import { logActivity } from "@/lib/activity";
import { slugify } from "@/lib/utils";
import Competition from "@/lib/models/Competition";
import Event from "@/lib/models/Event";
import Gallery from "@/lib/models/Gallery";
import Recruitment from "@/lib/models/Recruitment";
import Society from "@/lib/models/Society";
import SocietyMember from "@/lib/models/SocietyMember";

export const dynamic = "force-dynamic";

const ROLE_ORDER = [
  "president",
  "vice_president",
  "secretary",
  "treasurer",
  "event_manager",
  "team_lead",
  "member",
  "volunteer",
];

async function loadSociety(id, instituteId) {
  await connectDB();
  const filter = { institute: instituteId };
  if (mongoose.isValidObjectId(id)) {
    filter.$or = [{ _id: id }, { slug: id }];
  } else {
    filter.slug = id;
  }
  return Society.findOne(filter).lean();
}

function mapSociety(society, extra) {
  return {
    id: String(society._id),
    name: society.name,
    slug: society.slug,
    tagline: society.tagline,
    description: society.description,
    purpose: society.purpose,
    activities: society.activities || [],
    category: society.category,
    color: society.color,
    logo: society.logo,
    cover: society.cover,
    featured: Boolean(society.featured),
    foundedYear: society.foundedYear,
    email: society.email,
    meetingSchedule: society.meetingSchedule,
    isActive: society.isActive,
    createdAt: society.createdAt ? new Date(society.createdAt).toISOString() : null,
    ...extra,
  };
}

export async function GET(request, { params }) {
  const { id } = await params;
  const institute = await getInstitute();
  if (!institute) return fail("Society not found.", 404);

  const society = await loadSociety(id, institute._id);
  if (!society || !society.isActive) return fail("Society not found.", 404);

  const now = new Date();
  const [leaders, memberCount, members, events, recruitments, gallery, competitions] = await Promise.all([
    SocietyMember.find({
      society: society._id,
      status: "active",
      role: { $in: ["president", "vice_president"] },
    })
      .populate("user", "name avatar")
      .lean(),
    SocietyMember.countDocuments({ society: society._id, status: "active" }),
    SocietyMember.find({ society: society._id, status: "active" })
      .populate("user", "name avatar")
      .limit(50)
      .lean(),
    Event.find({ society: society._id, startAt: { $gte: now }, status: { $ne: "cancelled" } })
      .select("title slug startAt poster status")
      .sort({ startAt: 1 })
      .limit(6)
      .lean(),
    Recruitment.find({ society: society._id, status: { $in: ["open", "closed"] } })
      .select("title status closesAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Gallery.find({ society: society._id, isPublished: true })
      .select("title cover images createdAt")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
    Competition.find({ society: society._id, startAt: { $gte: now }, status: { $ne: "cancelled" } })
      .select("title slug startAt poster status")
      .sort({ startAt: 1 })
      .limit(6)
      .lean(),
  ]);

  const sortedMembers = members
    .filter((m) => m.user)
    .sort(
      (a, b) =>
        ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) ||
        String(a.user.name).localeCompare(String(b.user.name))
    );

  return ok({
    item: mapSociety(society, {
      memberCount,
      leaders: leaders.filter((m) => m.user).map((m) => ({
        id: String(m.user._id),
        name: m.user.name,
        avatar: m.user.avatar || "",
        role: m.role,
      })),
      members: sortedMembers.map((m) => ({
        id: String(m.user._id),
        name: m.user.name,
        role: m.role,
        avatar: m.user.avatar || "",
      })),
      events: events.map((e) => ({
        id: String(e._id),
        title: e.title,
        slug: e.slug,
        startAt: new Date(e.startAt).toISOString(),
        poster: e.poster,
        status: e.status,
      })),
      recruitments: recruitments.map((r) => ({
        id: String(r._id),
        title: r.title,
        status: r.status,
        closesAt: r.closesAt ? new Date(r.closesAt).toISOString() : null,
      })),
      gallery: gallery.map((g) => ({
        id: String(g._id),
        title: g.title,
        cover: g.cover,
        images: g.images || [],
        createdAt: new Date(g.createdAt).toISOString(),
      })),
      competitions: competitions.map((c) => ({
        id: String(c._id),
        title: c.title,
        slug: c.slug,
        startAt: new Date(c.startAt).toISOString(),
        poster: c.poster,
        status: c.status,
      })),
    }),
  });
}

const patchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  slug: z.string().trim().min(2).max(90).optional(),
  tagline: z.string().trim().max(140).optional(),
  description: z.string().trim().min(10).max(4000).optional(),
  purpose: z.string().trim().max(1000).optional(),
  activities: z.union([z.array(z.string()), z.string()]).optional(),
  category: z.string().trim().max(60).optional(),
  color: z.string().trim().max(20).optional(),
  logo: z.string().trim().max(300).optional(),
  cover: z.string().trim().max(300).optional(),
  foundedYear: z
    .union([z.literal(""), z.coerce.number().int().min(1900).max(2100)])
    .nullable()
    .optional(),
  email: z.string().trim().max(120).optional(),
  meetingSchedule: z.string().trim().max(160).optional(),
  featured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

function toList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value || "")
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_societies");
  if (response) return response;

  const society = await loadSociety(id, user.instituteId);
  if (!society) return fail("Society not found.", 404);

  const body = await readJson(request);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);

  const update = { ...parsed.data };
  if (update.foundedYear === "") update.foundedYear = null;
  if (update.activities !== undefined) update.activities = toList(update.activities);
  if (update.slug) {
    update.slug = slugify(update.slug);
    if (!update.slug) return fail("Enter a valid slug.", 422);
    const clash = await Society.exists({
      institute: user.instituteId,
      slug: update.slug,
      _id: { $ne: society._id },
    });
    if (clash) return fail("That slug is already in use.", 409);
  }

  const updated = await Society.findByIdAndUpdate(society._id, { $set: update }, { returnDocument: "after" }).lean();
  const memberCount = await SocietyMember.countDocuments({ society: society._id, status: "active" });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "society.update",
    entityType: "Society",
    entityId: society._id,
    summary: `Updated society ${updated.name}.`,
  });

  return ok({ item: mapSociety(updated, { memberCount }) });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_societies");
  if (response) return response;

  const society = await loadSociety(id, user.instituteId);
  if (!society) return fail("Society not found.", 404);

  await Society.updateOne({ _id: society._id }, { $set: { isActive: false } });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "society.archive",
    entityType: "Society",
    entityId: society._id,
    summary: `Archived society ${society.name}.`,
  });

  return ok({ removed: true });
}
