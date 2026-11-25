"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import Brand from "@/components/ui/Brand";
import Magnetic from "@/components/ui/Magnetic";
import { cn, initials, timeAgo } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/societies", label: "Societies" },
  { href: "/competitions", label: "Competitions" },
  { href: "/recruitment", label: "Recruitment" },
  { href: "/updates", label: "Updates" },
  { href: "/calendar", label: "Calendar" },
  { href: "/about", label: "About" },
];

function dashboardFor(role) {
  if (role === "admin" || role === "superadmin") return "/admin";
  return "/dashboard";
}

export default function Navbar({ user, institute }) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const menuRef = useRef(null);
  const bellRef = useRef(null);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.3 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMenu(false);
    setBell(false);
  }, [pathname]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetch("/api/notifications?limit=6")
      .then((res) => res.json())
      .then((data) => {
        if (!active || !data.ok) return;
        setNotifications(data.notifications || []);
        setUnread(data.unread || 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, pathname]);

  useEffect(() => {
    const onClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenu(false);
      if (bellRef.current && !bellRef.current.contains(event.target)) setBell(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setUnread(0);
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  };

  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "border-b border-line/80 bg-white/85 shadow-[0_10px_30px_-24px_rgba(23,19,50,0.35)] backdrop-blur-xl" : "bg-transparent"
      )}
    >
      <motion.div
        className="absolute inset-x-0 top-0 h-[2px] origin-left bg-gradient-to-r from-violet-500 via-purple-500 to-blue-500"
        style={{ scaleX: progress }}
      />
      <div className="container-x flex h-[76px] items-center justify-between gap-5">
        <Brand institute={institute} />

        <nav className="hidden items-center gap-5 xl:gap-7 lg:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={cn("nav-link", isActive(link.href) && "active")}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <Link
            href="/verify"
            className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-[0.78rem] font-medium text-ink-2 transition hover:bg-lavender hover:text-purple md:flex"
          >
            <ShieldCheck size={15} /> Verify
          </Link>

          {user ? (
            <>
              <div className="relative" ref={bellRef}>
                <button
                  type="button"
                  onClick={() => setBell((value) => !value)}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink-2 transition hover:border-violet-300 hover:text-purple"
                  aria-label="Notifications"
                >
                  <Bell size={17} />
                  {unread > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 px-1 text-[0.6rem] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  ) : null}
                </button>
                <AnimatePresence>
                  {bell ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_70px_-30px_rgba(23,19,50,0.4)]"
                    >
                      <div className="flex items-center justify-between border-b border-line px-4 py-3">
                        <p className="text-[0.8rem] font-semibold text-ink">Notifications</p>
                        {unread > 0 ? (
                          <button type="button" onClick={markAllRead} className="text-[0.7rem] font-medium text-purple hover:underline">
                            Mark all read
                          </button>
                        ) : null}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="px-4 py-8 text-center text-[0.78rem] text-mist">You are all caught up.</p>
                        ) : (
                          notifications.map((item) => (
                            <Link
                              key={item.id}
                              href={item.link || "/notifications"}
                              className={cn(
                                "block border-b border-line/60 px-4 py-3 transition last:border-0 hover:bg-lavender/60",
                                !item.read && "bg-violet-50/50"
                              )}
                            >
                              <div className="flex items-start gap-2.5">
                                <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", item.read ? "bg-slate-300" : "bg-violet-500")} />
                                <div className="min-w-0">
                                  <p className="truncate text-[0.78rem] font-semibold text-ink">{item.title}</p>
                                  <p className="mt-0.5 line-clamp-2 text-[0.72rem] leading-relaxed text-mist">{item.message}</p>
                                  <p className="mt-1 text-[0.64rem] text-mist/80">{timeAgo(item.createdAt)}</p>
                                </div>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                      <Link href="/notifications" className="flex items-center justify-center gap-1.5 border-t border-line px-4 py-2.5 text-[0.75rem] font-semibold text-purple hover:bg-lavender">
                        View all <ArrowUpRight size={13} />
                      </Link>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenu((value) => !value)}
                  className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-2.5 transition hover:border-violet-300"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-[0.68rem] font-bold text-white">
                    {initials(user.name)}
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block max-w-[7.5rem] truncate text-[0.76rem] font-semibold text-ink">{user.name}</span>
                    <span className="block text-[0.6rem] uppercase tracking-[0.14em] text-mist">
                      {user.role === "superadmin" ? "Super Admin" : user.role}
                    </span>
                  </span>
                  <ChevronDown size={13} className={cn("text-mist transition", menu && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {menu ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-[0_30px_70px_-30px_rgba(23,19,50,0.4)]"
                    >
                      <div className="px-3 py-2">
                        <p className="truncate text-[0.8rem] font-semibold text-ink">{user.name}</p>
                        <p className="truncate text-[0.7rem] text-mist">{user.email}</p>
                      </div>
                      <div className="my-1 h-px bg-line" />
                      <Link href={dashboardFor(user.role)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.8rem] font-medium text-ink-2 transition hover:bg-lavender hover:text-purple">
                        <LayoutDashboard size={15} /> {user.role === "student" ? "Student dashboard" : "Admin console"}
                      </Link>
                      <Link href="/dashboard/profile" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.8rem] font-medium text-ink-2 transition hover:bg-lavender hover:text-purple">
                        <UserRound size={15} /> Profile & academics
                      </Link>
                      <Link href="/notifications" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.8rem] font-medium text-ink-2 transition hover:bg-lavender hover:text-purple">
                        <Bell size={15} /> Notifications
                      </Link>
                      <div className="my-1 h-px bg-line" />
                      <button
                        type="button"
                        onClick={logout}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[0.8rem] font-medium text-rose-600 transition hover:bg-rose-50"
                      >
                        <LogOut size={15} /> Sign out
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-full px-3.5 py-2 text-[0.8rem] font-semibold text-ink-2 transition hover:text-purple sm:block">
                Sign in
              </Link>
              <Magnetic strength={0.2}>
                <Link href="/signup" className="btn btn-primary btn-sm">
                  <Sparkles size={14} /> Join KIPS
                </Link>
              </Magnetic>
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink-2 lg:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-line bg-white/95 backdrop-blur-xl lg:hidden"
          >
            <div className="container-x grid gap-1 py-4">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    isActive(link.href) ? "bg-lavender text-purple" : "text-ink-2 hover:bg-lavender/60"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/verify" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-lavender/60">
                <ShieldCheck size={15} /> Verify a certificate
              </Link>
              {!user ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link href="/login" className="btn btn-ghost btn-sm justify-center">
                    Sign in
                  </Link>
                  <Link href="/signup" className="btn btn-primary btn-sm justify-center">
                    Join KIPS
                  </Link>
                </div>
              ) : (
                <Link href={dashboardFor(user.role)} className="mt-2 btn btn-secondary btn-sm justify-center">
                  <CalendarDays size={14} /> Open dashboard
                </Link>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
