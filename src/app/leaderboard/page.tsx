import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/header";
import { Award, Flame, Trophy, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const settings = await prisma.eventSettings.findUnique({ where: { id: "global" } });
  const now = new Date();
  const closed =
    settings?.votingOpen === false ||
    Boolean(settings?.votingEndsAt && settings.votingEndsAt <= now);

  if (settings?.publicLeaderboard === false || (closed && settings?.leaderboardAfterClose)) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
        <Header />
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <Trophy className="mx-auto size-12 text-slate-400" />
          <h1 className="mt-4 text-3xl font-extrabold">Leaderboard Unavailable</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Official rankings will be shared when final voting results are audited.
          </p>
          <Link
            className="mt-6 inline-block rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
            href="/"
          >
            Return to Awards Home
          </Link>
        </div>
      </main>
    );
  }

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { orderIndex: "asc" },
    include: {
      nominees: {
        where: { isActive: true, isApproved: true },
        orderBy: { totalVotes: "desc" },
        take: 10,
        select: {
          id: true,
          slug: true,
          fullName: true,
          stageName: true,
          photoUrl: true,
          totalVotes: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <Header />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                <span className="size-2 animate-pulse rounded-full bg-rose-600" />
                Live Standings
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Updated {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Official Leaderboard
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Live vote standings for every award category. Support your favorite creator to boost their rank!
            </p>
          </div>

          <Link
            href="/#nominees"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 text-sm font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500"
          >
            <span>Cast Your Vote</span>
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {categories.map((category) => (
            <article
              key={category.id}
              className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-850">
                <div className="flex items-center gap-2">
                  <Award className="size-5 text-sky-600 dark:text-sky-400" />
                  <h2 className="text-base font-bold text-slate-950 dark:text-white">
                    {category.name}
                  </h2>
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {category.nominees.length} {category.nominees.length === 1 ? "nominee" : "nominees"}
                </span>
              </div>

              <ol className="divide-y divide-slate-100 dark:divide-slate-800">
                {category.nominees.map((nominee, index) => {
                  const isFirst = index === 0;
                  const isSecond = index === 1;
                  const isThird = index === 2;

                  const rankClass = isFirst
                    ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                    : isSecond
                    ? "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200"
                    : isThird
                    ? "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300"
                    : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-850 dark:text-slate-400";

                  return (
                    <li
                      key={nominee.id}
                      className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 sm:px-5"
                    >
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-xl border text-xs font-extrabold ${rankClass}`}
                      >
                        {index + 1}
                      </span>

                      {nominee.photoUrl ? (
                        <img
                          src={nominee.photoUrl}
                          alt=""
                          className="size-11 shrink-0 rounded-xl object-cover object-[center_20%]"
                        />
                      ) : (
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-400 dark:bg-slate-800">
                          {nominee.fullName.slice(0, 1)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/nominees/${encodeURIComponent(nominee.slug)}`}
                          className="block truncate font-bold text-slate-900 hover:text-sky-700 dark:text-white dark:hover:text-sky-400"
                        >
                          {nominee.stageName || nominee.fullName}
                        </Link>
                        {nominee.stageName && nominee.stageName !== nominee.fullName && (
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {nominee.fullName}
                          </p>
                        )}
                      </div>

                      {settings?.publicVoteCounts !== false && (
                        <div className="text-right">
                          <span className="block text-sm font-extrabold tabular-nums text-slate-950 dark:text-white">
                            {BigInt(nominee.totalVotes).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400">votes</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>

              {category.nominees.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No approved nominees in this category yet.
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
