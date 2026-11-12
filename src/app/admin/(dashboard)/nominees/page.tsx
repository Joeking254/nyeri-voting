import { ManageNominees } from "@/components/admin/ManageNominees";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminNomineesPage() {
  const session = await getAdminSession();
  if (!session) return null;
  const [categories, nominees] = await Promise.all([
    prisma.category.findMany({ orderBy: { orderIndex: "asc" }, select: { id: true, name: true, isActive: true } }),
    prisma.nominee.findMany({
      orderBy: [{ category: { orderIndex: "asc" } }, { fullName: "asc" }],
      include: { category: { select: { id: true, name: true } } },
    }),
  ]);
  const initialNominees = nominees.map((nominee) => ({
    ...nominee,
    totalVotes: nominee.totalVotes.toString(),
    socialHandles: (nominee.socialHandles && typeof nominee.socialHandles === "object" && !Array.isArray(nominee.socialHandles) ? nominee.socialHandles : {}) as Record<string, string>,
  }));
  return <ManageNominees initialNominees={initialNominees} categories={categories} role={session.role} />;
}
