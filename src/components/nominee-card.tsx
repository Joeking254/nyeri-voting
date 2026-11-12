"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, CheckCircle2, MapPin, Share2, Sparkles, Users } from "lucide-react";

export type NomineeCardData = {
  id: string;
  slug: string;
  fullName: string;
  stageName: string | null;
  bio: string | null;
  photoUrl: string | null;
  photoPosition: string;
  location: string | null;
  isVerified: boolean;
  isFeatured: boolean;
  totalVotes: string;
  category: string;
};

type NomineeCardProps = {
  nominee: NomineeCardData;
  onVote: (nominee: NomineeCardData) => void;
  showVoteCounts: boolean;
  votePrice: number;
  votingOpen: boolean;
};

export function NomineeCard({
  nominee,
  onVote,
  showVoteCounts,
  votePrice,
  votingOpen,
}: NomineeCardProps) {
  const [copied, setCopied] = useState(false);
  const displayName = nominee.stageName || nominee.fullName;

  async function shareProfile(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const url = `${window.location.origin}/nominees/${encodeURIComponent(nominee.slug)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: displayName, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      {/* Portrait / Media: Clean Edge-to-Edge Autocrop */}
      <Link
        href={`/nominees/${encodeURIComponent(nominee.slug)}`}
        className="relative block aspect-[4/5] w-full overflow-hidden bg-slate-100 dark:bg-slate-800"
        aria-label={`View ${displayName}'s profile`}
      >
        {nominee.photoUrl ? (
          <img
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={{
              objectPosition:
                nominee.photoPosition === "bottom"
                  ? "center bottom"
                  : nominee.photoPosition === "top"
                  ? "center top"
                  : "center 20%",
            }}
            src={nominee.photoUrl}
            alt={`${displayName}, nominee for ${nominee.category}`}
            loading="lazy"
          />
        ) : (
          <div
            className="flex size-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-6xl font-bold text-slate-300 dark:from-slate-800 dark:to-slate-900 dark:text-slate-600"
            aria-hidden="true"
          >
            {displayName.slice(0, 1).toUpperCase()}
          </div>
        )}

        {/* Subtle gradient overlay at bottom for legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Category Pill on Image */}
        <span className="absolute left-3 top-3 z-20 max-w-[calc(100%-80px)] truncate rounded-full border border-white/20 bg-slate-950/75 px-3 py-1 text-xs font-bold text-white shadow-md backdrop-blur-md">
          {nominee.category}
        </span>

        {/* Featured Badge */}
        {nominee.isFeatured && (
          <span className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
            <Sparkles className="size-3" />
            Featured
          </span>
        )}

        {/* Creator Name on Image Preview for Mobile */}
        <div className="absolute bottom-3 left-3 right-3 z-20 text-white sm:hidden">
          <p className="truncate text-base font-bold drop-shadow-md">{displayName}</p>
        </div>
      </Link>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Category Badge in Card Body for 100% Guaranteed Visibility */}
        <div className="mb-2">
          <span className="inline-block rounded-md bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-400/10 dark:text-amber-300">
            {nominee.category}
          </span>
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 truncate text-lg font-bold tracking-tight text-slate-950 dark:text-white">
              <Link
                href={`/nominees/${encodeURIComponent(nominee.slug)}`}
                className="truncate hover:text-sky-700 dark:hover:text-sky-400"
              >
                {nominee.fullName}
              </Link>
              {nominee.isVerified && (
                <span
                  title="Verified Creator"
                  className="inline-flex shrink-0 text-sky-600 dark:text-sky-400"
                >
                  <CheckCircle2 className="size-4 fill-sky-600 text-white dark:fill-sky-400 dark:text-slate-900" />
                </span>
              )}
            </h2>

            {nominee.stageName && nominee.stageName !== nominee.fullName && (
              <p className="truncate text-xs font-semibold text-sky-700 dark:text-sky-400">
                @{nominee.stageName.replace(/^@/, "")}
              </p>
            )}
          </div>

          {/* Quick Share Icon */}
          <button
            type="button"
            onClick={shareProfile}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            title={copied ? "Link Copied!" : "Share Profile"}
            aria-label={`Share ${displayName}'s profile`}
          >
            {copied ? (
              <Check className="size-4 text-emerald-600" />
            ) : (
              <Share2 className="size-4" />
            )}
          </button>
        </div>

        {nominee.location && (
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="size-3 shrink-0 text-slate-400" />
            <span>{nominee.location}</span>
          </p>
        )}

        <p className="mt-2.5 line-clamp-2 min-h-10 text-xs leading-5 text-slate-600 dark:text-slate-300">
          {nominee.bio || "Nominated for their creativity and storytelling in Nyeri."}
        </p>

        {/* Vote Counts */}
        {showVoteCounts && (
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <Users className="size-3.5 text-slate-400" />
              <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                {BigInt(nominee.totalVotes).toLocaleString()}
              </span>{" "}
              votes
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              KES {votePrice} / vote
            </span>
          </div>
        )}

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onVote(nominee);
          }}
          disabled={!votingOpen}
          className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 px-4 text-sm font-bold text-white shadow-md shadow-sky-700/20 transition-all hover:from-sky-700 hover:to-sky-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Vote for ${displayName}, KES ${votePrice} per vote`}
        >
          <span className="truncate">{votingOpen ? `Vote for ${displayName}` : "Voting Closed"}</span>
          <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>
    </article>
  );
}
