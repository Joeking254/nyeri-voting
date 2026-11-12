import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (auth.response) return auth.response;
  const [revenue, votes, activeNominees, activeCategories, categories, settings] = await Promise.all([
    prisma.voteTransaction.aggregate({ where: { status: "SUCCESS" }, _sum: { amountPaid: true } }),
    prisma.nominee.aggregate({ _sum: { totalVotes: true } }),
    prisma.nominee.count({ where: { isActive: true, category: { isActive: true } } }),
    prisma.category.count({ where: { isActive: true } }),
    prisma.category.findMany({
      orderBy: { orderIndex: "asc" },
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        votingOpen: true,
        nominees: { where: { isActive: true }, orderBy: { totalVotes: "desc" }, take: 3, select: { id: true, fullName: true, stageName: true, totalVotes: true } },
      },
    }),
    prisma.eventSettings.findUnique({ where: { id: "global" }, select: { votingOpen: true } }),
  ]);
  return NextResponse.json({
    metrics: {
      revenue: revenue._sum.amountPaid ?? 0,
      votes: Number(votes._sum.totalVotes ?? BigInt(0)),
      activeNominees,
      activeCategories,
    },
    votingOpen: settings?.votingOpen ?? true,
    categories: categories.map((category) => ({
      ...category,
      nominees: category.nominees.map((nominee) => ({ ...nominee, totalVotes: nominee.totalVotes.toString() })),
    })),
  });
}
