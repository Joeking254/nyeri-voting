import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthorizedPaystackWebhook } from "@/lib/paystack";
import { claimPaymentAndIncrementVotes } from "@/lib/vote-counts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("x-paystack-signature");
  const rawBody = await request.text();

  if (!isAuthorizedPaystackWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string; status?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event === "charge.success" && event.data?.reference) {
    const reference = event.data.reference;
    try {
      const tx = await prisma.voteTransaction.findFirst({
        where: {
          OR: [
            { id: reference },
            { transactionId: reference },
          ],
        },
      });

      if (tx && tx.status === "PENDING") {
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
      }
    } catch (err) {
      console.error("Paystack webhook vote crediting error:", err);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }

  return NextResponse.json({ status: "success" }, { status: 200 });
}
