import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { verifyPaystackTransaction } from "@/lib/paystack";
import { claimPaymentAndIncrementVotes } from "@/lib/vote-counts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if (auth.response) return auth.response;

  try {
    // Find all pending card / paystack transactions
    const pendingTransactions = await prisma.voteTransaction.findMany({
      where: {
        status: "PENDING",
        OR: [
          { phoneNumber: { contains: "(Card)" } },
          { phoneNumber: { contains: "@" } },
        ],
      },
      include: {
        nominee: { select: { fullName: true, stageName: true } },
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    const results = [];

    for (const tx of pendingTransactions) {
      const ref = tx.transactionId || tx.id;
      try {
        const verification = await verifyPaystackTransaction(ref);
        if (verification.success && verification.data?.status?.toLowerCase() === "success") {
          const receiptNumber = `PSTK-${tx.id.replace(/-/g, "").slice(-12).toUpperCase()}`;

          await prisma.$transaction(async (database) => {
            await claimPaymentAndIncrementVotes(database, {
              transactionId: tx.id,
              nomineeId: tx.nomineeId,
              categoryId: tx.categoryId,
              numberOfVotes: tx.numberOfVotes,
              receiptNumber,
            });
          });

          results.push({
            id: tx.id,
            nominee: tx.nominee?.stageName || tx.nominee?.fullName,
            votes: tx.numberOfVotes,
            status: "SUCCESS_SYNCED",
          });
        } else {
          results.push({
            id: tx.id,
            nominee: tx.nominee?.stageName || tx.nominee?.fullName,
            status: verification.data?.status || "NOT_PAID",
          });
        }
      } catch (err) {
        results.push({
          id: tx.id,
          error: err instanceof Error ? err.message : "Verification failed",
        });
      }
    }

    const creditedCount = results.filter((r) => r.status === "SUCCESS_SYNCED").length;

    return NextResponse.json({
      success: true,
      totalChecked: pendingTransactions.length,
      creditedCount,
      results,
    });
  } catch (err) {
    console.error("Admin Paystack sync error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
