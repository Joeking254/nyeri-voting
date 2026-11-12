"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, Flame, Menu, Search, Trophy, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

type HeaderProps = {
  searchTerm?: string;
  onSearch?: (value: string) => void;
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/categories", label: "Categories" },
  { href: "/leaderboard", label: "Leaderboard", badge: "Live" },
  { href: "/results", label: "Winners" },
  { href: "/how-to-vote", label: "How to Vote" },
  { href: "/news", label: "News" },
];

export function Header({ searchTerm = "", onSearch }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Brand logo */}
        <Link
          href="/"
          className="flex items-center gap-3 transition-opacity hover:opacity-90"
          aria-label="Nyeri Content Creators Awards home"
        >
          <img
            src="/images/logo.jpg"
            alt="Nyeri Creators Awards 2026 Emblem"
            className="size-11 shrink-0 rounded-full object-cover shadow-md ring-2 ring-amber-500/40"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-lg">
                Nyeri Creators
              </span>
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:bg-amber-950/80 dark:text-amber-300">
                2026
              </span>
            </div>
            <p className="text-[11px] font-medium tracking-wide text-slate-500 dark:text-slate-400">
              People&apos;s Choice Awards
            </p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 xl:gap-2 md:flex" aria-label="Main navigation">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-slate-100 text-sky-800 dark:bg-slate-800 dark:text-sky-300"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
              >
                {link.label}
                {link.badge && (
                  <span className="flex items-center gap-0.5 rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                    <span className="size-1.5 animate-pulse rounded-full bg-rose-600" />
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Search & Actions */}
        <div className="flex items-center gap-2.5">
          {onSearch && (
            <div className="relative hidden w-48 sm:block sm:w-60 lg:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                className="h-9 w-full rounded-full border border-slate-200 bg-slate-50/80 pl-9 pr-8 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-sky-400 dark:focus:bg-slate-900"
                type="search"
                placeholder="Search creators..."
                value={searchTerm}
                onChange={(e) => onSearch(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => onSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          )}

          <ThemeToggle />

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 md:hidden dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden dark:border-slate-800 dark:bg-slate-900">
          {onSearch && (
            <div className="relative mb-3 sm:hidden">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                type="search"
                placeholder="Search creators or categories..."
                value={searchTerm}
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
          )}

          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-slate-100 text-sky-800 dark:bg-slate-800 dark:text-sky-300"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
