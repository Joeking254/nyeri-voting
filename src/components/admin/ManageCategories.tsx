"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";

type Category = { id: string; name: string; description: string | null; orderIndex: number; isActive: boolean; votingOpen: boolean; totalVotes: string; _count: { nominees: number; votes: number } };

export function ManageCategories({ initialCategories, role }: { initialCategories: Category[]; role: string }) {
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("save"); setError("");
    try {
      const response = await fetch("/api/admin/categories", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing, name, description } : { name, description }),
      });
      const result = await response.json() as Category & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save category.");
      if (editing) setCategories((items) => items.map((item) => item.id === editing ? { ...item, ...result } : item));
      else setCategories((items) => [...items, { ...result, totalVotes: "0", isActive: true, votingOpen: true, _count: { nominees: 0, votes: 0 } }]);
      setEditing(null); setName(""); setDescription("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save category."); }
    finally { setBusy(""); }
  }

  function editCategory(category: Category) {
    setEditing(category.id); setName(category.name); setDescription(category.description || "");
    document.getElementById("category-name")?.focus();
  }

  async function patchCategory(category: Category, patch: Partial<Category>) {
    setBusy(category.id); setError("");
    try {
      const response = await fetch("/api/admin/categories", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: category.id, ...patch }) });
      const result = await response.json() as Category & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update category.");
      setCategories((items) => items.map((item) => item.id === category.id ? { ...item, ...result } : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update category."); }
    finally { setBusy(""); }
  }

  async function moveCategory(index: number, direction: -1 | 1) {
    const otherIndex = index + direction;
    if (otherIndex < 0 || otherIndex >= categories.length) return;
    const first = categories[index]; const second = categories[otherIndex];
    setBusy("reorder"); setError("");
    try {
      const results = await Promise.all([
        fetch("/api/admin/categories", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: first.id, orderIndex: second.orderIndex }) }),
        fetch("/api/admin/categories", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: second.id, orderIndex: first.orderIndex }) }),
      ]);
      if (results.some((result) => !result.ok)) throw new Error("Only a super admin can reorder categories.");
      const reordered = [...categories]; [reordered[index], reordered[otherIndex]] = [reordered[otherIndex], reordered[index]];
      setCategories(reordered.map((item, orderIndex) => ({ ...item, orderIndex })));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not reorder categories."); }
    finally { setBusy(""); }
  }

  async function deleteCategory(category: Category) {
    if (!window.confirm(`Permanently delete "${category.name}"? Categories with nominees or transactions must be archived instead.`)) return;
    setBusy(category.id); setError("");
    try {
      const response = await fetch(`/api/admin/categories?id=${encodeURIComponent(category.id)}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not delete category.");
      setCategories((items) => items.filter((item) => item.id !== category.id));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not delete category."); }
    finally { setBusy(""); }
  }

  return (
    <div>
      <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Content setup</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Categories</h1><p className="mt-1 text-sm text-slate-600">Organize, reorder, and control public voting categories.</p></div>
      {error && <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
      <form className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end" onSubmit={saveCategory}>
        <label className="text-sm font-medium text-slate-700" htmlFor="category-name">Category name<input id="category-name" className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required /></label>
        <label className="text-sm font-medium text-slate-700" htmlFor="category-description">Description<input id="category-description" className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} /></label>
        <div className="flex gap-2"><button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50" disabled={busy === "save"}><Plus className="size-4" aria-hidden="true" />{editing ? "Save" : "Add"}</button>{editing && <button type="button" className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700" onClick={() => { setEditing(null); setName(""); setDescription(""); }}>Cancel</button>}</div>
      </form>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-[minmax(0,1.5fr)_100px_100px_210px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid"><span>Category</span><span>Nominees</span><span>Votes</span><span className="text-right">Actions</span></div>
        {categories.map((category, index) => <div key={category.id} className="grid gap-3 border-b border-slate-100 p-4 last:border-b-0 sm:grid-cols-[minmax(0,1.5fr)_100px_100px_210px] sm:items-center">
          <div className="min-w-0"><div className="flex items-center gap-2"><h2 className="truncate text-sm font-semibold text-slate-900">{category.name}</h2><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${category.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{category.isActive ? "Active" : "Archived"}</span></div><p className="mt-1 line-clamp-1 text-xs text-slate-500">{category.description || "No description"}</p></div>
          <span className="text-sm text-slate-700 sm:text-slate-600">{category._count.nominees} nominees</span><span className="text-sm tabular-nums text-slate-700">{BigInt(category.totalVotes).toLocaleString()} votes</span>
          <div className="flex flex-wrap items-center justify-start gap-1 sm:justify-end">
            <button type="button" title="Move up" aria-label={`Move ${category.name} up`} disabled={index === 0 || busy !== "" || role !== "super_admin"} onClick={() => void moveCategory(index, -1)} className="grid size-8 place-items-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="size-4" /></button>
            <button type="button" title="Move down" aria-label={`Move ${category.name} down`} disabled={index === categories.length - 1 || busy !== "" || role !== "super_admin"} onClick={() => void moveCategory(index, 1)} className="grid size-8 place-items-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="size-4" /></button>
            <button type="button" title="Edit" aria-label={`Edit ${category.name}`} onClick={() => editCategory(category)} className="grid size-8 place-items-center rounded-md text-slate-600 hover:bg-slate-100"><Pencil className="size-4" /></button>
            <button type="button" className={`min-h-8 rounded-md px-2 text-xs font-semibold ${category.isActive ? "text-slate-600 hover:bg-slate-100" : "text-emerald-700 hover:bg-emerald-50"}`} onClick={() => void patchCategory(category, { isActive: !category.isActive })}>{category.isActive ? "Archive" : "Restore"}</button>
            <button type="button" title="Delete" aria-label={`Delete ${category.name}`} disabled={role !== "super_admin" || busy !== ""} onClick={() => void deleteCategory(category)} className="grid size-8 place-items-center rounded-md text-rose-700 hover:bg-rose-50 disabled:opacity-30"><Trash2 className="size-4" /></button>
          </div>
        </div>)}
        {!categories.length && <p className="p-8 text-center text-sm text-slate-500">No categories yet. Add one above.</p>}
      </div>
      {role !== "super_admin" && <p className="mt-3 text-xs text-slate-500">Only super admins can reorder or permanently delete categories.</p>}
    </div>
  );
}
