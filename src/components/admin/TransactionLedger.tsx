"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Hourglass,
  RefreshCw,
  Search,
  Smartphone,
  Vote,
} from "lucide-react";

type LedgerRow = {
  id: string;
  createdAt: string;
  phoneNumber: string;
  numberOfVotes: number;
  amountPaid: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
  mpesaReceiptNumber: string | null;
  method?: "M-PESA" | "CARD";
  nominee: { fullName: string; stageName: string | null };
  category: { name: string };
};

type LedgerSummary = {
  totalRevenue: number;
  mpesaRevenue: number;
  cardRevenue: number;
  totalVotes: number;
  successfulCount: number;
  pendingCount: number;
  failedCount: number;
};

const statusClass = {
  SUCCESS: "bg-emerald-50 text-emerald-800 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  FAILED: "bg-rose-50 text-rose-800 border-rose-200",
};

export function TransactionLedger() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [summary, setSummary] = useState<LedgerSummary>({
    totalRevenue: 0,
    mpesaRevenue: 0,
    cardRevenue: 0,
    totalVotes: 0,
    successfulCount: 0,
    pendingCount: 0,
    failedCount: 0,
  });
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(
    async (isManual = false) => {
      if (isManual) setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page) });
        if (query.trim()) params.set("q", query.trim());
        if (method) params.set("method", method);
        if (status) params.set("status", status);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const response = await fetch(`/api/admin/transactions?${params}`, { cache: "no-store" });
        const result = (await response.json()) as {
          transactions?: LedgerRow[];
          total?: number;
          summary?: LedgerSummary;
          error?: string;
        };
        if (!response.ok) throw new Error(result.error || "Unable to load payment transactions.");
        setRows(result.transactions || []);
        setTotal(result.total || 0);
        if (result.summary) setSummary(result.summary);
        setLastUpdated(new Date());
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Unable to load payment transactions.");
      } finally {
        if (isManual) setLoading(false);
      }
    },
    [page, query, method, status, from, to]
  );

  // Initial load
  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  // Real-time live auto-sync polling every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(() => {
      void refresh(false);
    }, 5_000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, refresh]);

  async function exportCsv() {
    const params = new URLSearchParams({ export: "csv" });
    if (query.trim()) params.set("q", query.trim());
    if (method) params.set("method", method);
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const response = await fetch(`/api/admin/transactions?${params}`);
    if (!response.ok) {
      setError("Could not export the filtered ledger.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nyeri-vote-ledger.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function syncPaystack() {
    setSyncing(true);
    setSyncMessage("");
    try {
      const res = await fetch("/api/admin/paystack/sync", { method: "POST" });
      const data = (await res.json()) as {
        success?: boolean;
        creditedCount?: number;
        totalChecked?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setSyncMessage(
        `Paystack sync complete: ${data.creditedCount ?? 0} transaction(s) credited out of ${
          data.totalChecked ?? 0
        } checked.`
      );
      await refresh(true);
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <div>
      {/* Header with live sync pulse */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {autoRefresh ? (
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500"></span>
              </span>
            ) : (
              <span className="size-2.5 rounded-full bg-slate-300"></span>
            )}
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              {autoRefresh ? "Live Auto-Sync Active (5s)" : "Auto-Sync Paused"}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Payment Ledger & Revenue</h1>
          <p className="mt-1 text-sm text-slate-600">
            {total.toLocaleString()} transactions recorded.
            {lastUpdated && (
              <span className="ml-2 text-xs text-slate-400">
                Last synced at {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold shadow-sm transition-colors ${
              autoRefresh
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Clock className="size-3.5" />
            <span>Auto-refresh: {autoRefresh ? "ON (5s)" : "PAUSED"}</span>
          </button>
          <button
            type="button"
            onClick={() => void syncPaystack()}
            disabled={syncing}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-sky-600 bg-sky-50 px-3 text-sm font-semibold text-sky-800 hover:bg-sky-100 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} aria-hidden="true" />
            <span>{syncing ? "Syncing..." : "Sync Card Votes"}</span>
          </button>
          <button
            type="button"
            onClick={() => void exportCsv()}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700"
          >
            <Download className="size-4" aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Live Revenue & Transaction Summary Cards */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
            <DollarSign className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-xl font-extrabold text-emerald-950 sm:text-2xl">
            KES {summary.totalRevenue.toLocaleString()}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-2 text-[11px] font-medium text-emerald-800">
            <span>M-Pesa: KES {summary.mpesaRevenue.toLocaleString()}</span>
            <span>•</span>
            <span>Card: KES {summary.cardRevenue.toLocaleString()}</span>
          </p>
        </div>

        <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
          <div className="flex items-center justify-between text-sky-700">
            <span className="text-xs font-bold uppercase tracking-wider">Total Votes</span>
            <Vote className="size-4 text-sky-600" />
          </div>
          <p className="mt-2 text-xl font-extrabold text-sky-950 sm:text-2xl">
            {summary.totalVotes.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[11px] text-sky-700">From paid transactions</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold uppercase tracking-wider">Successful</span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-xl font-extrabold text-slate-900 sm:text-2xl">
            {summary.successfulCount.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Confirmed in MySQL</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider">Pending PIN</span>
            <Hourglass className="size-4 text-amber-600" />
          </div>
          <p className="mt-2 text-xl font-extrabold text-amber-950 sm:text-2xl">
            {summary.pendingCount.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[11px] text-amber-700">Awaiting user confirmation</p>
        </div>
      </section>

      {syncMessage && (
        <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
          {syncMessage}
        </p>
      )}

      {/* Filter Bar with Method Selector */}
      <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_140px_130px_150px_150px]">
        <label className="relative">
          <span className="sr-only">Search ledger</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
            placeholder="Phone, email, receipt, nominee..."
            value={query}
            onChange={(event) => {
              setPage(0);
              setQuery(event.target.value);
            }}
          />
        </label>
        <label className="sr-only" htmlFor="ledger-method">
          Payment Method
        </label>
        <select
          id="ledger-method"
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700"
          value={method}
          onChange={(event) => {
            setPage(0);
            setMethod(event.target.value);
          }}
        >
          <option value="">All Methods</option>
          <option value="MPESA">M-Pesa (Kenya)</option>
          <option value="CARD">Card (Visa/Mastercard)</option>
        </select>
        <label className="sr-only" htmlFor="ledger-status">
          Status
        </label>
        <select
          id="ledger-status"
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
          value={status}
          onChange={(event) => {
            setPage(0);
            setStatus(event.target.value);
          }}
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
        </select>
        <label className="sr-only" htmlFor="ledger-from">
          From date
        </label>
        <input
          id="ledger-from"
          aria-label="From date"
          className="h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-700"
          type="date"
          value={from}
          onChange={(event) => {
            setPage(0);
            setFrom(event.target.value);
          }}
        />
        <label className="sr-only" htmlFor="ledger-to">
          To date
        </label>
        <input
          id="ledger-to"
          aria-label="To date"
          className="h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-700"
          type="date"
          value={to}
          onChange={(event) => {
            setPage(0);
            setTo(event.target.value);
          }}
        />
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      )}

      {/* Table with Method Column */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date / Time</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Payer (Phone / Email)</th>
                <th className="px-4 py-3">Nominee</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Votes</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Receipt / Ref</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const isCard = row.method === "CARD" || (row.mpesaReceiptNumber || "").startsWith("PSTK-") || row.phoneNumber.includes("@");
                return (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {isCard ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-800">
                          <CreditCard className="size-3 text-sky-600" />
                          CARD
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                          <Smartphone className="size-3 text-emerald-600" />
                          M-PESA
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">
                      {row.phoneNumber}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 font-medium text-slate-900">
                      {row.nominee.stageName || row.nominee.fullName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.category.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      +{row.numberOfVotes.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">
                      KES {row.amountPaid.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {row.mpesaReceiptNumber || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClass[row.status]}`}>
                        {row.status.toLowerCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td className="px-4 py-12 text-center text-slate-500" colSpan={9}>
                    {loading ? "Loading transactions..." : "No transactions match these filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <span className="text-xs text-slate-500">
            Page {page + 1} of {pages} ({total.toLocaleString()} total)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0 || loading}
              onClick={() => setPage((value) => value - 1)}
              className="grid size-8 place-items-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              disabled={page + 1 >= pages || loading}
              onClick={() => setPage((value) => value + 1)}
              className="grid size-8 place-items-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
