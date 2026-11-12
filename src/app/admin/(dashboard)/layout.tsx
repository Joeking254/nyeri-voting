import { redirect } from "next/navigation";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getAdminSession } from "@/lib/admin-auth";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <AdminLayout email={session.email} role={session.role}>{children}</AdminLayout>;
}
