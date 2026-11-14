import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPaystackTransaction } from "@/lib/paystack";
import { claimPaymentAndIncrementVotes } from "@/lib/vote-counts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") || url.searchParams.get("trxref");

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://13.62.100.156").replace(/\/$/, "");

  if (!reference) {
    return NextResponse.redirect(`${appUrl}/?error=missing_reference`);
  }

  try {
    const verification = await verifyPaystackTransaction(reference);

    if (!verification.success || !verification.data) {
      console.warn("Paystack verification failed for reference:", reference, verification.message);
      return NextResponse.redirect(`${appUrl}/?error=verification_failed`);
    }

    const tx = await prisma.voteTransaction.findUnique({
      where: { id: reference },
      include: { nominee: { select: { slug: true, fullName: true, stageName: true } } },
    });

    if (!tx) {
      console.error("Paystack transaction not found in database:", reference);
      return NextResponse.redirect(`${appUrl}/?error=transaction_not_found`);
    }

    if (tx.status === "PENDING") {
      await prisma.$transaction(async (database) => {
        await claimPaymentAndIncrementVotes(database, {
          transactionId: tx.id,
          nomineeId: tx.nomineeId,
          categoryId: tx.categoryId,
          numberOfVotes: tx.numberOfVotes,
          receiptNumber: `PSTK-${reference.slice(-10).toUpperCase()}`,
        });
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
