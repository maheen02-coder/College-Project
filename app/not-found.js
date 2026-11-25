import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import Brand from "@/components/ui/Brand";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 grid-lines opacity-30" />
        <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-600/15 blur-[130px]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink" />
      </div>

      <div className="relative max-w-md text-center">
        <div className="flex justify-center">
          <Brand />
        </div>
        <p className="mt-12 font-mono text-[0.7rem] uppercase tracking-[0.3em] text-violet-300">404 · Off campus</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          This page isn't on the calendar.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-mist">
          The link may be outdated, or the event was moved. Head back to campus and find your next moment.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn btn-primary">
            <ArrowLeft size={15} /> Back home
          </Link>
          <Link href="/events" className="btn btn-secondary">
            <Compass size={15} /> Browse events
          </Link>
        </div>
      </div>
    </div>
  );
}
