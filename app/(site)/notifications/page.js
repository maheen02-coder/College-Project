import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import PageHeader from "@/components/site/PageHeader";
import NotificationsList from "@/components/site/NotificationsList";
import { getSessionUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Notification from "@/lib/models/Notification";

export const dynamic = "force-dynamic";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/notifications");

  await connectDB();
  const rows = await Notification.find({ user: user.id }).sort({ createdAt: -1 }).limit(60).lean();
  const notifications = rows.map((item) => ({
    id: String(item._id),
    type: item.type,
    title: item.title,
    message: item.message,
    link: item.link,
    read: item.read,
    createdAt: new Date(item.createdAt).toISOString(),
  }));
  const unread = notifications.filter((item) => !item.read).length;

  return (
    <div>
      <PageHeader
        eyebrow="Your activity"
        title="Notifications"
        description="Approvals, reminders, results and certificates — everything tied to your campus account."
        breadcrumb={[{ label: "Notifications" }]}
      >
        <span className="chip"><Bell size={13} className="text-purple" /> {unread} unread</span>
      </PageHeader>

      <div className="container-x max-w-3xl py-10">
        <NotificationsList initial={notifications} />
      </div>
    </div>
  );
}
