import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function randomCode(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export function makeId(prefix, length = 6) {
  return `${prefix}-${randomCode(length)}`;
}

export function formatDate(value, opts = {}) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(value)
  );
}

export function formatDateRange(start, end) {
  if (!start) return "—";
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  if (!e) return formatDate(s);
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) return `${formatDate(s)} · ${formatTime(s)} – ${formatTime(e)}`;
  return `${formatDate(s)} – ${formatDate(e)}`;
}

export function timeAgo(value) {
  if (!value) return "";
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function eventPhase(event, now = new Date()) {
  if (!event) return "upcoming";
  if (event.status === "cancelled") return "cancelled";
  const t = now.getTime();
  const start = new Date(event.startAt).getTime();
  const end = new Date(event.endAt).getTime();
  const deadline = new Date(event.registrationDeadline).getTime();
  const openAt = new Date(event.registrationOpenAt).getTime();
  if (event.status === "completed" || t > end) return "completed";
  if (t >= start) return "ongoing";
  if (t > deadline) return "registration_closed";
  if (t >= openAt) return "registration_open";
  return "upcoming";
}

export function competitionPhase(competition, now = new Date()) {
  if (!competition) return "upcoming";
  if (competition.status === "cancelled") return "cancelled";
  const t = now.getTime();
  const start = new Date(competition.startAt).getTime();
  const end = new Date(competition.endAt).getTime();
  const deadline = new Date(competition.registrationDeadline).getTime();
  if (competition.status === "completed" || t > end) return "completed";
  if (t >= start) return "ongoing";
  if (t > deadline) return "registration_closed";
  return "registration_open";
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function pct(value, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

export function truncate(text = "", max = 120) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}
