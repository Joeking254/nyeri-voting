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
      include: {
        nominee: { select: { slug: true, fullName: true, stageName: true, photoUrl: true } },
        category: { select: { name: true } },
      },
    });

    if (!tx) {
      console.error("Paystack transaction not found in database:", reference);
      return NextResponse.redirect(`${appUrl}/?error=transaction_not_found`);
    }

    const receiptNumber = `PSTK-${tx.id.replace(/-/g, "").slice(-12).toUpperCase()}`;

    if (tx.status === "PENDING") {
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

    const nomineeName = tx.nominee?.stageName || tx.nominee?.fullName || "Nominee";
    const categoryName = tx.category?.name || "";
    const photoUrl = tx.nominee?.photoUrl || "";

    const queryParams = new URLSearchParams({
      vote_status: "success",
      votes: String(tx.numberOfVotes),
      receipt: receiptNumber,
      nominee_name: nomineeName,
      category_name: categoryName,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
      ...(tx.nominee?.slug ? { nominee_slug: tx.nominee.slug } : {}),
    });

    const destination = tx.nominee?.slug
      ? `${appUrl}/nominees/${encodeURIComponent(tx.nominee.slug)}?${queryParams.toString()}`
      : `${appUrl}/?${queryParams.toString()}`;

    return NextResponse.redirect(destination);
  } catch (err) {
    console.error("Paystack callback processing error:", err);
    return NextResponse.redirect(`${appUrl}/?error=processing_error`);
  }
}
