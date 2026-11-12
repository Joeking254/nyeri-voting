"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, CreditCard, FolderKanban, LogOut, Users } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const navigation = [
  { href: "/admin", label: "Overview", icon: BarChart3, exact: true },
  { href: "/admin/categories", label: "Categories", icon: FolderKanban },
  { href: "/admin/nominees", label: "Nominees", icon: Users },
  { href: "/admin/transactions", label: "Payment ledger", icon: CreditCard },
];

type AdminSidebarProps = { email: string; role: string };

export function AdminSidebar({ email, role }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-3 px-5 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-slate-900 font-serif text-lg font-bold text-white">N</span>
          <span className="min-w-0"><span className="block text-sm font-bold text-slate-900">Nyeri Awards</span><span className="block text-xs text-slate-500">Admin console</span></span>
        </div>
        <ThemeToggle />
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-1 lg:flex-col lg:overflow-visible lg:px-3 lg:pt-5" aria-label="Admin navigation">
        {navigation.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-10 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${active ? "bg-slate-100 text-slate-950" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}><Icon className="size-[18px]" aria-hidden="true" /><span>{label}</span></Link>;
        })}
      </nav>
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 lg:hidden">
        <div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{email}</p><p className="text-[11px] capitalize text-slate-500">{role.replace("_", " ")}</p></div>
        <button type="button" onClick={signOut} className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"><LogOut className="size-4" aria-hidden="true" /> Sign out</button>
      </div>
      <div className="hidden border-t border-slate-200 p-4 lg:block">
        <p className="truncate text-sm font-semibold text-slate-800">{email}</p>
        <p className="mt-0.5 text-xs capitalize text-slate-500">{role.replace("_", " ")}</p>
        <button type="button" onClick={signOut} className="mt-4 flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"><LogOut className="size-4" aria-hidden="true" /> Sign out</button>
      </div>
    </aside>
  );
}
