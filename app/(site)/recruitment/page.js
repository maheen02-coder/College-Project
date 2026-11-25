import { UserRoundPlus } from "lucide-react";
import PageHeader from "@/components/site/PageHeader";
import RecruitmentCard from "@/components/site/RecruitmentCard";
import EmptyState from "@/components/site/EmptyState";
import Reveal from "@/components/ui/Reveal";
import { getRecruitmentBoard } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Recruitment",
  description: "Open society recruitments at KIPS College — apply with live forms and track your application.",
};

export default async function RecruitmentPage() {
  const { items } = await getRecruitmentBoard();
  const open = items.filter((item) => item.isOpen);
  const closed = items.filter((item) => !item.isOpen);

  return (
    <div>
      <PageHeader
        eyebrow="Join a team"
        title="Society recruitment"
        description="Applications go straight to society leadership. Answer the form once, track every round from your dashboard."
        breadcrumb={[{ label: "Recruitment" }]}
      >
        <span className="chip"><UserRoundPlus size={13} className="text-emerald" /> {open.length} open</span>
      </PageHeader>

      <div className="container-x space-y-10 py-10">
        {open.length ? (
          <section>
            <h2 className="font-display text-xl font-bold text-ink">Open now</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {open.map((recruitment, index) => (
                <Reveal key={recruitment.id} delay={index * 0.04}>
                  <RecruitmentCard recruitment={recruitment} />
                </Reveal>
              ))}
            </div>
          </section>
        ) : (
          <EmptyState
            icon={UserRoundPlus}
            title="No open recruitments right now"
            message="Follow campus updates — new society openings are announced regularly."
            actionHref="/updates"
            actionLabel="View updates"
          />
        )}

        {closed.length ? (
          <section>
            <h2 className="font-display text-lg font-bold text-ink">Recently closed</h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {closed.map((recruitment) => (
                <RecruitmentCard key={recruitment.id} recruitment={recruitment} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
