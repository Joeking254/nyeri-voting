import { ManageCategories } from "@/components/admin/ManageCategories";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const session = await getAdminSession();
  if (!session) return null;
  const categories = await prisma.category.findMany({
    orderBy: { orderIndex: "asc" },
    include: { _count: { select: { nominees: true, votes: true } } },
  });
  const initialCategories = categories.map((category) => ({ ...category, totalVotes: category.totalVotes.toString() }));
  return <ManageCategories initialCategories={initialCategories} role={session.role} />;
}
