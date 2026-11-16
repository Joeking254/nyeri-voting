import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (auth.response) return auth.response;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    revenue,
    todayRevenue,
    votes,
    activeNominees,
    activeCategories,
    categories,
    settings,
    recentPayments,
  ] = await Promise.all([
    prisma.voteTransaction.aggregate({ where: { status: "SUCCESS" }, _sum: { amountPaid: true } }),
    prisma.voteTransaction.aggregate({
      where: { status: "SUCCESS", createdAt: { gte: todayStart } },
      _sum: { amountPaid: true },
    }),
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
        nominees: {
          where: { isActive: true },
          orderBy: { totalVotes: "desc" },
          take: 3,
          select: { id: true, fullName: true, stageName: true, totalVotes: true },
        },
      },
    }),
    prisma.eventSettings.findUnique({ where: { id: "global" }, select: { votingOpen: true } }),
    prisma.voteTransaction.findMany({
      where: { status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        createdAt: true,
        amountPaid: true,
        numberOfVotes: true,
        mpesaReceiptNumber: true,
        phoneNumber: true,
        nominee: { select: { fullName: true, stageName: true } },
        category: { select: { name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    metrics: {
      revenue: revenue._sum.amountPaid ?? 0,
      todayRevenue: todayRevenue._sum.amountPaid ?? 0,
      votes: Number(votes._sum.totalVotes ?? BigInt(0)),
      activeNominees,
      activeCategories,
    },
    votingOpen: settings?.votingOpen ?? true,
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      amount: p.amountPaid,
      votes: p.numberOfVotes,
      receipt: p.mpesaReceiptNumber || "—",
      nomineeName: p.nominee.stageName || p.nominee.fullName,
      categoryName: p.category.name,
      createdAt: p.createdAt.toISOString(),
      isCard: (p.mpesaReceiptNumber || "").startsWith("PSTK-"),
      phone: p.phoneNumber ? `${p.phoneNumber.slice(0, 4)}****${p.phoneNumber.slice(-4)}` : "—",
    })),
    categories: categories.map((category) => ({
      ...category,
      nominees: category.nominees.map((nominee) => ({ ...nominee, totalVotes: nominee.totalVotes.toString() })),
    })),
    lastSyncedAt: new Date().toISOString(),
  });
}
