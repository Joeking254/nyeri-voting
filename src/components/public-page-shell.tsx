import type { ReactNode } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { ShieldCheck, Trophy } from "lucide-react";

export function PublicPageShell({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <Header />

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-400">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-extrabold text-slate-950 dark:text-white sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
            {description}
          </p>
        )}
        <div className="mt-8">{children}</div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 border-b border-slate-200/80 pb-8 sm:flex-row dark:border-slate-800">
            <div className="flex items-center gap-2 font-bold text-slate-950 dark:text-white">
              <img
                src="/images/logo.jpg"
                alt=""
                className="size-6 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-amber-500/40"
              />
              <span>Nyeri Content Creators Awards 2026</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-4" />
              <span>Verified M-Pesa & PayHero Payments</span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-600 sm:justify-start dark:text-slate-400">
            <Link href="/" className="hover:text-sky-700 dark:hover:text-white">Home</Link>
            <Link href="/about" className="hover:text-sky-700 dark:hover:text-white">About</Link>
            <Link href="/categories" className="hover:text-sky-700 dark:hover:text-white">Categories</Link>
            <Link href="/how-to-vote" className="hover:text-sky-700 dark:hover:text-white">How to Vote</Link>
            <Link href="/leaderboard" className="hover:text-sky-700 dark:hover:text-white">Leaderboard</Link>
            <Link href="/results" className="hover:text-sky-700 dark:hover:text-white">Winners</Link>
            <Link href="/sponsors" className="hover:text-sky-700 dark:hover:text-white">Sponsors</Link>
            <Link href="/news" className="hover:text-sky-700 dark:hover:text-white">News</Link>
            <Link href="/contact" className="hover:text-sky-700 dark:hover:text-white">Contact</Link>
            <Link href="/privacy" className="hover:text-sky-700 dark:hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-sky-700 dark:hover:text-white">Terms</Link>
            <Link href="/voting-rules" className="hover:text-sky-700 dark:hover:text-white">Voting Rules</Link>
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-400 sm:text-left">
            © 2026 Nyeri Content Creators of the Year Awards. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
