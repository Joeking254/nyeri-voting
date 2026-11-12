import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/header";
import { ArrowRight, Award, Trophy, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { orderIndex: "asc" },
    include: {
      _count: {
        select: { nominees: { where: { isActive: true, isApproved: true } } },
      },
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <Header />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-14 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800">
          <div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-900 dark:bg-amber-950 dark:text-amber-300">
              People&apos;s Choice 2026
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Award Categories
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Explore all official categories celebrating Nyeri County&apos;s digital storytellers and creative talents.
            </p>
          </div>

          <Link
            href="/#nominees"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 text-sm font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500"
          >
            <Trophy className="size-4" />
            <span>Vote Now</span>
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/?category=${encodeURIComponent(category.name)}#nominees`}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400">
                    <Award className="size-5" />
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Users className="size-3" />
                    <span>{category._count.nominees} {category._count.nominees === 1 ? "Creator" : "Creators"}</span>
                  </span>
                </div>

                <h2 className="mt-4 text-lg font-bold text-slate-950 group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-400">
                  {category.name}
                </h2>

                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {category.description || "Celebrating outstanding creators in this category."}
                </p>
              </div>

              <div className="mt-6 flex items-center gap-1 text-xs font-bold text-sky-700 group-hover:gap-1.5 transition-all dark:text-sky-400">
                <span>View Creators & Vote</span>
                <ArrowRight className="size-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
