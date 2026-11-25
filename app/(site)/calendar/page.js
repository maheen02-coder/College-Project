import { CalendarRange } from "lucide-react";
import PageHeader from "@/components/site/PageHeader";
import CalendarBoard from "@/components/site/CalendarBoard";
import { getCalendarData } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Campus calendar",
  description: "Every event, competition and recruitment deadline at KIPS College in one calendar.",
};

export default async function CalendarPage() {
  const data = await getCalendarData();
  const total = (data.events?.length || 0) + (data.competitions?.length || 0) + (data.recruitments?.length || 0);

  return (
    <div>
      <PageHeader
        eyebrow="Plan ahead"
        title="Campus calendar"
        description="Events, competitions and application deadlines — laid out month by month."
        breadcrumb={[{ label: "Calendar" }]}
      >
        <span className="chip"><CalendarRange size={13} className="text-purple" /> {total} scheduled items</span>
      </PageHeader>

      <div className="container-x py-10">
        <CalendarBoard events={data.events} competitions={data.competitions} recruitments={data.recruitments} />
      </div>
    </div>
  );
}
