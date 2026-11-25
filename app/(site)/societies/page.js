import { Users } from "lucide-react";
import PageHeader from "@/components/site/PageHeader";
import SocietyCard from "@/components/site/SocietyCard";
import EmptyState from "@/components/site/EmptyState";
import Reveal from "@/components/ui/Reveal";
import { getPublicSocieties } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Societies & clubs",
  description: "Eight student-led societies at KIPS College — academic, cultural, sports, technology and social welfare.",
};

export default async function SocietiesPage() {
  const { items } = await getPublicSocieties();
  const totalMembers = items.reduce((sum, society) => sum + (society.memberCount || 0), 0);
  const openRecruitments = items.reduce((sum, society) => sum + (society.openRecruitments || 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Communities"
        title="Societies & clubs"
        description="Find the people who share your passion. Join a society, attend events, lead teams and shape campus life."
        breadcrumb={[{ label: "Societies" }]}
      >
        <div className="flex flex-wrap gap-2">
          <span className="chip"><Users size={13} className="text-purple" /> {items.length} societies</span>
          <span className="chip">{totalMembers} members</span>
          {openRecruitments ? <span className="chip">{openRecruitments} open roles</span> : null}
        </div>
      </PageHeader>

      <div className="container-x py-10">
        {items.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((society, index) => (
              <Reveal key={society.id} delay={Math.min(index, 8) * 0.04}>
                <SocietyCard society={society} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="Societies are being set up"
            message="Campus societies will appear here once the office publishes them."
            actionHref="/events"
            actionLabel="Browse events"
          />
        )}
      </div>
    </div>
  );
}
