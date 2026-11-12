import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { initiatePayment, normalizeKenyanPhone } from "@/lib/payment";
import { rateLimitStkPush } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_AMOUNT = 2_147_483_640;
const MAX_REQUEST_BYTES = 8_192;

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }
  if (Number(request.headers.get("content-length") || 0) > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
  }

  let body: { nomineeId?: unknown; phoneNumber?: unknown; numberOfVotes?: unknown };
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
    }
    body = JSON.parse(rawBody) as typeof body;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const nomineeId = typeof body.nomineeId === "string" ? body.nomineeId.trim() : "";
  const phoneNumber = typeof body.phoneNumber === "string" ? normalizeKenyanPhone(body.phoneNumber) : null;
  const numberOfVotes = body.numberOfVotes;
  if (!/^[\w-]{1,100}$/.test(nomineeId) || !phoneNumber || !Number.isSafeInteger(numberOfVotes) || Number(numberOfVotes) < 1) {
    return NextResponse.json(
      { error: "Provide a nominee, a valid mobile number (e.g. 07XXXXXXXX or 01XXXXXXXX), and a positive whole number of votes" },
      { status: 400 },
    );
  }

  const count = Number(numberOfVotes);
  const rateLimitResponse = await rateLimitStkPush(request, phoneNumber);
  if (rateLimitResponse) return rateLimitResponse;

  const eventSettings = await prisma.eventSettings.findUnique({
    where: { id: "global" },
    select: { votingOpen: true, votePrice: true, unlimitedVotes: true, votingStartsAt: true, votingEndsAt: true },
  });
  const now = new Date();
  if (
    eventSettings?.votingOpen === false ||
    (eventSettings?.votingStartsAt && eventSettings.votingStartsAt > now) ||
    (eventSettings?.votingEndsAt && eventSettings.votingEndsAt <= now)
  ) {
    return NextResponse.json({ error: "Voting is currently closed" }, { status: 403 });
  }
  if (eventSettings?.unlimitedVotes === false && count > 1) {
    return NextResponse.json({ error: "Only one vote per payment is currently allowed" }, { status: 400 });
  }

  const votePrice = eventSettings?.votePrice ?? 10;
  const amount = count * votePrice;
  if (!Number.isSafeInteger(amount) || amount > MAX_AMOUNT) {
    return NextResponse.json({ error: "Vote quantity exceeds the maximum for one payment" }, { status: 400 });
  }

  const nominee = await prisma.nominee.findFirst({
    where: { id: nomineeId, isActive: true, isApproved: true, category: { isActive: true, votingOpen: true } },
    select: { id: true, categoryId: true, stageName: true, fullName: true },
  });
  if (!nominee) return NextResponse.json({ error: "Nominee not found or inactive" }, { status: 404 });

  const transaction = await prisma.voteTransaction.create({
    data: {
      id: crypto.randomUUID(),
      phoneNumber,
      nomineeId: nominee.id,
      categoryId: nominee.categoryId,
      numberOfVotes: count,
      amountPaid: amount,
    },
    select: { id: true },
  });

  try {
    const result = await initiatePayment({
      phoneNumber,
      amount,
      votePrice,
      accountReference: transaction.id,
      customerName: nominee.stageName || nominee.fullName,
    });
    await prisma.voteTransaction.update({
      where: { id: transaction.id },
      data: {
        transactionId: result.checkoutRequestId,
        merchantRequestId: result.merchantRequestId || null,
      },
    });
    return NextResponse.json({ transactionId: transaction.id, status: "PENDING" }, { status: 202 });
  } catch (error) {
    await prisma.voteTransaction.update({ where: { id: transaction.id }, data: { status: "FAILED" } });
    console.error("Payment STK Push initiation failed:", error);
    const message = error instanceof Error ? error.message : "Unable to initiate payment prompt";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
