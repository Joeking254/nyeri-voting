"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function remainingTime(target: string, now: number) {
  const seconds = Math.max(0, Math.floor((new Date(target).getTime() - now) / 1000));
  return {
    days: Math.floor(seconds / 86_400),
    hours: Math.floor((seconds % 86_400) / 3_600),
    minutes: Math.floor((seconds % 3_600) / 60),
    seconds: seconds % 60,
  };
}

export function Countdown({
  target,
  label = "Voting closes in",
  className = "",
}: {
  target: string | null;
  label?: string;
  className?: string;
}) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!target || !now) return null;
  const remaining = remainingTime(target, now);
  if (remaining.days + remaining.hours + remaining.minutes + remaining.seconds === 0) return null;

  const units = [
    { label: "Days", value: remaining.days },
    { label: "Hours", value: remaining.hours },
    { label: "Mins", value: remaining.minutes },
    { label: "Secs", value: remaining.seconds },
  ];

  return (
    <div
      className={`mt-6 max-w-md rounded-2xl border border-amber-500/30 bg-slate-900/90 p-4 shadow-xl backdrop-blur-md ${className}`}
    >
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
        <Clock className="size-3.5" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center" aria-live="off">
        {units.map((unit) => (
          <div
            key={unit.label}
            className="rounded-xl border border-slate-700/60 bg-slate-800/90 px-2 py-2"
          >
            <span className="block font-mono text-2xl font-bold tabular-nums text-white">
              {String(unit.value).padStart(2, "0")}
            </span>
            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
