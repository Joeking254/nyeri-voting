"use client";

import { useEffect, useState } from "react";
import { Activity, CircleDollarSign, FolderKanban, Pause, Play, Users } from "lucide-react";
import { EventSettingsPanel } from "@/components/admin/EventSettingsPanel";

type OverviewData = {
  metrics: { revenue: number; votes: number; activeNominees: number; activeCategories: number };
  votingOpen: boolean;
  categories: Array<{ id: string; name: string; votingOpen: boolean; nominees: Array<{ id: string; fullName: string; stageName: string | null; totalVotes: string }> }>;
};

const initialData: OverviewData = { metrics: { revenue: 0, votes: 0, activeNominees: 0, activeCategories: 0 }, votingOpen: true, categories: [] };
const metrics = [
  { key: "revenue", title: "Total revenue", icon: CircleDollarSign, format: (value: number) => `KES ${value.toLocaleString()}` },
  { key: "votes", title: "Votes cast", icon: Activity, format: (value: number) => value.toLocaleString() },
  { key: "activeNominees", title: "Active nominees", icon: Users, format: (value: number) => value.toLocaleString() },
  { key: "activeCategories", title: "Active categories", icon: FolderKanban, format: (value: number) => value.toLocaleString() },
] as const;

export function AdminOverview({ role }: { role: string }) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function refresh() {
    try {
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to refresh dashboard data.");
      setData(await response.json() as OverviewData);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to refresh dashboard data.");
    }
  }

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  async function setGlobalVoting(votingOpen: boolean) {
    setBusy("global");
    setError("");
    try {
      const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ votingOpen }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update voting state.");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update voting state.");
    } finally { setBusy(""); }
  }

  async function setCategoryVoting(categoryId: string, votingOpen: boolean) {
    setBusy(categoryId);
    setError("");
    try {
      const response = await fetch("/api/admin/categories", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: categoryId, votingOpen }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update category voting.");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update category voting.");
    } finally { setBusy(""); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Live overview</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Dashboard</h1><p className="mt-1 text-sm text-slate-600">Voting activity and event controls.</p></div>
        <button type="button" disabled={role !== "super_admin" || busy === "global"} onClick={() => void setGlobalVoting(!data.votingOpen)} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-50 ${data.votingOpen ? "bg-emerald-700 hover:bg-emerald-800" : "bg-rose-700 hover:bg-rose-800"}`}>
          {data.votingOpen ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
          {data.votingOpen ? "Voting is open" : "Voting is closed"}
        </button>
      </div>
      {role !== "super_admin" && <p className="mt-3 text-xs text-slate-500">Only a super admin can change voting availability.</p>}
      {error && <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}

      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Event metrics">
        {metrics.map(({ key, title, icon: Icon, format }) => (
          <article key={key} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-600">{title}</span><Icon className="size-[18px] text-slate-400" aria-hidden="true" /></div>
            <p className="mt-4 text-2xl font-bold tracking-tight tabular-nums text-slate-950">{format(data.metrics[key])}</p>
            {key === "revenue" && <p className="mt-1 text-xs text-slate-500">Successful M-Pesa payments</p>}
          </article>
        ))}
      </section>

      <EventSettingsPanel role={role} />

      <section className="mt-7" aria-labelledby="leaderboard-heading">
        <div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Current standings</p><h2 id="leaderboard-heading" className="mt-1 text-lg font-bold text-slate-900">Top nominees by category</h2></div><span className="text-xs text-slate-500">Refreshes every 15 seconds</span></div>
        {data.categories.length ? <div className="grid gap-4 xl:grid-cols-2">
          {data.categories.map((category) => (
            <article key={category.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3"><h3 className="font-semibold text-slate-900">{category.name}</h3><button type="button" disabled={role !== "super_admin" || busy === category.id} onClick={() => void setCategoryVoting(category.id, !category.votingOpen)} className={`rounded-md px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${category.votingOpen ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{category.votingOpen ? "Voting open" : "Voting paused"}</button></header>
              {category.nominees.length ? <ol className="divide-y divide-slate-100">
                {category.nominees.map((nominee, index) => <li key={nominee.id} className="flex items-center gap-3 px-4 py-3"><span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${index === 0 ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-600"}`}>{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{nominee.stageName || nominee.fullName}</span><span className="text-sm font-semibold tabular-nums text-slate-700">{BigInt(nominee.totalVotes).toLocaleString()}</span></li>)}
              </ol> : <p className="px-4 py-6 text-sm text-slate-500">No active nominees.</p>}
            </article>
          ))}
        </div> : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Leaderboard data will appear when categories and nominees are added.</div>}
      </section>
    </div>
  );
}
