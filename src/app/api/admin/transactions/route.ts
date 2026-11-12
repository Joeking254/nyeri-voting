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
  const where = {
    ...(status?.success ? { status: status.data } : {}),
    ...(since || until ? { createdAt: { ...(since ? { gte: since } : {}), ...(until ? { lte: until } : {}) } } : {}),
    ...(query ? { OR: [
      { phoneNumber: { contains: query } },
      { mpesaReceiptNumber: { contains: query, mode: "insensitive" as const } },
      { nominee: { fullName: { contains: query, mode: "insensitive" as const } } },
      { nominee: { stageName: { contains: query, mode: "insensitive" as const } } },
      { category: { name: { contains: query, mode: "insensitive" as const } } },
    ] } : {}),
  };
  const exporting = params.get("export") === "csv";
  const take = exporting ? 10000 : 50;
  const skip = exporting ? 0 : Math.max(0, Math.min(Number(params.get("page") || 0), 10000)) * take;
  const [transactions, total] = await Promise.all([
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
  ]);
  const rows = transactions.map((transaction) => ({
    ...transaction,
    createdAt: transaction.createdAt.toISOString(),
    phoneNumber: `${transaction.phoneNumber.slice(0, 4)}****${transaction.phoneNumber.slice(-4)}`,
  }));
  if (exporting) {
    const headers = ["Date/Time", "Phone Number", "Nominee", "Category", "Votes", "Amount (KES)", "M-Pesa Receipt", "Status"];
    const csvRows = rows.map((row) => [row.createdAt, row.phoneNumber, row.nominee.stageName || row.nominee.fullName, row.category.name, row.numberOfVotes, row.amountPaid, row.mpesaReceiptNumber || "", row.status].map(csvEscape).join(","));
    return new Response([headers.map(csvEscape).join(","), ...csvRows].join("\r\n"), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="nyeri-vote-ledger.csv"', "Cache-Control": "no-store" },
    });
  }
  return NextResponse.json({ transactions: rows, total, page: Math.floor(skip / take), pageSize: take });
}
