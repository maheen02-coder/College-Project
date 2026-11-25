import { Trophy } from "lucide-react";
import PageHeader from "@/components/site/PageHeader";
import CompetitionsToolbar from "@/components/site/CompetitionsToolbar";
import CompetitionCard from "@/components/site/CompetitionCard";
import EmptyState from "@/components/site/EmptyState";
import Reveal from "@/components/ui/Reveal";
import { getPublicCompetitions } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Competitions",
  description: "Quiz nights, debate cups, futsal, hackathons and more — enter competitions at KIPS College.",
};

export default async function CompetitionsPage({ searchParams }) {
  const params = await searchParams;
  const { items } = await getPublicCompetitions();
  const q = (params?.q || "").toLowerCase();
  const filtered = items.filter((competition) => {
    if (q && !`${competition.title} ${competition.excerpt || ""} ${competition.type}`.toLowerCase().includes(q)) return false;
    if (params?.category && params.category !== "All" && competition.category !== params.category) return false;
    if (params?.type && params.type !== "All" && competition.type !== params.type) return false;
    if (params?.mode && params.mode !== "All" && competition.mode !== params.mode) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        eyebrow="Compete & win"
        title="Competitions & tournaments"
        description="Test yourself against the best on campus. Register solo or with a team, track your score and win certificates."
        breadcrumb={[{ label: "Competitions" }]}
        tone="blue"
      >
        <span className="chip">
          <Trophy size={13} className="text-amber" /> {filtered.length} competitions
        </span>
      </PageHeader>

      <div className="container-x space-y-8 py-10">
        <CompetitionsToolbar />
        {filtered.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((competition, index) => (
              <Reveal key={competition.id} delay={Math.min(index, 6) * 0.04}>
                <CompetitionCard competition={competition} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Trophy}
            title="No competitions match your filters"
            message="Try a different category or clear the filters to see everything."
            actionHref="/competitions"
            actionLabel="Reset filters"
          />
        )}
      </div>
    </div>
  );
}
