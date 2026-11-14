import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePaystackAmount, initiatePaystackTransaction, isPaystackConfigured } from "@/lib/paystack";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!isPaystackConfigured()) {
    return NextResponse.json(
      { error: "Card payment service (Paystack) is currently not configured." },
      { status: 503 }
    );
  }

  let body: { nomineeId?: unknown; email?: unknown; numberOfVotes?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const nomineeId = typeof body.nomineeId === "string" ? body.nomineeId.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const rawVotes = Number(body.numberOfVotes);

  if (!nomineeId || !email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { error: "Provide a valid email address and nominee." },
      { status: 400 }
    );
  }

  const pricing = calculatePaystackAmount(rawVotes);

  // Check event settings
  const eventSettings = await prisma.eventSettings.findUnique({
    where: { id: "global" },
    select: { votingOpen: true, votingStartsAt: true, votingEndsAt: true },
  });
  const now = new Date();
  if (
    eventSettings?.votingOpen === false ||
    (eventSettings?.votingStartsAt && eventSettings.votingStartsAt > now) ||
    (eventSettings?.votingEndsAt && eventSettings.votingEndsAt <= now)
  ) {
    return NextResponse.json({ error: "Voting is currently closed." }, { status: 403 });
  }

  const nominee = await prisma.nominee.findFirst({
    where: {
      id: nomineeId,
      isActive: true,
      isApproved: true,
      category: { isActive: true, votingOpen: true },
    },
    include: { category: { select: { id: true, name: true } } },
  });

  if (!nominee) {
    return NextResponse.json(
      { error: "Nominee not found or category voting is currently paused." },
      { status: 404 }
    );
  }

  const transactionId = crypto.randomUUID();

  // Create pending vote transaction
  await prisma.voteTransaction.create({
    data: {
      id: transactionId,
      phoneNumber: `${email} (Card)`,
      nomineeId: nominee.id,
      categoryId: nominee.categoryId,
      numberOfVotes: pricing.numberOfVotes,
      amountPaid: pricing.amountUsd, // Store USD dollars (e.g. 4)
      status: "PENDING",
      transactionId,
    },
  });

  try {
    const result = await initiatePaystackTransaction({
      email,
      numberOfVotes: pricing.numberOfVotes,
      nomineeId: nominee.id,
      nomineeName: nominee.stageName || nominee.fullName,
      categoryId: nominee.category.id,
      categoryName: nominee.category.name,
      reference: transactionId,
    });

    return NextResponse.json(
      {
        authorizationUrl: result.authorizationUrl,
        reference: result.reference,
        amountUsd: pricing.amountUsd,
        numberOfVotes: pricing.numberOfVotes,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Paystack initiation failed:", err);
    await prisma.voteTransaction.update({
      where: { id: transactionId },
      data: { status: "FAILED" },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not initialize card checkout." },
      { status: 502 }
    );
  }
}
