"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  Award,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  Images,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Megaphone,
  Medal,
  Menu,
  MessagesSquare,
  ScanLine,
  ScrollText,
  Settings,
  Star,
  Trophy,
  UserCog,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Brand from "@/components/ui/Brand";
import { cn, initials } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  analytics: BarChart3,
  logs: ScrollText,
  students: GraduationCap,
  admins: UserCog,
  societies: Building2,
  recruitment: Briefcase,
  applications: Inbox,
  files: FolderOpen,
  groups: MessagesSquare,
  tasks: ListChecks,
  events: CalendarDays,
  competitions: Trophy,
  registrations: ClipboardList,
  participants: Users,
  attendance: ScanLine,
  results: Medal,
  certificates: Award,
  announcements: Megaphone,
  galleries: Images,
  feedback: Star,
  settings: Settings,
  notifications: Bell,
  profile: UserRound,
  activity: Activity,
};

function roleLabel(user) {
  if (user.role === "superadmin") return "Super Admin";
  if (user.role === "admin") {
    const map = {
      recruitment_admin: "Recruitment Admin",
      event_admin: "Event Admin",
      society_admin: "Society Admin",
      certificate_admin: "Certificate Admin",
      student_admin: "Student Admin",
      communication_admin: "Communication Admin",
    };
    return map[user.adminRole] || "Administrator";
  }
  return "Student";
}

export default function ConsoleShell({ user, institute, nav, variant = "admin", children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const root = nav?.[0]?.items?.[0]?.href || "/";

  const activeItem = useMemo(() => {
    let best = null;
    for (const group of nav || []) {
      for (const item of group.items) {
        if (pathname === item.href || (item.href !== root && pathname.startsWith(`${item.href}/`))) {
          if (!best || item.href.length > best.href.length) best = item;
        }
      }
    }
    return best;
  }, [nav, pathname, root]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    let active = true;
    fetch("/api/notifications?limit=1")
      .then((res) => res.json())
      .then((data) => {
        if (active && data.ok) setUnread(data.unread || 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const isActive = (href) => pathname === href || (href !== root && pathname.startsWith(`${href}/`));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-5 pt-5">
        <Brand institute={institute} />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="grid h-9 w-9 place-items-center rounded-full border border-line text-mist lg:hidden"
          aria-label="Close menu"
        >
          <X size={17} />
        </button>
      </div>

      <div className="mx-4 mb-4 rounded-2xl border border-line bg-gradient-to-br from-lavender/80 to-white px-3.5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-[0.68rem] font-bold text-white">
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.8rem] font-semibold text-ink">{user.name}</p>
            <p className="truncate text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-purple">
              {roleLabel(user)}
            </p>
          </div>
        </div>
        {variant === "student" ? (
          <div className="mt-2.5 flex items-center justify-between rounded-xl bg-white/80 px-2.5 py-1.5 text-[0.7rem]">
            <span className="text-mist">Participation points</span>
            <span className="font-bold text-purple">{user.points || 0}</span>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {(nav || []).map((group) => (
          <div key={group.label}>
            <p className="px-2.5 pb-1.5 text-[0.58rem] font-bold uppercase tracking-[0.22em] text-mist/80">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon] || LayoutDashboard;
                return (
                  <Link key={item.href} href={item.href} className={cn("console-link", isActive(item.href) && "active")}>
                    <Icon size={16} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <Link
          href="/"
          className="flex items-center justify-between rounded-xl px-2.5 py-2 text-[0.78rem] font-medium text-ink-2 transition hover:bg-lavender hover:text-purple"
        >
          <span className="inline-flex items-center gap-2">
            <ArrowUpRight size={15} /> View public site
          </span>
        </Link>
        <button
          type="button"
          onClick={logout}
          className="mt-0.5 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[0.78rem] font-medium text-rose-600 transition hover:bg-rose-50"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] border-r border-line bg-white/85 backdrop-blur-xl lg:block">
        {sidebar}
      </aside>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="absolute inset-y-0 left-0 w-[280px] border-r border-line bg-white"
            >
              {sidebar}
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="lg:pl-[268px]">
        <header className="sticky top-0 z-30 border-b border-line/80 bg-ivory/85 backdrop-blur-xl">
          <div className="flex h-[68px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-ink-2 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-mist">
                {variant === "admin" ? "Admin console" : "Student portal"}
              </p>
              <h1 className="truncate text-[0.98rem] font-semibold text-ink">
                {activeItem?.label || (variant === "admin" ? "Command center" : "Overview")}
              </h1>
            </div>

            <Link
              href="/notifications"
              className="relative grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-ink-2 transition hover:border-violet-300 hover:text-purple"
              aria-label="Notifications"
            >
              <Bell size={17} />
              {unread > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 px-1 text-[0.6rem] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>

            <span className="hidden items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-2.5 sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-[0.66rem] font-bold text-white">
                {initials(user.name)}
              </span>
              <span className="text-left">
                <span className="block max-w-[8rem] truncate text-[0.74rem] font-semibold text-ink">{user.name}</span>
                <span className="block text-[0.58rem] uppercase tracking-[0.12em] text-mist">{roleLabel(user)}</span>
              </span>
            </span>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
