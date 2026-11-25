import { ok } from "@/lib/api";
import { getInstitute } from "@/lib/queries";
import Competition from "@/lib/models/Competition";
import Event from "@/lib/models/Event";
import Recruitment from "@/lib/models/Recruitment";

export const dynamic = "force-dynamic";

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function parseDate(value, fallback) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export async function GET(request) {
  const institute = await getInstitute();
  if (!institute) return ok({ events: [], competitions: [], recruitments: [] });

  const now = new Date();
  let from = parseDate(
    new URL(request.url).searchParams.get("from"),
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  let to = parseDate(
    new URL(request.url).searchParams.get("to"),
    new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  );
  if (to < from) {
    const swap = from;
    from = to;
    to = swap;
  }

  const [events, competitions, recruitments] = await Promise.all([
    Event.find({
      institute: institute._id,
      startAt: { $gte: from, $lte: to },
    })
      .select("title slug startAt endAt category venue poster status")
      .sort({ startAt: 1 })
      .lean(),
    Competition.find({
      institute: institute._id,
      startAt: { $gte: from, $lte: to },
    })
      .select("title slug startAt endAt category venue poster status")
      .sort({ startAt: 1 })
      .lean(),
    Recruitment.find({
      institute: institute._id,
      status: "open",
      closesAt: { $gte: from, $lte: to },
    })
      .populate("society", "name")
      .select("title closesAt society")
      .sort({ closesAt: 1 })
      .lean(),
  ]);

  return ok({
    events: events.map((event) => ({
      id: String(event._id),
      title: event.title,
      slug: event.slug,
      startAt: iso(event.startAt),
      endAt: iso(event.endAt),
      category: event.category,
      venue: event.venue,
      poster: event.poster || "",
      status: event.status,
    })),
    competitions: competitions.map((competition) => ({
      id: String(competition._id),
      title: competition.title,
      slug: competition.slug,
      startAt: iso(competition.startAt),
      endAt: iso(competition.endAt),
      category: competition.category,
      venue: competition.venue,
      status: competition.status,
    })),
    recruitments: recruitments.map((recruitment) => ({
      id: String(recruitment._id),
      title: recruitment.title,
      societyName: recruitment.society?.name || "",
      closesAt: iso(recruitment.closesAt),
    })),
  });
}
