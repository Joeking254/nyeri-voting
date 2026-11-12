import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PublicPageShell } from "@/components/public-page-shell";
import { Award, Sparkles, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  let results: Array<{
    id: string;
    awardYear: number;
    category: { name: string };
    nominee: {
      slug: string;
      fullName: string;
      stageName: string | null;
      photoUrl: string | null;
    };
  }> = [];

  try {
    results = await prisma.awardResult.findMany({
      where: { isPublished: true },
      orderBy: [
        { awardYear: "desc" },
        { category: { orderIndex: "asc" } },
      ],
      include: {
        category: { select: { name: true } },
        nominee: {
          select: {
            slug: true,
            fullName: true,
            stageName: true,
            photoUrl: true,
          },
        },
      },
    });
  } catch {
    results = [];
  }

  return (
    <PublicPageShell
      eyebrow="Official Hall of Fame"
      title="Winners & Honorees"
      description="Official winners validated and announced by the Nyeri Content Creators Awards organizers."
    >
      {results.length ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {results.map((result) => (
            <article
              key={result.id}
              className="group flex gap-4 rounded-2xl border border-amber-300/60 bg-gradient-to-br from-amber-50/40 to-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-amber-900/40 dark:from-amber-950/20 dark:to-slate-900"
            >
              {result.nominee.photoUrl ? (
                <img
                  src={result.nominee.photoUrl}
                  alt=""
                  className="size-24 shrink-0 rounded-xl object-cover ring-2 ring-amber-400"
                />
              ) : (
                <div className="flex size-24 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-2xl font-bold text-amber-700 ring-2 ring-amber-400 dark:bg-amber-950 dark:text-amber-300">
                  <Trophy className="size-8" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <Sparkles className="size-3.5" />
                  <span>{result.awardYear} Winner</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {result.category.name}
                </p>
                <Link
                  href={`/nominees/${encodeURIComponent(result.nominee.slug)}`}
                  className="mt-1 block truncate text-base font-bold text-slate-950 hover:text-sky-700 dark:text-white dark:hover:text-sky-400"
                >
                  {result.nominee.stageName || result.nominee.fullName}
                </Link>
                {result.nominee.stageName && result.nominee.stageName !== result.nominee.fullName && (
                  <p className="text-xs text-slate-400">
                    {result.nominee.fullName}
                  </p>
                )}
                <Link
                  href={`/nominees/${encodeURIComponent(result.nominee.slug)}`}
                  className="mt-3 inline-block text-xs font-bold text-sky-700 hover:text-sky-800 dark:text-sky-400"
                >
                  View Profile & Acceptance →
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Trophy className="mx-auto size-12 text-slate-300 dark:text-slate-600" />
          <h3 className="mt-3 text-lg font-bold text-slate-950 dark:text-white">
            Official Results Have Not Been Released
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Voting is currently underway. Final certified winners will be published here following the grand gala audit.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/leaderboard"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
            >
              <span>View Current Leaderboard</span>
            </Link>
            <Link
              href="/#nominees"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300"
            >
              <span>Vote for Nominees</span>
            </Link>
          </div>
        </div>
      )}
    </PublicPageShell>
  );
}
