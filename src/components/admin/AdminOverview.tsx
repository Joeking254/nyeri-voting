"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, CircleDollarSign, Clock, CreditCard, FolderKanban, Pause, Play, RefreshCw, Smartphone, Users } from "lucide-react";
import { EventSettingsPanel } from "@/components/admin/EventSettingsPanel";

type RecentPayment = {
  id: string;
  amount: number;
  votes: number;
  receipt: string;
  nomineeName: string;
  categoryName: string;
  createdAt: string;
  isCard: boolean;
  phone: string;
};

type OverviewData = {
  metrics: { revenue: number; todayRevenue: number; votes: number; activeNominees: number; activeCategories: number };
  votingOpen: boolean;
  recentPayments?: RecentPayment[];
  categories: Array<{ id: string; name: string; votingOpen: boolean; nominees: Array<{ id: string; fullName: string; stageName: string | null; totalVotes: string }> }>;
  lastSyncedAt?: string;
};

const initialData: OverviewData = {
  metrics: { revenue: 0, todayRevenue: 0, votes: 0, activeNominees: 0, activeCategories: 0 },
  votingOpen: true,
  recentPayments: [],
  categories: [],
};

const metrics = [
  { key: "revenue", title: "Total Revenue", icon: CircleDollarSign, format: (value: number) => `KES ${value.toLocaleString()}` },
  { key: "votes", title: "Total Votes Cast", icon: Activity, format: (value: number) => value.toLocaleString() },
  { key: "activeNominees", title: "Active Nominees", icon: Users, format: (value: number) => value.toLocaleString() },
  { key: "activeCategories", title: "Active Categories", icon: FolderKanban, format: (value: number) => value.toLocaleString() },
] as const;

export function AdminOverview({ role }: { role: string }) {
  const [data, setData] = useState<OverviewData>(initialData);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const previousRevenueRef = useRef<number>(0);
  const [revenueFlashed, setRevenueFlashed] = useState(false);

  async function refresh(isManual = false) {
    if (isManual) setIsSyncing(true);
    try {
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to refresh dashboard data.");
      const nextData = (await response.json()) as OverviewData;

      if (previousRevenueRef.current > 0 && nextData.metrics.revenue > previousRevenueRef.current) {
        setRevenueFlashed(true);
        setTimeout(() => setRevenueFlashed(false), 2500);
      }
      previousRevenueRef.current = nextData.metrics.revenue;

      setData(nextData);
      setLastUpdated(new Date());
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to refresh dashboard data.");
    } finally {
      if (isManual) setIsSyncing(false);
    }
  }

  // Real-time live auto-refresh every 4 seconds
  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 4_000);
    return () => window.clearInterval(interval);
  }, []);

  async function setGlobalVoting(votingOpen: boolean) {
    setBusy("global");
    setError("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ votingOpen }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update voting state.");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update voting state.");
    } finally {
      setBusy("");
    }
  }

  async function setCategoryVoting(categoryId: string, votingOpen: boolean) {
    setBusy(categoryId);
    setError("");
    try {
      const response = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: categoryId, votingOpen }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update category voting.");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update category voting.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">Real-Time Sync Active (4s)</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-slate-600">
            Live voting metrics, revenue auto-updates, and event controls.
            {lastUpdated && <span className="ml-2 text-xs text-slate-400">Updated {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void refresh(true)}
            disabled={isSyncing}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${isSyncing ? "animate-spin" : ""}`} aria-hidden="true" />
            <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
          </button>
          <button
            type="button"
            disabled={role !== "super_admin" || busy === "global"}
            onClick={() => void setGlobalVoting(!data.votingOpen)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-50 ${
              data.votingOpen ? "bg-emerald-700 hover:bg-emerald-800" : "bg-rose-700 hover:bg-rose-800"
            }`}
          >
            {data.votingOpen ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
            {data.votingOpen ? "Voting is open" : "Voting is closed"}
          </button>
        </div>
      </div>
      {role !== "super_admin" && <p className="mt-3 text-xs text-slate-500">Only a super admin can change voting availability.</p>}
      {error && <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}

      {/* Primary Metrics Grid */}
      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Event metrics">
        {metrics.map(({ key, title, icon: Icon, format }) => {
          const isRev = key === "revenue";
          return (
            <article
              key={key}
              className={`relative overflow-hidden rounded-xl border bg-white p-4 transition-all duration-500 sm:p-5 ${
                isRev && revenueFlashed
                  ? "border-emerald-400 bg-emerald-50/50 shadow-md ring-2 ring-emerald-300"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">{title}</span>
                <Icon className={`size-[18px] ${isRev ? "text-emerald-600" : "text-slate-400"}`} aria-hidden="true" />
              </div>
              <p className={`mt-4 text-2xl font-bold tracking-tight tabular-nums ${isRev ? "text-emerald-900" : "text-slate-950"}`}>
                {format(data.metrics[key])}
              </p>
              {isRev && (
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>M-Pesa & Card verified</span>
                  {data.metrics.todayRevenue > 0 && (
                    <span className="font-semibold text-emerald-700">+KES {data.metrics.todayRevenue.toLocaleString()} today</span>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>

      {/* Real-time Payment Activity Feed */}
      {data.recentPayments && data.recentPayments.length > 0 && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-sky-600" />
              <h2 className="text-sm font-bold tracking-wide text-slate-900">Live Confirmed Payments Feed</h2>
            </div>
            <span className="text-xs text-slate-400">Auto-updating in real time</span>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {data.recentPayments.map((payment) => (
              <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      payment.isCard
                        ? "bg-sky-100 text-sky-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {payment.isCard ? <CreditCard className="size-3" /> : <Smartphone className="size-3" />}
                    {payment.isCard ? "CARD" : "M-PESA"}
                  </span>
                  <span className="font-medium text-slate-900">{payment.nomineeName}</span>
                  <span className="hidden text-slate-400 sm:inline">({payment.categoryName})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-500">{payment.receipt}</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-800">+{payment.votes} votes</span>
                  <span className="font-bold text-emerald-700">KES {payment.amount.toLocaleString()}</span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(payment.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <EventSettingsPanel role={role} />

      <section className="mt-7" aria-labelledby="leaderboard-heading">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Current standings</p>
            <h2 id="leaderboard-heading" className="mt-1 text-lg font-bold text-slate-900">Top nominees by category</h2>
          </div>
          <span className="text-xs text-slate-500">Refreshes every 4 seconds</span>
        </div>
        {data.categories.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {data.categories.map((category) => (
              <article key={category.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                  <h3 className="font-semibold text-slate-900">{category.name}</h3>
                  <button
                    type="button"
                    disabled={role !== "super_admin" || busy === category.id}
                    onClick={() => void setCategoryVoting(category.id, !category.votingOpen)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
                      category.votingOpen ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {category.votingOpen ? "Voting open" : "Voting paused"}
                  </button>
                </header>
                {category.nominees.length ? (
                  <ol className="divide-y divide-slate-100">
                    {category.nominees.map((nominee, index) => (
                      <li key={nominee.id} className="flex items-center gap-3 px-4 py-3">
                        <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                          index === 0 ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-600"
                        }`}>
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                          {nominee.stageName || nominee.fullName}
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-slate-700">
                          {BigInt(nominee.totalVotes).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="px-4 py-6 text-sm text-slate-500">No active nominees.</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Leaderboard data will appear when categories and nominees are added.
          </div>
        )}
      </section>
    </div>
  );
}
