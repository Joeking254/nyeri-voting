"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, CreditCard, Sparkles, Trophy, X } from "lucide-react";

type VoteConfirmationCardProps = {
  votes: number | string;
  nomineeName: string;
  categoryName?: string;
  photoUrl?: string | null;
  receipt?: string;
  nomineeSlug?: string;
};

export function VoteConfirmationCard({
  votes,
  nomineeName,
  categoryName,
  photoUrl,
  receipt,
  nomineeSlug,
}: VoteConfirmationCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const voteCount = Number(votes) || votes;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="relative mb-8 overflow-hidden rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-white to-sky-500/10 p-6 shadow-xl backdrop-blur-sm sm:p-8 dark:from-emerald-950/40 dark:via-slate-900 dark:to-sky-950/30 dark:border-emerald-500/30"
    >
      {/* Decorative background glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-sky-400/20 blur-3xl" />

      {/* Dismiss button */}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss confirmation"
        className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <X className="size-4" />
      </button>

      <div className="relative">
        {/* Header Tag */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
          <Sparkles className="size-3.5 animate-pulse" />
          <span>Payment Verified & Votes Cast</span>
        </div>

        {/* Main Banner Heading */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Thank You for Voting!
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Your votes have been officially recorded on the live blockchain-grade ledger.
            </p>
          </div>
        </div>

        {/* The Card of Votes Casted & To Who */}
        <div className="mt-6 rounded-2xl border border-emerald-200/70 bg-white/90 p-5 shadow-sm sm:p-6 dark:border-emerald-900/40 dark:bg-slate-850/90">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            {/* Nominee Info ("To Who") */}
            <div className="flex items-center gap-4">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={nomineeName}
                  className="size-16 shrink-0 rounded-2xl object-cover shadow-md ring-2 ring-emerald-500/50 sm:size-20"
                />
              ) : (
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-md ring-2 ring-emerald-500/50 sm:size-20 dark:bg-emerald-950 dark:text-emerald-300">
                  <Trophy className="size-8" />
                </div>
              )}

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Votes Cast For Nominee
                </span>
                <h3 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">
                  {nomineeName}
                </h3>
                {categoryName && (
                  <p className="mt-0.5 inline-block rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                    {categoryName}
                  </p>
                )}
              </div>
            </div>

            {/* Votes Cast Pill ("Card of Votes Casted") */}
            <div className="flex flex-col items-start gap-1 rounded-2xl border border-emerald-300 bg-emerald-50/80 px-6 py-4 sm:items-end dark:border-emerald-800 dark:bg-emerald-950/50">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Total Credited
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black tabular-nums text-emerald-700 dark:text-emerald-300 sm:text-4xl">
                  +{voteCount}
                </span>
                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-400">
                  {voteCount === 1 ? "Vote" : "Votes"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <CreditCard className="size-3 text-sky-600 dark:text-sky-400" />
                <span>Card Payment via Paystack</span>
              </div>
            </div>
          </div>

          {/* Receipt & Details Footer */}
          {receipt && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Official Receipt:{" "}
                  <strong className="font-mono font-bold text-slate-900 dark:text-white">
                    {receipt}
                  </strong>
                </span>
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Timestamp: {new Date().toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {nomineeSlug && (
            <Link
              href={`/nominees/${nomineeSlug}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
            >
              <span>View {nomineeName}&apos;s Profile</span>
              <ChevronRight className="size-4" />
            </Link>
          )}
          <Link
            href="/leaderboard"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Trophy className="size-4 text-amber-500" />
            <span>Check Leaderboard Standings</span>
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
