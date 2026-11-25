import { connectDB } from "@/lib/db";
import { ok, requireUser } from "@/lib/api";
import { competitionPhase } from "@/lib/utils";
import CompetitionEntry from "@/lib/models/CompetitionEntry";

export const dynamic = "force-dynamic";

function mapEntry(entry) {
  const competition = entry.competition;
  return {
    id: String(entry._id),
    entryId: entry.entryId,
    teamName: entry.teamName || "",
    members: entry.members || [],
    status: entry.status,
    score: entry.score ?? null,
    position: entry.position || "none",
    remarks: entry.remarks || "",
    submissionLink: entry.submissionLink || "",
    createdAt: new Date(entry.createdAt).toISOString(),
    competition: competition
      ? {
          id: String(competition._id),
          title: competition.title,
          slug: competition.slug,
          poster: competition.poster || "",
          type: competition.type,
          category: competition.category,
          mode: competition.mode,
          startAt: new Date(competition.startAt).toISOString(),
          endAt: new Date(competition.endAt).toISOString(),
          status: competitionPhase(competition),
          leaderboardPublished: Boolean(competition.leaderboardPublished),
        }
      : null,
  };
}

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  await connectDB();
  const entries = await CompetitionEntry.find({ user: user.id })
    .populate("competition", "title slug poster type category mode startAt endAt leaderboardPublished status")
    .sort({ createdAt: -1 })
    .limit(120)
    .lean();

  return ok({ items: entries.filter((entry) => entry.competition).map(mapEntry), total: entries.length });
}
