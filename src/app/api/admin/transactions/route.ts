import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const statusSchema = z.enum(["PENDING", "SUCCESS", "FAILED"]);
const csvEscape = (value: string | number) => {
  const raw = typeof value === "string" && /^[\s]*[=+@-]/.test(value) ? `'${value}` : String(value);
  return `"${raw.replaceAll('"', '""')}"`;
};

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim().slice(0, 100);
  const rawStatus = params.get("status");
  const status = rawStatus ? statusSchema.safeParse(rawStatus) : null;
  if (rawStatus && !status?.success) return NextResponse.json({ error: "Invalid status filter." }, { status: 400 });
  const since = params.get("from") ? new Date(`${params.get("from")}T00:00:00.000Z`) : undefined;
  const until = params.get("to") ? new Date(`${params.get("to")}T23:59:59.999Z`) : undefined;
  if ((since && Number.isNaN(since.valueOf())) || (until && Number.isNaN(until.valueOf()))) {
    return NextResponse.json({ error: "Invalid date filter." }, { status: 400 });
  }

  const methodParam = params.get("method")?.toUpperCase();
  const methodFilter = methodParam === "CARD"
    ? {
        OR: [
          { mpesaReceiptNumber: { startsWith: "PSTK-" } },
          { phoneNumber: { contains: "@" } },
          { phoneNumber: { contains: "Card" } },
        ],
      }
    : methodParam === "MPESA"
    ? {
        AND: [
          { NOT: { mpesaReceiptNumber: { startsWith: "PSTK-" } } },
          { NOT: { phoneNumber: { contains: "@" } } },
          { NOT: { phoneNumber: { contains: "Card" } } },
        ],
      }
    : {};

  const where: any = {
    ...(status?.success ? { status: status.data } : {}),
    ...(since || until ? { createdAt: { ...(since ? { gte: since } : {}), ...(until ? { lte: until } : {}) } } : {}),
    ...methodFilter,
    ...(query ? { OR: [
      { phoneNumber: { contains: query } },
      { mpesaReceiptNumber: { contains: query } },
      { nominee: { fullName: { contains: query } } },
      { nominee: { stageName: { contains: query } } },
      { category: { name: { contains: query } } },
    ] } : {}),
  };
  const exporting = params.get("export") === "csv";
  const take = exporting ? 10000 : 50;
  const skip = exporting ? 0 : Math.max(0, Math.min(Number(params.get("page") || 0), 10000)) * take;
  const [transactions, total, successAgg, cardSuccessAgg, pendingCount, failedCount] = await Promise.all([
    prisma.voteTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        createdAt: true,
        phoneNumber: true,
        numberOfVotes: true,
        amountPaid: true,
        status: true,
        mpesaReceiptNumber: true,
        nominee: { select: { fullName: true, stageName: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.voteTransaction.count({ where }),
    prisma.voteTransaction.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amountPaid: true, numberOfVotes: true },
      _count: true,
    }),
    prisma.voteTransaction.aggregate({
      where: {
        status: "SUCCESS",
        OR: [
          { mpesaReceiptNumber: { startsWith: "PSTK-" } },
          { phoneNumber: { contains: "@" } },
          { phoneNumber: { contains: "Card" } },
        ],
      },
      _sum: { amountPaid: true, numberOfVotes: true },
      _count: true,
    }),
    prisma.voteTransaction.count({ where: { status: "PENDING" } }),
    prisma.voteTransaction.count({ where: { status: "FAILED" } }),
  ]);
  const rows = transactions.map((transaction) => {
    const isCard =
      (transaction.mpesaReceiptNumber || "").startsWith("PSTK-") ||
      transaction.phoneNumber.toLowerCase().includes("card") ||
      transaction.phoneNumber.includes("@");

    return {
      ...transaction,
      method: (isCard ? "CARD" : "M-PESA") as "CARD" | "M-PESA",
      createdAt: transaction.createdAt.toISOString(),
      phoneNumber: transaction.phoneNumber.includes("@")
        ? transaction.phoneNumber.replace(/\s*\(Card\)/i, "")
        : `${transaction.phoneNumber.slice(0, 4)}****${transaction.phoneNumber.slice(-4)}`,
    };
  });

  if (exporting) {
    const headers = [
      "Date/Time",
      "Method",
      "Payer (Phone/Email)",
      "Nominee",
      "Category",
      "Votes",
      "Amount (KES)",
      "Receipt / Ref",
      "Status",
    ];
    const csvRows = rows.map((row) =>
      [
        row.createdAt,
        row.method,
        row.phoneNumber,
        row.nominee.stageName || row.nominee.fullName,
        row.category.name,
        row.numberOfVotes,
        row.amountPaid,
        row.mpesaReceiptNumber || "",
        row.status,
      ]
        .map(csvEscape)
        .join(",")
    );
    return new Response([headers.map(csvEscape).join(","), ...csvRows].join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="nyeri-vote-ledger.csv"',
        "Cache-Control": "no-store",
      },
    });
  }

  const totalRev = successAgg._sum.amountPaid ?? 0;
  const cardRev = cardSuccessAgg._sum.amountPaid ?? 0;
  const mpesaRev = Math.max(0, totalRev - cardRev);

  return NextResponse.json({
    transactions: rows,
    total,
    page: Math.floor(skip / take),
    pageSize: take,
    summary: {
      totalRevenue: totalRev,
      mpesaRevenue: mpesaRev,
      cardRevenue: cardRev,
      totalVotes: Number(successAgg._sum.numberOfVotes ?? 0),
      successfulCount: successAgg._count ?? 0,
      pendingCount,
      failedCount,
    },
    lastSyncedAt: new Date().toISOString(),
  });
}
