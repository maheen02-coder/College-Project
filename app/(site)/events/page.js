import { CalendarDays } from "lucide-react";
import PageHeader from "@/components/site/PageHeader";
import EventsToolbar from "@/components/site/EventsToolbar";
import EventCard from "@/components/site/EventCard";
import EmptyState from "@/components/site/EmptyState";
import Reveal from "@/components/ui/Reveal";
import { getSessionUser } from "@/lib/auth";
import { getPublicEvents } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events",
  description: "Every upcoming and past campus event at KIPS College — workshops, sports, cultural nights and more.",
};

export default async function EventsPage({ searchParams }) {
  const [params, user] = await Promise.all([searchParams, getSessionUser()]);
  const { items, societies } = await getPublicEvents({
    q: params?.q || "",
    category: params?.category || "",
    type: params?.type || "",
    scope: params?.scope === "past" ? "past" : "upcoming",
    society: params?.society || "",
    sort: params?.sort === "latest" ? "latest" : "soonest",
  });

  return (
    <div>
      <PageHeader
        eyebrow="Campus events"
        title="Find your next moment"
        description="Workshops, sports, cultural nights and everything in between. Filter by category, society or date and register in seconds."
        breadcrumb={[{ label: "Events" }]}
      >
        <span className="chip">
          <CalendarDays size={13} className="text-purple" /> {items.length} events
        </span>
      </PageHeader>

      <div className="container-x space-y-8 py-10">
        <EventsToolbar societies={societies} />

        {items.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((event, index) => (
              <Reveal key={event.id} delay={Math.min(index, 6) * 0.04}>
                <EventCard event={event} isAuthed={Boolean(user)} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="No events match your filters"
            message="Try clearing filters or switching between upcoming and past events."
            actionHref="/events"
            actionLabel="Reset filters"
          />
        )}
      </div>
    </div>
  );
}
