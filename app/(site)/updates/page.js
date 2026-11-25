import Link from "next/link";
import { Megaphone, Pin } from "lucide-react";
import PageHeader from "@/components/site/PageHeader";
import UpdateCard from "@/components/site/UpdateCard";
import EmptyState from "@/components/site/EmptyState";
import Reveal from "@/components/ui/Reveal";
import { getUpdatesFeed } from "@/lib/content";
import { ANNOUNCEMENT_CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Campus updates",
  description: "Official notices, announcements, results and recruitment updates from KIPS College.",
};

const CATEGORY_LABEL = {
  general: "General",
  notice: "Notices",
  event: "Events",
  recruitment: "Recruitment",
  competition: "Competitions",
  society: "Societies",
  result: "Results",
};

export default async function UpdatesPage({ searchParams }) {
  const params = await searchParams;
  const category = params?.category || "All";
  const priority = params?.priority || "All";
  const { items, pinned } = await getUpdatesFeed({ category, priority });
  const featured = pinned?.[0] || items?.[0] || null;
  const rest = items.filter((item) => item.id !== featured?.id);

  const buildHref = (patch) => {
    const next = new URLSearchParams();
    const merged = { category, priority, ...patch };
    Object.entries(merged).forEach(([key, value]) => {
      if (value && value !== "All") next.set(key, value);
    });
    const query = next.toString();
    return query ? `/updates?${query}` : "/updates";
  };

  return (
    <div>
      <PageHeader
        eyebrow="Stay informed"
        title="Campus updates"
        description="Every official notice, result and announcement in one calm feed."
        breadcrumb={[{ label: "Updates" }]}
      >
        <span className="chip"><Megaphone size={13} className="text-purple" /> {items.length} updates</span>
      </PageHeader>

      <div className="container-x py-10">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={buildHref({ category: "All" })} className={`chip ${category === "All" ? "bg-purple text-white" : ""}`}>
            All
          </Link>
          {ANNOUNCEMENT_CATEGORIES.map((item) => (
            <Link
              key={item}
              href={buildHref({ category: item })}
              className={`chip ${category === item ? "bg-purple text-white" : ""}`}
            >
              {CATEGORY_LABEL[item] || item}
            </Link>
          ))}
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
          <Link href={buildHref({ priority: "important" })} className={`chip ${priority === "important" ? "bg-amber text-white" : ""}`}>
            Important
          </Link>
          <Link href={buildHref({ priority: "urgent" })} className={`chip ${priority === "urgent" ? "bg-rose text-white" : ""}`}>
            Urgent
          </Link>
        </div>

        {items.length ? (
          <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            {featured ? (
              <Reveal className="card relative overflow-hidden p-6 sm:p-8">
                <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#ddd6fe]/60 blur-2xl" />
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-2">
                    {featured.pinned ? (
                      <span className="badge badge-amber"><Pin size={11} /> Pinned</span>
                    ) : null}
                    <span className="badge badge-violet">{CATEGORY_LABEL[featured.category] || featured.category}</span>
                    {featured.priority !== "normal" ? (
                      <span className={`badge ${featured.priority === "urgent" ? "badge-rose" : "badge-amber"}`}>
                        {featured.priority}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-4 font-display text-2xl font-bold leading-tight text-ink">{featured.title}</h2>
                  <p className="mt-3 whitespace-pre-line text-[0.9rem] leading-relaxed text-ink-2/90">{featured.body}</p>
                  {featured.image ? (
                    <img src={featured.image} alt="" className="mt-4 max-h-64 w-full rounded-xl object-cover" />
                  ) : null}
                  <p className="mt-5 text-[0.74rem] text-mist">
                    {featured.society?.name || featured.publishedByName || "Campus office"} ·{" "}
                    {new Date(featured.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                  {featured.link ? (
                    <Link href={featured.link} className="btn btn-secondary btn-sm mt-4">
                      Read more
                    </Link>
                  ) : null}
                </div>
              </Reveal>
            ) : null}

            <div className="space-y-4">
              {rest.slice(0, 6).map((update, index) => (
                <Reveal key={update.id} delay={index * 0.04}>
                  <UpdateCard update={update} />
                </Reveal>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState
              icon={Megaphone}
              title="No updates yet"
              message="Campus announcements will appear here as soon as they are published."
              actionHref="/events"
              actionLabel="Browse events"
            />
          </div>
        )}
      </div>
    </div>
  );
}
