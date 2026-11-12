"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ImagePlus,
  Minus,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";

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

type NomineeFields = {
  fullName: string;
  stageName: string;
  categoryId: string;
  bio: string;
  photoUrl: string;
  photoPosition: string;
  socialHandles: string;
};

const emptyFields = (categoryId = ""): NomineeFields => ({
  fullName: "",
  stageName: "",
  categoryId,
  bio: "",
  photoUrl: "",
  photoPosition: "center",
  socialHandles: "{}",
});

export function ManageNominees({
  initialNominees,
  categories,
  role,
}: {
  initialNominees: Nominee[];
  categories: CategoryOption[];
  role: string;
}) {
  const [nominees, setNominees] = useState(initialNominees);
  const [fields, setFields] = useState<NomineeFields>(emptyFields(categories[0]?.id));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Vote Adjustment Modal State
  const [adjustTarget, setAdjustTarget] = useState<Nominee | null>(null);
  const [adjustType, setAdjustType] = useState<"add" | "deduct">("add");
  const [adjustAmount, setAdjustAmount] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<Nominee | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditingId(null);
    setFields(emptyFields(categories[0]?.id));
    setError("");
    setModalOpen(true);
  }

  function openEdit(nominee: Nominee) {
    setEditingId(nominee.id);
    setFields({
      fullName: nominee.fullName,
      stageName: nominee.stageName || "",
      categoryId: nominee.category.id,
      bio: nominee.bio || "",
      photoUrl: nominee.photoUrl || "",
      photoPosition: nominee.photoPosition || "center",
      socialHandles: JSON.stringify(nominee.socialHandles || {}, null, 2),
    });
    setError("");
    setModalOpen(true);
  }

  function openAdjust(nominee: Nominee) {
    setAdjustTarget(nominee);
    setAdjustType("add");
    setAdjustAmount(10);
    setAdjustReason("");
    setError("");
  }

  function openDelete(nominee: Nominee) {
    setDeleteTarget(nominee);
    setError("");
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Image upload failed.");
      setFields((value) => ({ ...value, photoUrl: result.url! }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function saveNominee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    let socialHandles: Record<string, string>;
    try {
      const parsed = JSON.parse(fields.socialHandles || "{}") as unknown;
      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed) ||
        Object.values(parsed).some((value) => typeof value !== "string")
      ) {
        throw new Error("Social links must be a JSON object of text links.");
      }
      socialHandles = parsed as Record<string, string>;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Invalid social links JSON.");
      setBusy(false);
      return;
    }

    const payload = { ...fields, socialHandles };
    try {
      const response = await fetch("/api/admin/nominees", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const result = (await response.json()) as Nominee & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save nominee.");
      if (editingId) setNominees((items) => items.map((item) => (item.id === editingId ? result : item)));
      else setNominees((items) => [result, ...items]);
      setModalOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save nominee.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(nominee: Nominee) {
    setError("");
    try {
      const response = await fetch("/api/admin/nominees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: nominee.id, isActive: !nominee.isActive }),
      });
      const result = (await response.json()) as Nominee & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update nominee.");
      setNominees((items) =>
        items.map((item) => (item.id === nominee.id ? { ...item, isActive: result.isActive } : item))
      );
    } catch (err: any) {
      setError(err.message || "Failed to update nominee status.");
    }
  }

  async function confirmDeleteNominee() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/nominees?id=${encodeURIComponent(deleteTarget.id)}&permanent=true`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not delete nominee.");
      setNominees((items) => items.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err.message || "Failed to delete nominee.");
    } finally {
      setDeleting(false);
    }
  }

  async function submitVoteAdjustment(event: React.FormEvent) {
    event.preventDefault();
    if (!adjustTarget) return;
    setAdjusting(true);
    setError("");

    const delta = adjustType === "add" ? Math.abs(adjustAmount) : -Math.abs(adjustAmount);
    if (!delta || delta === 0) {
      setError("Please enter a non-zero number of votes.");
      setAdjusting(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/nominees/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomineeId: adjustTarget.id,
          delta,
          reason: adjustReason.trim() || undefined,
        }),
      });
      const result = (await response.json()) as { ok?: boolean; newTotal?: string; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Vote adjustment failed.");

      const newTotal = result.newTotal || (BigInt(adjustTarget.totalVotes) + BigInt(delta)).toString();
      setNominees((items) =>
        items.map((item) => (item.id === adjustTarget.id ? { ...item, totalVotes: newTotal } : item))
      );
      setAdjustTarget(null);
    } catch (err: any) {
      setError(err.message || "Failed to adjust votes.");
    } finally {
      setAdjusting(false);
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Nominee Management</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Nominees</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create, edit, delete nominees, toggle visibility, and add or deduct votes directly.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          <Plus className="size-4" aria-hidden="true" />
          <span>Add Nominee</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} className="text-rose-600 hover:text-rose-900">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Nominees Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3.5 py-3">Nominee</th>
                <th className="px-3.5 py-3">Category</th>
                <th className="px-3 py-3 text-center">Votes</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-3.5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {nominees.map((nominee) => (
                <tr key={nominee.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3.5 py-3">
                    <div className="flex items-center gap-3">
                      {nominee.photoUrl ? (
                        <img
                          src={nominee.photoUrl}
                          alt=""
                          className="size-11 shrink-0 rounded-lg object-cover"
                          style={{
                            objectPosition:
                              nominee.photoPosition === "top"
                                ? "center top"
                                : nominee.photoPosition === "bottom"
                                ? "center bottom"
                                : "center 20%",
                          }}
                        />
                      ) : (
                        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-slate-100 font-bold text-slate-500">
                          {nominee.fullName.slice(0, 1)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">{nominee.fullName}</p>
                        <p className="truncate text-xs font-medium text-slate-500">
                          {nominee.stageName ? `@${nominee.stageName.replace(/^@/, "")}` : "No handle"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-3 text-xs text-slate-600 font-medium">{nominee.category.name}</td>
                  <td className="px-3 py-3 text-center tabular-nums">
                    <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-900">
                      {BigInt(nominee.totalVotes).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        nominee.isActive ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      <span className={`size-1.5 rounded-full ${nominee.isActive ? "bg-emerald-600" : "bg-amber-600"}`} />
                      {nominee.isActive ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="px-3.5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* 1. Add / Deduct Votes */}
                      <button
                        type="button"
                        onClick={() => openAdjust(nominee)}
                        title="Add or Deduct Votes"
                        className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-colors"
                      >
                        <SlidersHorizontal className="size-3.5" />
                        <span>+/- Votes</span>
                      </button>

                      {/* 2. Edit Profile */}
                      <button
                        type="button"
                        onClick={() => openEdit(nominee)}
                        title="Edit profile & photo"
                        className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <Pencil className="size-3.5" />
                      </button>

                      {/* 3. Delete Nominee (Prominent Red Button) */}
                      <button
                        type="button"
                        onClick={() => openDelete(nominee)}
                        title="Delete nominee permanently"
                        className="grid size-8 place-items-center rounded-lg border border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>

                      {/* 4. Suspend / Activate Toggle */}
                      <button
                        type="button"
                        onClick={() => void toggleActive(nominee)}
                        title={nominee.isActive ? "Suspend nominee (hide from public)" : "Activate nominee"}
                        className={`grid size-8 place-items-center rounded-lg border transition-colors ${
                          nominee.isActive
                            ? "border-slate-200 text-slate-500 hover:bg-slate-100"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {nominee.isActive ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!nominees.length && (
                <tr>
                  <td className="px-4 py-12 text-center text-slate-500" colSpan={5}>
                    No nominees yet. Click &quot;Add Nominee&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 1: ADD / DEDUCT VOTES                                        */}
      {/* ------------------------------------------------------------------ */}
      {adjustTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAdjustTarget(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Adjust Vote Tally</p>
                <h2 className="text-lg font-bold text-slate-950">
                  {adjustTarget.stageName || adjustTarget.fullName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAdjustTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={submitVoteAdjustment} className="mt-4 space-y-4">
              {/* Current Votes Card */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs font-semibold">
                <span className="text-slate-600">Current Total Votes:</span>
                <span className="text-base font-extrabold text-slate-900">
                  {BigInt(adjustTarget.totalVotes).toLocaleString()}
                </span>
              </div>

              {/* Mode Toggle: Add or Deduct */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Action
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("add")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-bold transition-all ${
                      adjustType === "add"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Plus className="size-4 text-emerald-600" />
                    <span>Add Votes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("deduct")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-bold transition-all ${
                      adjustType === "deduct"
                        ? "border-rose-600 bg-rose-50 text-rose-800 shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Minus className="size-4 text-rose-600" />
                    <span>Deduct Votes</span>
                  </button>
                </div>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="adjust-amount">
                  Number of Votes to {adjustType === "add" ? "Add" : "Deduct"}
                </label>
                <input
                  id="adjust-amount"
                  type="number"
                  min="1"
                  max="1000000"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Math.max(1, Number(e.target.value) || 1))}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3.5 text-base font-bold text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {[10, 25, 50, 100, 500].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setAdjustAmount(num)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {adjustType === "add" ? `+${num}` : `-${num}`}
                  </button>
                ))}
                {adjustType === "deduct" && Number(adjustTarget.totalVotes) > 0 && (
                  <button
                    type="button"
                    onClick={() => setAdjustAmount(Number(adjustTarget.totalVotes))}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100"
                  >
                    Reset to 0
                  </button>
                )}
              </div>

              {/* New Total Preview */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-100/70 p-3 text-xs font-semibold">
                <span className="text-slate-600">New Total After Adjustment:</span>
                <span className="text-base font-extrabold text-sky-700">
                  {Math.max(
                    0,
                    Number(adjustTarget.totalVotes) + (adjustType === "add" ? adjustAmount : -adjustAmount)
                  ).toLocaleString()}{" "}
                  votes
                </span>
              </div>

              {/* Optional Reason */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="adjust-reason">
                  Reason / Note <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="adjust-reason"
                  type="text"
                  maxLength={200}
                  placeholder="e.g. Manual vote adjustment"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 px-3 text-xs text-slate-900 outline-none focus:border-sky-600"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustTarget(null)}
                  className="h-11 flex-1 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className={`h-11 flex-1 rounded-xl text-sm font-bold text-white shadow-sm transition-all disabled:opacity-50 ${
                    adjustType === "add"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {adjusting ? "Applying..." : adjustType === "add" ? `Add ${adjustAmount} Votes` : `Deduct ${adjustAmount} Votes`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 2: DELETE NOMINEE CONFIRMATION                               */}
      {/* ------------------------------------------------------------------ */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-xl bg-rose-100 text-rose-600">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-950">Delete Nominee?</h3>
                <p className="text-xs text-slate-500">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs text-slate-700">
              <p>
                Are you sure you want to delete{" "}
                <strong className="font-bold text-slate-950">
                  {deleteTarget.stageName || deleteTarget.fullName}
                </strong>
                ?
              </p>
              <p className="mt-1 text-slate-500">
                All associated vote records and candidate data will be permanently removed.
              </p>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="h-11 flex-1 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDeleteNominee}
                className="h-11 flex-1 rounded-xl bg-rose-600 text-sm font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 3: CREATE / EDIT NOMINEE PROFILE                             */}
      {/* ------------------------------------------------------------------ */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="nominee-dialog-title"
            className="my-auto max-h-[calc(100dvh-24px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Creator Profile</p>
                <h2 id="nominee-dialog-title" className="mt-0.5 text-lg font-bold text-slate-900">
                  {editingId ? "Edit Nominee" : "Add Nominee"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </header>
            <form className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={saveNominee}>
              <label className="text-sm font-medium text-slate-700">
                Full name
                <input
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3"
                  maxLength={120}
                  required
                  value={fields.fullName}
                  onChange={(event) => setFields({ ...fields, fullName: event.target.value })}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Stage name / handle
                <input
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3"
                  maxLength={120}
                  value={fields.stageName}
                  onChange={(event) => setFields({ ...fields, stageName: event.target.value })}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Category
                <select
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3"
                  required
                  value={fields.categoryId}
                  onChange={(event) => setFields({ ...fields, categoryId: event.target.value })}
                >
                  {categories
                    .filter((category) => category.isActive !== false || category.id === fields.categoryId)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                        {category.isActive === false ? " (archived)" : ""}
                      </option>
                    ))}
                </select>
              </label>
              <div className="text-sm font-medium text-slate-700">
                Portrait image
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <ImagePlus className="size-4" />
                    {uploading ? "Uploading..." : "Upload image"}
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploading}
                      onChange={(event) => void uploadImage(event.target.files?.[0])}
                    />
                  </label>
                  {fields.photoUrl && (
                    <img
                      src={fields.photoUrl}
                      alt="Portrait preview"
                      className="size-10 rounded-md object-cover object-center"
                      style={{
                        objectPosition:
                          fields.photoPosition === "top"
                            ? "center top"
                            : fields.photoPosition === "bottom"
                            ? "center bottom"
                            : "center 20%",
                      }}
                    />
                  )}
                </div>
                <input
                  aria-label="Portrait image URL"
                  className="mt-2 h-9 w-full rounded-lg border border-slate-300 px-3 text-xs"
                  placeholder="Or paste image URL"
                  value={fields.photoUrl}
                  onChange={(event) => setFields({ ...fields, photoUrl: event.target.value })}
                />
              </div>
              <label className="text-sm font-medium text-slate-700" htmlFor="photo-position">
                Image framing
                <select
                  id="photo-position"
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3"
                  value={fields.photoPosition}
                  onChange={(event) => setFields({ ...fields, photoPosition: event.target.value })}
                >
                  <option value="fit">Auto Fit (Smart Ambient)</option>
                  <option value="top">Top / Face Focus</option>
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Short bio
                <textarea
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2"
                  rows={3}
                  maxLength={1500}
                  value={fields.bio}
                  onChange={(event) => setFields({ ...fields, bio: event.target.value })}
                />
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Social links{" "}
                <span className="font-normal text-slate-500">
                  (JSON object, e.g. {`{"instagram":"https://instagram.com/creator"}`})
                </span>
                <textarea
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                  rows={3}
                  value={fields.socialHandles}
                  onChange={(event) => setFields({ ...fields, socialHandles: event.target.value })}
                />
              </label>
              {error && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 sm:col-span-2" role="alert">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 sm:col-span-2">
                {editingId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const nomineeToDelete = nominees.find((n) => n.id === editingId);
                      if (nomineeToDelete) {
                        setModalOpen(false);
                        openDelete(nomineeToDelete);
                      }
                    }}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:text-rose-900 transition-colors"
                  >
                    <Trash2 className="size-4 text-rose-600" />
                    <span>Delete Nominee</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={busy || uploading}
                    className="min-h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {busy ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
