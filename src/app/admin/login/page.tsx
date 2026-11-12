"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "Unable to sign in. Check server and database status.");
      const next = new URLSearchParams(window.location.search).get("next");
      const destination = next?.startsWith("/admin") && !next.startsWith("/admin/login") ? next : "/admin";
      window.location.href = destination;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <a href="/" className="text-sm font-semibold text-slate-500 hover:text-slate-900">← Public site</a>
        <span className="mt-8 grid size-11 place-items-center rounded-lg bg-slate-900 text-white"><LockKeyhole className="size-5" aria-hidden="true" /></span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-sky-700">Nyeri Creators Awards</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Admin sign in</h1>
        <p className="mt-1 text-sm text-slate-600">Use your administrator account to continue.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium text-slate-800" htmlFor="admin-email">Email
            <input id="admin-email" className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" type="email" autoComplete="username" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block text-sm font-medium text-slate-800" htmlFor="admin-password">Password
            <input id="admin-password" className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" type="password" autoComplete="current-password" maxLength={200} required value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
          <button className="min-h-11 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:opacity-60" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
