import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

type AdminLayoutProps = {
  children: ReactNode;
  email: string;
  role: string;
};

export function AdminLayout({ children, email, role }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <AdminSidebar email={email} role={role} />
      <div className="min-w-0 flex-1">
        <header className="hidden h-[61px] items-center justify-between border-b border-slate-200 bg-white px-8 lg:flex">
          <p className="text-sm font-medium text-slate-600">Nyeri Content Creators Awards <span className="mx-1 text-slate-300">/</span> Admin</p>
          <a href="/" target="_blank" rel="noreferrer" className="text-sm font-medium text-sky-700 hover:text-sky-900">View public site</a>
        </header>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </div>
    </div>
  );
}
