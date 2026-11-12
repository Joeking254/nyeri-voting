"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";

type LedgerRow = { id: string; createdAt: string; phoneNumber: string; numberOfVotes: number; amountPaid: number; status: "PENDING" | "SUCCESS" | "FAILED"; mpesaReceiptNumber: string | null; nominee: { fullName: string; stageName: string | null }; category: { name: string } };
const statusClass = { SUCCESS: "bg-emerald-50 text-emerald-800", PENDING: "bg-amber-50 text-amber-800", FAILED: "bg-rose-50 text-rose-800" };

export function TransactionLedger() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (query.trim()) params.set("q", query.trim());
      if (status) params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const response = await fetch(`/api/admin/transactions?${params}`, { cache: "no-store" });
      const result = await response.json() as { transactions?: LedgerRow[]; total?: number; error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to load payment transactions.");
      setRows(result.transactions || []); setTotal(result.total || 0);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load payment transactions."); }
    finally { setLoading(false); }
  }, [page, query, status, from, to]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function exportCsv() {
    const params = new URLSearchParams({ export: "csv" });
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const response = await fetch(`/api/admin/transactions?${params}`);
    if (!response.ok) { setError("Could not export the filtered ledger."); return; }
    const blob = await response.blob(); const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "nyeri-vote-ledger.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  const pages = Math.max(1, Math.ceil(total / 50));
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Finance & audit</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Payment ledger</h1><p className="mt-1 text-sm text-slate-600">{total.toLocaleString()} matching transactions</p></div><button type="button" onClick={() => void exportCsv()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"><Download className="size-4" aria-hidden="true" />Export CSV</button></div>
      <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-[minmax(200px,1fr)_150px_160px_160px]">
        <label className="relative"><span className="sr-only">Search ledger</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" placeholder="Phone, receipt, nominee..." value={query} onChange={(event) => { setPage(0); setQuery(event.target.value); }} /></label>
        <label className="sr-only" htmlFor="ledger-status">Status</label><select id="ledger-status" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700" value={status} onChange={(event) => { setPage(0); setStatus(event.target.value); }}><option value="">All statuses</option><option value="SUCCESS">Success</option><option value="PENDING">Pending</option><option value="FAILED">Failed</option></select>
        <label className="sr-only" htmlFor="ledger-from">From date</label><input id="ledger-from" aria-label="From date" className="h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-700" type="date" value={from} onChange={(event) => { setPage(0); setFrom(event.target.value); }} />
        <label className="sr-only" htmlFor="ledger-to">To date</label><input id="ledger-to" aria-label="To date" className="h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-700" type="date" value={to} onChange={(event) => { setPage(0); setTo(event.target.value); }} />
      </div>
      {error && <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date / time</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Nominee</th><th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Votes</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Receipt</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => <tr key={row.id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-4 py-3 text-slate-600">{new Date(row.createdAt).toLocaleString()}</td><td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">{row.phoneNumber}</td><td className="max-w-[200px] truncate px-4 py-3 font-medium text-slate-900">{row.nominee.stageName || row.nominee.fullName}</td><td className="px-4 py-3 text-slate-600">{row.category.name}</td><td className="px-4 py-3 text-right tabular-nums text-slate-700">{row.numberOfVotes}</td><td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">KES {row.amountPaid.toLocaleString()}</td><td className="px-4 py-3 font-mono text-xs text-slate-600">{row.mpesaReceiptNumber || "—"}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass[row.status]}`}>{row.status.toLowerCase()}</span></td></tr>)}
              {!rows.length && <tr><td className="px-4 py-12 text-center text-slate-500" colSpan={8}>{loading ? "Loading transactions..." : "No transactions match these filters."}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3"><span className="text-xs text-slate-500">Page {page + 1} of {pages}</span><div className="flex gap-2"><button type="button" disabled={page === 0 || loading} onClick={() => setPage((value) => value - 1)} className="grid size-8 place-items-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="size-4" /></button><button type="button" disabled={page + 1 >= pages || loading} onClick={() => setPage((value) => value + 1)} className="grid size-8 place-items-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40" aria-label="Next page"><ChevronRight className="size-4" /></button></div></div>
      </div>
    </div>
  );
}
