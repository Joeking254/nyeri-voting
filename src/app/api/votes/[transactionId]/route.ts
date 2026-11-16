import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPayHeroTransactionStatus, isPayHeroConfigured } from "@/lib/payhero";
import { claimPaymentAndIncrementVotes } from "@/lib/vote-counts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ transactionId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { transactionId } = await context.params;
  const transaction = await prisma.voteTransaction.findUnique({
    where: { id: transactionId },
    select: {
      id: true,
      status: true,
      numberOfVotes: true,
      amountPaid: true,
      mpesaReceiptNumber: true,
      nomineeId: true,
      categoryId: true,
      transactionId: true,
      merchantRequestId: true,
      createdAt: true,
    },
  });

  if (!transaction) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

  // If transaction is still pending and PayHero is configured, query PayHero transaction status directly
  if (transaction.status === "PENDING" && isPayHeroConfigured()) {
    try {
      const candidates = [
        transaction.merchantRequestId,
        transaction.transactionId,
        transaction.id,
      ].filter((ref): ref is string => Boolean(ref && typeof ref === "string" && ref.trim()));

      const uniqueCandidates = Array.from(new Set(candidates));

      let payheroStatus = null;
      for (const ref of uniqueCandidates) {
        const result = await checkPayHeroTransactionStatus(ref);
        if (result) {
          if (result.status === "SUCCESS" || result.status === "FAILED") {
            payheroStatus = result;
            break;
          }
          if (result.status === "PENDING" && !payheroStatus) {
            payheroStatus = result;
          }
        }
      }

      if (payheroStatus?.status === "SUCCESS") {
        const receipt =
          payheroStatus.receiptNumber ||
          transaction.transactionId ||
          transaction.merchantRequestId ||
          `PH-${Date.now()}`;

        let claimed = false;
        await prisma.$transaction(async (database) => {
          claimed = await claimPaymentAndIncrementVotes(database, {
            transactionId: transaction.id,
            checkoutRequestId: transaction.transactionId || undefined,
            nomineeId: transaction.nomineeId,
            categoryId: transaction.categoryId,
            numberOfVotes: transaction.numberOfVotes,
            receiptNumber: receipt,
          });
        });

        if (claimed) {
          return NextResponse.json({
            status: "SUCCESS",
            numberOfVotes: transaction.numberOfVotes,
            amountPaid: transaction.amountPaid,
            receiptNumber: receipt,
          });
        }
      } else if (payheroStatus?.status === "FAILED") {
        await prisma.voteTransaction.updateMany({
          where: { id: transaction.id, status: "PENDING" },
          data: { status: "FAILED" },
        });
        return NextResponse.json({
          status: "FAILED",
          numberOfVotes: transaction.numberOfVotes,
          amountPaid: transaction.amountPaid,
          receiptNumber: null,
        });
      }
    } catch (error) {
      console.warn("PayHero status query in polling endpoint failed:", error);
    }
  }

  return NextResponse.json({
    status: transaction.status,
    numberOfVotes: transaction.numberOfVotes,
    amountPaid: transaction.amountPaid,
    receiptNumber: transaction.status === "SUCCESS" ? transaction.mpesaReceiptNumber : null,
  });
}
