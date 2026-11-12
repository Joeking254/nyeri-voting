"use client";

import { useState } from "react";
import { ImagePlus, Pencil, Plus, SlidersHorizontal, UserRoundX } from "lucide-react";

type CategoryOption = { id: string; name: string; isActive?: boolean };
type Nominee = {
  id: string;
  fullName: string;
  stageName: string | null;
  bio: string | null;
  photoUrl: string | null;
  photoPosition: string;
  socialHandles: Record<string, string>;
  totalVotes: string;
  isActive: boolean;
  category: CategoryOption;
};
type NomineeFields = { fullName: string; stageName: string; categoryId: string; bio: string; photoUrl: string; photoPosition: string; socialHandles: string };
const emptyFields = (categoryId = ""): NomineeFields => ({ fullName: "", stageName: "", categoryId, bio: "", photoUrl: "", photoPosition: "center", socialHandles: "{}" });

export function ManageNominees({ initialNominees, categories, role }: { initialNominees: Nominee[]; categories: CategoryOption[]; role: string }) {
  const [nominees, setNominees] = useState(initialNominees);
  const [fields, setFields] = useState<NomineeFields>(emptyFields(categories[0]?.id));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  function openCreate() {
    setEditingId(null); setFields(emptyFields(categories.find((category) => category.id === nominees.find((nominee) => nominee.isActive)?.category.id)?.id || categories[0]?.id)); setError(""); setModalOpen(true);
  }

  function openEdit(nominee: Nominee) {
    setEditingId(nominee.id);
    setFields({ fullName: nominee.fullName, stageName: nominee.stageName || "", categoryId: nominee.category.id, bio: nominee.bio || "", photoUrl: nominee.photoUrl || "", photoPosition: nominee.photoPosition || "center", socialHandles: JSON.stringify(nominee.socialHandles || {}, null, 2) });
    setError(""); setModalOpen(true);
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setUploading(true); setError("");
    try {
      const formData = new FormData(); formData.set("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Image upload failed.");
      setFields((value) => ({ ...value, photoUrl: result.url! }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Image upload failed."); }
    finally { setUploading(false); }
  }

  async function saveNominee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    let socialHandles: Record<string, string>;
    try {
      const parsed = JSON.parse(fields.socialHandles || "{}") as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.values(parsed).some((value) => typeof value !== "string")) throw new Error("Social links must be a JSON object of text links.");
      socialHandles = parsed as Record<string, string>;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Invalid social links JSON."); setBusy(false); return; }

    const payload = { ...fields, socialHandles };
    try {
      const response = await fetch("/api/admin/nominees", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload) });
      const result = await response.json() as Nominee & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save nominee.");
      if (editingId) setNominees((items) => items.map((item) => item.id === editingId ? result : item));
      else setNominees((items) => [result, ...items]);
      setModalOpen(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save nominee."); }
    finally { setBusy(false); }
  }

  async function toggleActive(nominee: Nominee) {
    setError("");
    const response = await fetch("/api/admin/nominees", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: nominee.id, isActive: !nominee.isActive }) });
    const result = await response.json() as Nominee & { error?: string };
    if (!response.ok) { setError(result.error || "Could not update nominee."); return; }
    setNominees((items) => items.map((item) => item.id === nominee.id ? { ...item, isActive: result.isActive } : item));
  }

  async function removeNominee(nominee: Nominee) {
    if (!window.confirm(`Suspend ${nominee.stageName || nominee.fullName}? Their vote and payment history will be retained.`)) return;
    const response = await fetch(`/api/admin/nominees?id=${encodeURIComponent(nominee.id)}`, { method: "DELETE" });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setError(result.error || "Could not suspend nominee."); return; }
    setNominees((items) => items.map((item) => item.id === nominee.id ? { ...item, isActive: false } : item));
  }

  async function adjustVotes(nominee: Nominee) {
    if (role !== "super_admin") return;
    const rawDelta = window.prompt(`Vote adjustment for ${nominee.stageName || nominee.fullName}. Enter a positive or negative whole number:`);
    if (rawDelta === null) return;
    const delta = Number(rawDelta);
    if (!Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > 100000) { setError("Enter a non-zero whole number from -100000 to 100000."); return; }
    const reason = window.prompt("Required audit reason (minimum 8 characters):");
    if (!reason || reason.trim().length < 8) { setError("Vote adjustment cancelled: provide a reason of at least 8 characters."); return; }
    if (!window.confirm(`Apply ${delta > 0 ? "+" : ""}${delta} votes to ${nominee.stageName || nominee.fullName}? This will be recorded in the audit log.`)) return;
    const response = await fetch("/api/admin/nominees/adjust", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nomineeId: nominee.id, delta, reason: reason.trim() }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setError(result.error || "Vote adjustment failed."); return; }
    setNominees((items) => items.map((item) => item.id === nominee.id ? { ...item, totalVotes: (BigInt(item.totalVotes) + BigInt(delta)).toString() } : item));
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Content setup</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Nominees</h1><p className="mt-1 text-sm text-slate-600">Manage creator profiles, visibility, and reconciled vote totals.</p></div><button type="button" onClick={openCreate} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"><Plus className="size-4" aria-hidden="true" />Add nominee</button></div>
      {error && <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Nominee</th><th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Votes</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">
          {nominees.map((nominee) => <tr key={nominee.id} className="hover:bg-slate-50"><td className="px-4 py-3"><div className="flex items-center gap-3">{nominee.photoUrl ? <img src={nominee.photoUrl} alt="" className="size-10 rounded-lg object-cover object-center" style={{ objectPosition: nominee.photoPosition === "top" ? "center top" : nominee.photoPosition === "bottom" ? "center bottom" : "center 20%" }} /> : <span className="grid size-10 place-items-center rounded-lg bg-slate-100 font-semibold text-slate-500">{nominee.fullName.slice(0, 1)}</span>}<div className="min-w-0"><p className="truncate font-semibold text-slate-900">{nominee.fullName}</p><p className="truncate text-xs text-slate-500">{nominee.stageName || "No stage name"}</p></div></div></td><td className="px-4 py-3 text-slate-600">{nominee.category.name}</td><td className="px-4 py-3 text-right tabular-nums text-slate-800">{BigInt(nominee.totalVotes).toLocaleString()}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${nominee.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{nominee.isActive ? "Active" : "Suspended"}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><button type="button" onClick={() => openEdit(nominee)} title="Edit nominee" aria-label={`Edit ${nominee.fullName}`} className="grid size-8 place-items-center rounded-md text-slate-600 hover:bg-slate-100"><Pencil className="size-4" /></button><button type="button" onClick={() => void toggleActive(nominee)} title={nominee.isActive ? "Suspend nominee" : "Reactivate nominee"} className="rounded-md px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">{nominee.isActive ? "Suspend" : "Activate"}</button><button type="button" onClick={() => void removeNominee(nominee)} title="Suspend and retain history" aria-label={`Suspend ${nominee.fullName}`} className="grid size-8 place-items-center rounded-md text-rose-700 hover:bg-rose-50"><UserRoundX className="size-4" /></button>{role === "super_admin" && <button type="button" onClick={() => void adjustVotes(nominee)} title="Adjust votes" aria-label={`Adjust votes for ${nominee.fullName}`} className="grid size-8 place-items-center rounded-md text-sky-700 hover:bg-sky-50"><SlidersHorizontal className="size-4" /></button>}</div></td></tr>)}
          {!nominees.length && <tr><td className="px-4 py-12 text-center text-slate-500" colSpan={5}>No nominees yet. Add a nominee to get started.</td></tr>}
        </tbody></table></div>
      </div>
      {role !== "super_admin" && <p className="mt-3 text-xs text-slate-500">Vote adjustments are available to super admins only.</p>}

      {modalOpen && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="nominee-dialog-title" className="my-auto max-h-[calc(100dvh-24px)] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-wide text-sky-700">Creator profile</p><h2 id="nominee-dialog-title" className="mt-0.5 text-lg font-bold text-slate-900">{editingId ? "Edit nominee" : "Add nominee"}</h2></div><button type="button" onClick={() => setModalOpen(false)} className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">Close</button></header>
          <form className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={saveNominee}>
            <label className="text-sm font-medium text-slate-700">Full name<input className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3" maxLength={120} required value={fields.fullName} onChange={(event) => setFields({ ...fields, fullName: event.target.value })} /></label>
            <label className="text-sm font-medium text-slate-700">Stage name / handle<input className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3" maxLength={120} value={fields.stageName} onChange={(event) => setFields({ ...fields, stageName: event.target.value })} /></label>
            <label className="text-sm font-medium text-slate-700">Category<select className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3" required value={fields.categoryId} onChange={(event) => setFields({ ...fields, categoryId: event.target.value })}>{categories.filter((category) => category.isActive !== false || category.id === fields.categoryId).map((category) => <option key={category.id} value={category.id}>{category.name}{category.isActive === false ? " (archived)" : ""}</option>)}</select></label>
            <div className="text-sm font-medium text-slate-700">Portrait image<div className="mt-1.5 flex flex-wrap items-center gap-3"><label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"><ImagePlus className="size-4" />{uploading ? "Uploading..." : "Upload image"}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => void uploadImage(event.target.files?.[0])} /></label>{fields.photoUrl && <img src={fields.photoUrl} alt="Portrait preview" className="size-10 rounded-md object-cover object-center" style={{ objectPosition: fields.photoPosition === "top" ? "center top" : fields.photoPosition === "bottom" ? "center bottom" : "center 20%" }} />}</div><input aria-label="Portrait image URL" className="mt-2 h-9 w-full rounded-lg border border-slate-300 px-3 text-xs" placeholder="Or paste image URL" value={fields.photoUrl} onChange={(event) => setFields({ ...fields, photoUrl: event.target.value })} /></div>
            <label className="text-sm font-medium text-slate-700" htmlFor="photo-position">Image framing<select id="photo-position" className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3" value={fields.photoPosition} onChange={(event) => setFields({ ...fields, photoPosition: event.target.value })}><option value="fit">Auto Fit (Smart Ambient)</option><option value="top">Top / Face Focus</option><option value="center">Center</option><option value="bottom">Bottom</option></select></label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">Short bio<textarea className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2" rows={3} maxLength={1500} value={fields.bio} onChange={(event) => setFields({ ...fields, bio: event.target.value })} /></label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">Social links <span className="font-normal text-slate-500">(JSON object, e.g. {`{"instagram":"https://instagram.com/creator"}`})</span><textarea className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs" rows={3} value={fields.socialHandles} onChange={(event) => setFields({ ...fields, socialHandles: event.target.value })} /></label>
            {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 sm:col-span-2" role="alert">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 sm:col-span-2"><button type="button" className="min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setModalOpen(false)}>Cancel</button><button disabled={busy || uploading} className="min-h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{busy ? "Saving..." : editingId ? "Save changes" : "Add nominee"}</button></div>
          </form>
        </section>
      </div>}
    </div>
  );
}