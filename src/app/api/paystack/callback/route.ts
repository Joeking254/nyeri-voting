import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPaystackTransaction } from "@/lib/paystack";
import { claimPaymentAndIncrementVotes } from "@/lib/vote-counts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") || url.searchParams.get("trxref");

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "13.62.100.156";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const appUrl = `${proto}://${host}`;

  if (!reference) {
    return NextResponse.redirect(`${appUrl}/?error=missing_reference`);
  }

  try {
    const verification = await verifyPaystackTransaction(reference);

    if (!verification.success || !verification.data) {
      console.warn("Paystack verification failed for reference:", reference, verification.message);
      return NextResponse.redirect(`${appUrl}/?error=verification_failed`);
    }

    const tx = await prisma.voteTransaction.findFirst({
      where: {
        OR: [
          { id: reference },
          { transactionId: reference },
        ],
      },
      include: { nominee: { select: { slug: true, fullName: true, stageName: true } } },
    });

    if (!tx) {
      console.error("Paystack transaction not found in database:", reference);
      return NextResponse.redirect(`${appUrl}/?error=transaction_not_found`);
    }

    if (tx.status === "PENDING") {
      const receiptNumber = `PSTK-${tx.id.replace(/-/g, "").slice(-12).toUpperCase()}`;
      await prisma.$transaction(async (database) => {
        const claimed = await claimPaymentAndIncrementVotes(database, {
          transactionId: tx.id,
          nomineeId: tx.nomineeId,
          categoryId: tx.categoryId,
          numberOfVotes: tx.numberOfVotes,
          receiptNumber,
        });
        if (!claimed) {
          console.warn(`Transaction ${tx.id} was already claimed or processed.`);
        }
      });
    }

    const destination = tx.nominee?.slug
      ? `${appUrl}/nominees/${encodeURIComponent(tx.nominee.slug)}?vote_status=success&votes=${tx.numberOfVotes}&receipt=${encodeURIComponent(reference)}`
      : `${appUrl}/?vote_status=success&votes=${tx.numberOfVotes}`;

    return NextResponse.redirect(destination);
  } catch (err) {
    console.error("Paystack callback processing error:", err);
    return NextResponse.redirect(`${appUrl}/?error=processing_error`);
  }
}
