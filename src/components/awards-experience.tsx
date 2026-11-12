"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Award,
  CheckCircle2,
  Flame,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { CategoryFilter } from "@/components/category-filter";
import { Countdown } from "@/components/countdown";
import { Header } from "@/components/header";
import { NomineeCard } from "@/components/nominee-card";
import type { NomineeCardData } from "@/components/nominee-card";
import { VotingModal } from "@/components/voting-modal";

type AwardsExperienceProps = {
  nominees: NomineeCardData[];
  categories: Array<{ id: string; name: string; description: string | null; imageUrl: string | null }>;
  announcements: Array<{ id: string; title: string; message: string; kind: string }>;
  sponsors: Array<{ id: string; name: string; logoUrl: string; websiteUrl: string | null; tier: string }>;
  news: Array<{ id: string; slug: string; title: string; excerpt: string | null; imageUrl: string | null; publishedAt: string | null }>;
  stats: { totalVotes: string; totalNominees: number; totalCategories: number };
  databaseAvailable: boolean;
  votePrice: number;
  votingStatus: "open" | "paused" | "scheduled" | "closed";
  votingStartsAt: string | null;
  votingEndsAt: string | null;
  publicVoteCounts: boolean;
};

export function AwardsExperience({
  nominees,
  categories: categoryData,
  announcements,
  sponsors,
  news,
  stats,
  databaseAvailable,
  votePrice,
  votingStatus,
  votingStartsAt,
  votingEndsAt,
  publicVoteCounts,
}: AwardsExperienceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeNominee, setActiveNominee] = useState<NomineeCardData | null>(null);

  const categories = useMemo(() => categoryData.map((category) => category.name), [categoryData]);

  useEffect(() => {
    const category = new URLSearchParams(window.location.search).get("category");
    if (category && categories.includes(category)) setSelectedCategory(category);
  }, [categories]);

  const filteredNominees = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();
    return nominees.filter((nominee) => {
      const matchesCategory = selectedCategory === "All" || nominee.category === selectedCategory;
      const matchesSearch =
        !query ||
        [nominee.fullName, nominee.stageName ?? "", nominee.bio ?? "", nominee.category].some(
          (value) => value.toLocaleLowerCase().includes(query)
        );
      return matchesCategory && matchesSearch;
    });
  }, [nominees, searchTerm, selectedCategory]);

  const featuredNominees = nominees.filter((nominee) => nominee.isFeatured).slice(0, 3);
  const trendingNominees = [...nominees]
    .sort((left, right) => Number(BigInt(right.totalVotes) - BigInt(left.totalVotes)))
    .slice(0, 3);

  const votingLabel =
    votingStatus === "open"
      ? "Voting is Open"
      : votingStatus === "scheduled"
      ? "Voting Opens Soon"
      : votingStatus === "paused"
      ? "Voting is Paused"
      : "Voting is Closed";

  return (
    <main id="top" className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <Header searchTerm={searchTerm} onSearch={setSearchTerm} />

      {/* Hero Section with Ako Nyeri Landmark */}
      <section
        className="relative overflow-hidden border-b border-slate-800 bg-slate-950 text-white"
        aria-labelledby="page-title"
      >
        {/* Background Image Container */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/ako-nyeri.jpg"
            alt="Ako Nyeri Landmark"
            className="size-full object-cover object-[center_30%]"
          />
          {/* Multi-layer gradient overlay for crystal-clear readability and awards elegance */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/70" />
          <div className="absolute inset-0 bg-sky-950/20 mix-blend-multiply" />
        </div>

        {/* Ambient lighting effects */}
        <div className="pointer-events-none absolute -top-40 left-1/2 z-0 size-[500px] -translate-x-1/2 rounded-full bg-amber-500/15 blur-[120px]" />
        <div className="pointer-events-none absolute right-0 top-1/3 z-0 size-80 rounded-full bg-sky-500/15 blur-[100px]" />

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                <Sparkles className="size-3.5 text-amber-400" />
                Nyeri County · 2026 Edition
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
                {votingLabel}
              </span>
            </div>

            <h1
              id="page-title"
              className="mt-5 font-serif text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-tight"
            >
              Nyeri Content Creators{" "}
              <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
                Awards 2026
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              People&apos;s Choice. Discover the creative storytellers, comedians, videographers, photographers, and influencers shaping culture in Nyeri. Support your favorites with verified M-Pesa votes.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#nominees"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("nominees")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-6 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 hover:from-amber-300 hover:to-amber-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 cursor-pointer"
              >
                <span>Vote for Creators</span>
                <ArrowDown className="size-4" />
              </a>

              <Link
                href="/leaderboard"
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:border-slate-600 hover:bg-slate-700"
              >
                <Trophy className="size-4 text-amber-400" />
                <span>Live Standings</span>
              </Link>

              <Link
                href="/how-to-vote"
                className="inline-flex min-h-12 items-center gap-1.5 px-4 text-sm font-semibold text-slate-300 transition-colors hover:text-white"
              >
                <span>How to Vote</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="size-4 text-emerald-400" />
              <span>KES {votePrice} per vote · Instant STK Push confirmation via M-Pesa & PayHero</span>
            </div>
          </div>

          {/* Countdown timer on right side of Hero */}
          <div className="lg:min-w-[340px]">
            <Countdown
              target={votingStatus === "scheduled" ? votingStartsAt : votingEndsAt}
              label={votingStatus === "scheduled" ? "Voting starts in" : "Voting window closes in"}
            />
          </div>
        </div>
      </section>

      {/* Elevated Stats Bar */}
      <section className="relative z-10 -mt-7 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Award statistics">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-200/50 transition-all hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400">
              <Trophy className="size-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-950 dark:text-white">
                {BigInt(stats.totalVotes).toLocaleString()}
              </p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Votes Cast</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-200/50 transition-all hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/70 dark:text-sky-400">
              <Users className="size-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-950 dark:text-white">
                {stats.totalNominees.toLocaleString()}
              </p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Nominated Creators</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-200/50 transition-all hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400">
              <Award className="size-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-950 dark:text-white">
                {stats.totalCategories.toLocaleString()}
              </p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Award Categories</p>
            </div>
          </div>
        </div>
      </section>

      {/* Announcements */}
      {announcements[0] && (
        <aside className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Latest announcement">
          <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
            <Sparkles className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <strong className="font-semibold">{announcements[0].title}: </strong>
              <span>{announcements[0].message}</span>
            </div>
          </div>
        </aside>
      )}

      {/* Quick Category Showcase */}
      {categoryData.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8" aria-labelledby="featured-categories-heading">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Explore Categories
              </p>
              <h2 id="featured-categories-heading" className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                Featured Categories
              </h2>
            </div>
            <Link
              href="/categories"
              className="flex items-center gap-1 text-sm font-bold text-sky-700 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
            >
              <span>View all categories</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {categoryData.slice(0, 4).map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(category.name);
                  document.getElementById("nominees")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div>
                  <p className="font-bold text-slate-900 group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-400">
                    {category.name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {category.description || "Meet this year's creative nominees."}
                  </p>
                </div>
                <span className="mt-3 text-[11px] font-semibold text-sky-700 dark:text-sky-400">
                  Select category →
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Sticky Category Tabs */}
      <div className="mt-8">
        <CategoryFilter
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      {/* Featured Nominees Spotlight */}
      {featuredNominees.length > 0 && selectedCategory === "All" && (
        <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8" aria-labelledby="featured-nominees-heading">
          <div className="mb-5 flex items-center gap-2">
            <Sparkles className="size-5 text-amber-500" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400">
                In The Spotlight
              </p>
              <h2 id="featured-nominees-heading" className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                Featured Nominees
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredNominees.map((nominee) => (
              <NomineeCard
                key={`featured-${nominee.id}`}
                nominee={nominee}
                onVote={setActiveNominee}
                showVoteCounts={publicVoteCounts}
                votePrice={votePrice}
                votingOpen={votingStatus === "open"}
              />
            ))}
          </div>
        </section>
      )}

      {/* All Nominees Grid */}
      <section
        id="nominees"
        className="mx-auto max-w-7xl scroll-mt-28 px-4 py-10 sm:px-6 lg:px-8"
        aria-labelledby="nominees-heading"
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              {selectedCategory === "All" ? "All Creators" : selectedCategory}
            </p>
            <h2 id="nominees-heading" className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Cast Your Vote
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Users className="size-3.5 text-slate-400" />
              <span>
                {filteredNominees.length} {filteredNominees.length === 1 ? "Creator" : "Creators"} Listed
              </span>
            </span>
          </div>
        </div>

        {!databaseAvailable ? (
          <div className="rounded-2xl border border-amber-200 bg-white px-5 py-14 text-center dark:border-amber-900/40 dark:bg-slate-900" role="status">
            <Award className="mx-auto size-10 text-amber-500" />
            <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
              Nominee database is setting up
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Categories and nominees are loading. Please check back shortly.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
            >
              Refresh Page
            </button>
          </div>
        ) : filteredNominees.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredNominees.map((nominee) => (
              <NomineeCard
                key={nominee.id}
                nominee={nominee}
                onVote={setActiveNominee}
                showVoteCounts={publicVoteCounts}
                votePrice={votePrice}
                votingOpen={votingStatus === "open"}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
            <Users className="mx-auto size-10 text-slate-300 dark:text-slate-600" />
            <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">No creators match your filter</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Try searching with a different name or switch to &quot;All&quot; categories.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("All");
              }}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>

      {/* Trending Nominees / Live Podium */}
      {trendingNominees.length > 0 && publicVoteCounts && (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-labelledby="trending-heading">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="size-5 text-amber-500" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400">
                  Community Standings
                </p>
                <h2 id="trending-heading" className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                  Trending Leaders
                </h2>
              </div>
            </div>
            <Link
              href="/leaderboard"
              className="flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-800 dark:text-sky-400"
            >
              <span>Full Leaderboard</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {trendingNominees.map((nominee, index) => {
              const rankBadge =
                index === 0
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300"
                  : index === 1
                  ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-300"
                  : "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-300";

              return (
                <Link
                  key={nominee.id}
                  href={`/nominees/${encodeURIComponent(nominee.slug)}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-xl border text-sm font-extrabold ${rankBadge}`}
                  >
                    #{index + 1}
                  </span>

                  {nominee.photoUrl ? (
                    <img
                      src={nominee.photoUrl}
                      alt=""
                      className="size-11 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-400 dark:bg-slate-800">
                      {nominee.fullName.slice(0, 1)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-950 hover:text-sky-700 dark:text-white">
                      {nominee.stageName || nominee.fullName}
                    </p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {nominee.category}
                    </p>
                  </div>

                  <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                    {BigInt(nominee.totalVotes).toLocaleString()}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Latest News */}
      {news.length > 0 && (
        <section className="border-t border-slate-200/80 bg-white py-12 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Updates & Stories
                </p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                  Latest Awards News
                </h2>
              </div>
              <Link
                href="/news"
                className="flex items-center gap-1 text-sm font-bold text-sky-700 hover:text-sky-800 dark:text-sky-400"
              >
                <span>All Articles</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              {news.map((article) => (
                <Link
                  key={article.id}
                  href={`/news/${encodeURIComponent(article.slug)}`}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    {article.imageUrl && (
                      <div className="mb-4 aspect-video overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                        <img
                          src={article.imageUrl}
                          alt=""
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <h3 className="text-base font-bold text-slate-950 group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-400">
                      {article.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {article.excerpt || "Read the latest news and announcements."}
                    </p>
                  </div>
                  <span className="mt-4 flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-400">
                    <span>Read full story</span>
                    <ArrowRight className="size-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Partners / Sponsors */}
      {sponsors.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" aria-label="Sponsors and partners">
          <p className="mb-6 text-center text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Our Official Partners & Sponsors
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {sponsors.map((sponsor) => (
              <a
                key={sponsor.id}
                href={sponsor.websiteUrl || "/sponsors"}
                target={sponsor.websiteUrl ? "_blank" : undefined}
                rel={sponsor.websiteUrl ? "noreferrer" : undefined}
                className="flex items-center gap-2 grayscale transition-all hover:grayscale-0"
              >
                <img
                  src={sponsor.logoUrl}
                  alt={sponsor.name}
                  className="h-10 max-w-32 object-contain"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {sponsor.name}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Comprehensive Footer */}
      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {/* Col 1 */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 font-bold text-slate-950 dark:text-white">
                <img
                  src="/images/logo.jpg"
                  alt=""
                  className="size-6 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-amber-500/40"
                />
                <span>Nyeri Creators Awards</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Celebrating and empowering the digital content creators, storytellers, and cultural architects of Nyeri County.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="size-4" />
                <span>Verified M-Pesa & PayHero Payments</span>
              </div>
            </div>

            {/* Col 2 */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                The Awards
              </p>
              <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li><Link href="/" className="hover:text-sky-700 dark:hover:text-white">Home</Link></li>
                <li><Link href="/categories" className="hover:text-sky-700 dark:hover:text-white">All Categories</Link></li>
                <li><Link href="/leaderboard" className="hover:text-sky-700 dark:hover:text-white">Leaderboard Standings</Link></li>
                <li><Link href="/results" className="hover:text-sky-700 dark:hover:text-white">Official Winners</Link></li>
                <li><Link href="/sponsors" className="hover:text-sky-700 dark:hover:text-white">Partners & Sponsors</Link></li>
              </ul>
            </div>

            {/* Col 3 */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Voting & Rules
              </p>
              <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li><Link href="/how-to-vote" className="hover:text-sky-700 dark:hover:text-white">How to Vote</Link></li>
                <li><Link href="/voting-rules" className="hover:text-sky-700 dark:hover:text-white">Official Rules & Criteria</Link></li>
                <li><Link href="/news" className="hover:text-sky-700 dark:hover:text-white">News & Press Releases</Link></li>
                <li><Link href="/contact" className="hover:text-sky-700 dark:hover:text-white">Contact Organizers</Link></li>
              </ul>
            </div>

            {/* Col 4 */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Legal & Governance
              </p>
              <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li><Link href="/privacy" className="hover:text-sky-700 dark:hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-sky-700 dark:hover:text-white">Terms of Participation</Link></li>
                <li><Link href="/about" className="hover:text-sky-700 dark:hover:text-white">About the Initiative</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200/80 pt-6 text-xs text-slate-500 sm:flex-row dark:border-slate-800 dark:text-slate-400">
            <p>© 2026 Nyeri Content Creators of the Year. All rights reserved.</p>
            <p>1 Vote = KES {votePrice}. Secured with M-Pesa STK Push.</p>
          </div>
        </div>
      </footer>

      {activeNominee && (
        <VotingModal
          nominee={activeNominee}
          votePrice={votePrice}
          onClose={() => setActiveNominee(null)}
        />
      )}
    </main>
  );
}
