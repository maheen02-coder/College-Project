import Link from "next/link";
import { CalendarDays, LogIn, MapPin, ShieldAlert } from "lucide-react";
import { connectDB } from "@/lib/db";
import { getSessionUser, verifyAttendanceToken } from "@/lib/auth";
import AttendanceCheckIn from "@/components/site/AttendanceCheckIn";
import Event from "@/lib/models/Event";

export const dynamic = "force-dynamic";

function Notice({ icon: Icon, title, children, actions }) {
  return (
    <div className="card mx-auto w-full max-w-xl p-8 text-center sm:p-10">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-lavender text-purple">
        <Icon size={28} />
      </span>
      <h1 className="mt-5 text-xl font-semibold text-ink">{title}</h1>
      <div className="mt-2 text-sm leading-relaxed text-mist">{children}</div>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">{actions}</div>
    </div>
  );
}

export default async function AttendancePage({ params }) {
  const { token } = await params;
  const payload = await verifyAttendanceToken(token);
  const eventId = payload?.event;

  if (!eventId) {
    return (
      <div className="section">
        <div className="container-x">
          <Notice
            icon={ShieldAlert}
            title="This attendance code is invalid"
            actions={
              <>
                <Link href="/events" className="btn btn-primary btn-sm">
                  Browse events
                </Link>
                <Link href="/dashboard" className="btn btn-ghost btn-sm">
                  Go to dashboard
                </Link>
              </>
            }
          >
            The QR code may have expired or been mistyped. Ask the event organizer for a fresh code.
          </Notice>
        </div>
      </div>
    );
  }

  await connectDB();
  const event = await Event.findById(eventId).select("title slug poster venue startAt endAt status").lean();

  if (!event) {
    return (
      <div className="section">
        <div className="container-x">
          <Notice
            icon={ShieldAlert}
            title="Event not found"
            actions={
              <Link href="/events" className="btn btn-primary btn-sm">
                Browse events
              </Link>
            }
          >
            This attendance code points to an event that no longer exists.
          </Notice>
        </div>
      </div>
    );
  }

  const plainEvent = {
    title: event.title,
    slug: event.slug,
    venue: event.venue,
    startAt: new Date(event.startAt).toISOString(),
  };

  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="section">
        <div className="container-x">
          <Notice
            icon={LogIn}
            title="Sign in to check in"
            actions={
              <Link href={`/login?next=${encodeURIComponent(`/attend/${token}`)}`} className="btn btn-primary btn-sm">
                Sign in
              </Link>
            }
          >
            <p className="font-medium text-ink">{event.title}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={14} className="text-violet" />
                {new Intl.DateTimeFormat("en-GB", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(event.startAt))}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} className="text-blue" />
                {event.venue}
              </span>
            </div>
            <p className="mt-4">Attendance is recorded against your student account, so you need to be signed in.</p>
          </Notice>
        </div>
      </div>
    );
  }

  if (user.role !== "student" || user.verificationStatus !== "verified") {
    return (
      <div className="section">
        <div className="container-x">
          <Notice
            icon={ShieldAlert}
            title="Verified students only"
            actions={
              <>
                <Link href="/dashboard/profile" className="btn btn-primary btn-sm">
                  Complete verification
                </Link>
                <Link href={`/events/${event.slug}`} className="btn btn-ghost btn-sm">
                  View event
                </Link>
              </>
            }
          >
            Only verified student accounts can record attendance. Finish your college verification, then scan the
            code again.
          </Notice>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container-x">
        <AttendanceCheckIn token={token} event={plainEvent} />
      </div>
    </div>
  );
}
