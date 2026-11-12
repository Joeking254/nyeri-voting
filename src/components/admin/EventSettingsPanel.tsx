"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";

type EventSettings = {
  votingOpen: boolean;
  votePrice: number;
  unlimitedVotes: boolean;
  votingStartsAt: string | null;
  votingEndsAt: string | null;
  publicVoteCounts: boolean;
  publicLeaderboard: boolean;
  leaderboardAfterClose: boolean;
};

const defaults: EventSettings = {
  votingOpen: true,
  votePrice: 10,
  unlimitedVotes: true,
  votingStartsAt: null,
  votingEndsAt: null,
  publicVoteCounts: true,
  publicLeaderboard: true,
  leaderboardAfterClose: false,
};

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function EventSettingsPanel({ role }: { role: string }) {
  const [settings, setSettings] = useState(defaults);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const canEdit = role === "super_admin";

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/settings", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load voting settings.");
        return await response.json() as EventSettings;
      })
      .then((value) => {
        if (cancelled) return;
        setSettings(value);
        setStartsAt(localDateTime(value.votingStartsAt));
        setEndsAt(localDateTime(value.votingEndsAt));
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load voting settings.");
      });
    return () => { cancelled = true; };
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          votePrice: settings.votePrice,
          unlimitedVotes: settings.unlimitedVotes,
          votingStartsAt: startsAt ? new Date(startsAt).toISOString() : null,
          votingEndsAt: endsAt ? new Date(endsAt).toISOString() : null,
          publicVoteCounts: settings.publicVoteCounts,
          publicLeaderboard: settings.publicLeaderboard,
          leaderboardAfterClose: settings.leaderboardAfterClose,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save event settings.");
      setMessage("Settings saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save event settings.");
    } finally { setSaving(false); }
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5" aria-labelledby="event-settings-title">
      <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Event configuration</p><h2 id="event-settings-title" className="mt-1 text-lg font-bold text-slate-900">Voting rules & visibility</h2><p className="mt-1 text-sm text-slate-600">Controls are enforced by the payment API, not only the interface.</p></div>
      {!canEdit && <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Only super admins can edit event-wide settings.</p>}
      <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={save}>
        <label className="text-sm font-medium text-slate-700">Price per vote (KES)
          <input className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-slate-900" type="number" min="1" max="100000" step="1" required disabled={!canEdit} value={settings.votePrice} onChange={(event) => setSettings({ ...settings, votePrice: Number(event.target.value) })} />
        </label>
        <label className="text-sm font-medium text-slate-700">Voting starts
          <input className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-slate-900" type="datetime-local" disabled={!canEdit} value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
        </label>
        <label className="text-sm font-medium text-slate-700">Voting ends
          <input className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-slate-900" type="datetime-local" disabled={!canEdit} value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
        </label>
        <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700"><input type="checkbox" disabled={!canEdit} checked={settings.unlimitedVotes} onChange={(event) => setSettings({ ...settings, unlimitedVotes: event.target.checked })} className="size-4 accent-sky-700" />Unlimited votes per payer</label>
        <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700"><input type="checkbox" disabled={!canEdit} checked={settings.publicVoteCounts} onChange={(event) => setSettings({ ...settings, publicVoteCounts: event.target.checked })} className="size-4 accent-sky-700" />Show public vote counts</label>
        <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700"><input type="checkbox" disabled={!canEdit} checked={settings.publicLeaderboard} onChange={(event) => setSettings({ ...settings, publicLeaderboard: event.target.checked })} className="size-4 accent-sky-700" />Public leaderboard enabled</label>
        <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 md:col-span-2 xl:col-span-3"><input type="checkbox" disabled={!canEdit} checked={settings.leaderboardAfterClose} onChange={(event) => setSettings({ ...settings, leaderboardAfterClose: event.target.checked })} className="size-4 accent-sky-700" />Hide leaderboard until voting closes</label>
        {canEdit && <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-3"><button disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"><Save className="size-4" aria-hidden="true" />{saving ? "Saving..." : "Save settings"}</button>{message && <span className="text-sm text-emerald-700" role="status">{message}</span>}{error && <span className="text-sm text-rose-700" role="alert">{error}</span>}</div>}
      </form>
    </section>
  );
}
