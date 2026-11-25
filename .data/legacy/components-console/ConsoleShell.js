"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardCheck,
  ExternalLink,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Megaphone,
  Menu,
  PlusCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  Users2,
  X,
} from "lucide-react";
import Brand from "@/components/ui/Brand";
import { cn, initials } from "@/lib/utils";

const NAV = {
  student: {
    root: "/dashboard",
    label: "Student workspace",
    groups: [
      {
        title: "My campus",
        links: [
          { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
          { href: "/dashboard/registrations", label: "My events", icon: CalendarDays },
          { href: "/dashboard/competitions", label: "Competitions", icon: Trophy },
          { href: "/dashboard/certificates", label: "Certificates", icon: Award },
        ],
      },
      {
        title: "Account",
        links: [
          { href: "/dashboard/profile", label: "Profile", icon: UserRound },
          { href: "/notifications", label: "Notifications", icon: Bell },
          { href: "/verify", label: "Verify certificate", icon: ShieldCheck },
        ],
      },
    ],
  },
  organizer: {
    root: "/organizer",
    label: "Organizer console",
    groups: [
      {
        title: "Programmes",
        links: [
          { href: "/organizer", label: "Overview", icon: LayoutDashboard },
          { href: "/organizer/events", label: "My events", icon: CalendarDays },
          { href: "/organizer/events/new", label: "Create event", icon: PlusCircle },
          { href: "/organizer/competitions", label: "Competitions", icon: Trophy },
          { href: "/organizer/competitions/new", label: "Create competition", icon: Sparkles },
        ],
      },
      {
        title: "Operations",
        links: [
          { href: "/organizer/registrations", label: "Registrations", icon: ListChecks },
          { href: "/organizer/certificates", label: "Certificates", icon: Award },
          { href: "/notifications", label: "Notifications", icon: Bell },
        ],
      },
    ],
  },
  admin: {
    root: "/admin",
    label: "Administration",
    groups: [
      {
        title: "Overview",
        links: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
      },
      {
        title: "People",
        links: [
          { href: "/admin/students", label: "Students", icon: GraduationCap },
          { href: "/admin/organizers", label: "Organizers", icon: Users2 },
        ],
      },
      {
        title: "Programmes",
        links: [
          { href: "/admin/events", label: "Events", icon: CalendarDays },
          { href: "/admin/competitions", label: "Competitions", icon: Trophy },
          { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
        ],
      },
      {
        title: "Operations",
        links: [
          { href: "/admin/registrations", label: "Registrations", icon: ListChecks },
          { href: "/admin/participants", label: "Participants", icon: Users2 },
          { href: "/admin/attendance", label: "Attendance", icon: ClipboardCheck },
          { href: "/admin/results", label: "Results", icon: BarChart3 },
          { href: "/admin/certificates", label: "Certificates", icon: Award },
        ],
      },
      {
        title: "System",
        links: [
          { href: "/admin/reports", label: "Reports", icon: BarChart3 },
          { href: "/admin/settings", label: "Settings", icon: Settings },
        ],
      },
    ],
  },
};

const ROLE_LABEL = {
  student: "Student",
  organizer: "Organizer",
  admin: "Administrator",
  superadmin: "Super admin",
};

export default function ConsoleShell({ user, role, institute, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const nav = NAV[role] || NAV.student;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href) =>
    href === nav.root ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-6">
        <Brand institute={institute} compact />
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[0.6rem] font-medium uppercase tracking-[0.16em] text-mist">
          <ShieldCheck size={10} className="text-violet-300" />
          {nav.label}
        </p>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {nav.groups.map((group) => (
          <div key={group.title}>
            <p className="px-2 pb-2 text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-mist/60">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.links.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.8rem] transition",
                      active
                        ? "bg-gradient-to-r from-violet-500/20 to-blue-500/10 text-white shadow-[inset_0_0_0_1px_rgba(139,92,246,0.25)]"
                        : "text-mist hover:bg-white/[0.04] hover:text-white"
                    )}
                  >
                    <link.icon size={15} className={active ? "text-violet-300" : "text-mist/70"} />
                    <span className="truncate">{link.label}</span>
                    {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" /> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.78rem] text-mist transition hover:bg-white/[0.04] hover:text-white"
        >
          <ExternalLink size={14} /> View public site
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#05070f]">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 top-0 h-[360px] w-[360px] rounded-full bg-violet-700/10 blur-[140px]" />
        <div className="absolute right-0 top-1/3 h-[320px] w-[320px] rounded-full bg-blue-700/10 blur-[140px]" />
      </div>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/[0.06] bg-[#070a15]/90 backdrop-blur-xl lg:block">
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
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-full w-[280px] border-r border-white/[0.08] bg-[#070a15]"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-white/10 text-mist"
              >
                <X size={15} />
              </button>
              {sidebar}
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#05070f]/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-mist lg:hidden"
            >
              <Menu size={17} />
            </button>

            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-[0.8rem] font-medium text-white">{user.name}</p>
              <p className="text-[0.62rem] uppercase tracking-[0.16em] text-mist">
                {ROLE_LABEL[user.role] || "Member"} · {institute?.shortName || "KIPS College"}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/notifications"
                aria-label="Notifications"
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-mist transition hover:border-violet-400/30 hover:text-white"
              >
                <Bell size={16} />
              </Link>
              <Link
                href="/"
                className="hidden items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[0.72rem] text-mist transition hover:border-violet-400/30 hover:text-white sm:inline-flex"
              >
                <ExternalLink size={13} /> Public site
              </Link>
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] py-1 pl-1 pr-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet-500/70 to-blue-500/70 text-[0.62rem] font-bold text-white">
                  {initials(user.name)}
                </span>
                <span className="hidden max-w-[120px] truncate text-[0.72rem] text-white/85 sm:block">
                  {user.name.split(" ")[0]}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  aria-label="Sign out"
                  className="text-mist transition hover:text-rose-300"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
