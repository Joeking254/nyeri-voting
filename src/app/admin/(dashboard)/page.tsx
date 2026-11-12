import { AdminOverview } from "@/components/admin/AdminOverview";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const session = await getAdminSession();
  if (!session) return null;
  return <AdminOverview role={session.role} />;
}
