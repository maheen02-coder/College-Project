import Link from "next/link";
import {
  BookOpen,
  CalendarHeart,
  GraduationCap,
  HandHeart,
  Landmark,
  Mic2,
  Palette,
  PartyPopper,
  Trophy,
  Wrench,
} from "lucide-react";

const ICONS = {
  "College Events": Landmark,
  "Society Events": UsersIcon,
  Entertainment: PartyPopper,
  Cultural: Palette,
  Sports: Trophy,
  Workshops: Wrench,
  Seminars: Mic2,
  Competitions: GraduationCap,
  Celebrations: CalendarHeart,
  Charity: HandHeart,
  Other: BookOpen,
};

function UsersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={props.size || 18} height={props.size || 18} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export default function CategoryGrid({ categories = [] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((category) => {
        const Icon = ICONS[category] || BookOpen;
        return (
          <Link
            key={category}
            href={`/events?category=${encodeURIComponent(category)}`}
            className="card card-hover group flex items-center gap-3 px-4 py-4"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lilac text-purple transition-colors group-hover:bg-purple group-hover:text-white">
              <Icon size={18} />
            </span>
            <span className="text-[0.82rem] font-semibold leading-tight text-ink-2 group-hover:text-ink">
              {category}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
