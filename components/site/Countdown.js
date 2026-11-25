"use client";

import { useEffect, useState } from "react";

function diff(target) {
  const ms = Math.max(0, new Date(target).getTime() - Date.now());
  return {
    total: ms,
    days: Math.floor(ms / 864e5),
    hours: Math.floor((ms % 864e5) / 36e5),
    minutes: Math.floor((ms % 36e5) / 6e4),
    seconds: Math.floor((ms % 6e4) / 1000),
  };
}

export default function Countdown({ target, label = "Registration closes in" }) {
  const [time, setTime] = useState(() => diff(target));

  useEffect(() => {
    const id = setInterval(() => setTime(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (time.total <= 0) {
    return (
      <div className="rounded-xl border border-line bg-lilac/60 px-4 py-3 text-center text-sm font-semibold text-mist">
        Registration closed
      </div>
    );
  }

  const cells = [
    { value: time.days, label: "days" },
    { value: time.hours, label: "hrs" },
    { value: time.minutes, label: "min" },
    { value: time.seconds, label: "sec" },
  ];

  return (
    <div>
      <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-mist">{label}</p>
      <div className="grid grid-cols-4 gap-2">
        {cells.map((cell) => (
          <div key={cell.label} className="rounded-xl border border-line bg-white px-2 py-2 text-center shadow-sm">
            <span className="block font-display text-lg font-bold leading-none text-ink">
              {String(cell.value).padStart(2, "0")}
            </span>
            <span className="mt-1 block text-[0.58rem] uppercase tracking-[0.12em] text-mist">{cell.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
