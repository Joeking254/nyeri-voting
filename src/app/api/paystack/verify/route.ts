import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPaystackTransaction } from "@/lib/paystack";
import { claimPaymentAndIncrementVotes } from "@/lib/vote-counts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { reference?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reference = typeof body.reference === "string" ? body.reference.trim() : "";
  if (!reference) {
    return NextResponse.json({ error: "Reference is required" }, { status: 400 });
  }

  try {
    const verification = await verifyPaystackTransaction(reference);

    if (!verification.success || !verification.data) {
      return NextResponse.json(
        { error: verification.message || "Payment verification failed" },
        { status: 400 }
      );
    }

    const tx = await prisma.voteTransaction.findUnique({
      where: { id: reference },
      include: { nominee: { select: { fullName: true, stageName: true } } },
    });

    if (!tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
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

    return NextResponse.json({
      success: true,
      numberOfVotes: tx.numberOfVotes,
      receiptNumber: `PSTK-${reference.slice(-10).toUpperCase()}`,
      nomineeName: tx.nominee?.stageName || tx.nominee?.fullName,
    });
  } catch (err) {
    console.error("Paystack on-site verification error:", err);
    return NextResponse.json({ error: "Could not verify payment" }, { status: 500 });
  }
}
