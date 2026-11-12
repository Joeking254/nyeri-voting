import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthorizedPayHeroCallback } from "@/lib/payhero";
import { claimPaymentAndIncrementVotes } from "@/lib/vote-counts";

export const runtime = "nodejs";

export interface PayHeroData {
  Status?: string;
  status?: string;
  ResultCode?: number;
  result_code?: number;
  ResultDesc?: string;
  result_desc?: string;
  CheckoutRequestID?: string;
  checkout_request_id?: string;
  MerchantRequestID?: string;
  merchant_request_id?: string;
  ExternalReference?: string;
  external_reference?: string;
  Amount?: number;
  amount?: number;
  MpesaReceiptNumber?: string;
  mpesa_receipt_number?: string;
  payment_reference?: string;
  provider_reference?: string;
  Phone?: string | number;
  phone?: string | number;
  PhoneNumber?: string | number;
  phone_number?: string | number;
  success?: boolean;
  reference?: string;
}

export interface PayHeroCallbackPayload extends PayHeroData {
  forward_url?: string;
  response?: PayHeroData;
}

export async function GET(request: Request) {
  if (!isAuthorizedPayHeroCallback(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!isAuthorizedPayHeroCallback(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 32_768) {
    return NextResponse.json({ error: "Callback payload is too large" }, { status: 413 });
  }

  let payload: PayHeroCallbackPayload;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > 32_768) {
      return NextResponse.json({ error: "Callback payload is too large" }, { status: 413 });
    }
    payload = JSON.parse(body) as PayHeroCallbackPayload;
  } catch {
    return NextResponse.json({ error: "Invalid callback JSON" }, { status: 400 });
  }

  const data: PayHeroData = payload.response || payload;

  const rawStatus = (data.Status || data.status || "").toUpperCase();
  const resultCode = data.ResultCode ?? data.result_code;
  const isSuccess =
    rawStatus === "SUCCESS" ||
    resultCode === 0 ||
    data.success === true;

  const externalRef =
    data.ExternalReference ||
    data.external_reference ||
    payload.ExternalReference ||
    payload.external_reference;

  const checkoutRequestId =
    data.CheckoutRequestID ||
    data.checkout_request_id ||
    payload.CheckoutRequestID;

  const reference = data.reference || payload.reference;

  // Locate the transaction by externalReference (our UUID) or checkoutRequestId or reference
  let transaction = null;

  if (externalRef) {
    transaction = await prisma.voteTransaction.findUnique({
      where: { id: externalRef },
      select: {
        id: true,
        status: true,
        phoneNumber: true,
        nomineeId: true,
        categoryId: true,
        numberOfVotes: true,
        amountPaid: true,
        transactionId: true,
      },
    });
  }

  if (!transaction && checkoutRequestId) {
    transaction = await prisma.voteTransaction.findUnique({
      where: { transactionId: checkoutRequestId },
      select: {
        id: true,
        status: true,
        phoneNumber: true,
        nomineeId: true,
        categoryId: true,
        numberOfVotes: true,
        amountPaid: true,
        transactionId: true,
      },
    });
  }

  if (!transaction && reference) {
    transaction = await prisma.voteTransaction.findFirst({
      where: {
        OR: [
          { transactionId: reference },
          { merchantRequestId: reference },
        ],
      },
      select: {
        id: true,
        status: true,
        phoneNumber: true,
        nomineeId: true,
        categoryId: true,
        numberOfVotes: true,
        amountPaid: true,
        transactionId: true,
      },
    });
  }

  // Acknowledge unknown or already processed callbacks without failing PayHero's webhook
  if (!transaction || transaction.status !== "PENDING") {
    return NextResponse.json({
      status: "success",
      message: "Transaction already processed or not found",
    });
  }

  if (!isSuccess) {
    await prisma.voteTransaction.updateMany({
      where: { id: transaction.id, status: "PENDING" },
      data: { status: "FAILED" },
    });
    return NextResponse.json({
      status: "success",
      message: "Transaction marked as failed",
    });
  }

  const receipt =
    data.provider_reference ||
    data.payment_reference ||
    data.MpesaReceiptNumber ||
    data.mpesa_receipt_number;

  if (!receipt) {
    console.error("PayHero callback indicated success but has no authentic M-Pesa receipt number");
    return NextResponse.json({
      status: "error",
      message: "Missing authentic M-Pesa receipt number",
    }, { status: 400 });
  }

  const paidAmount = Number(data.Amount ?? data.amount);
  if (paidAmount && paidAmount !== transaction.amountPaid) {
    console.warn(
      `Amount mismatch for transaction ${transaction.id}: paid ${paidAmount}, expected ${transaction.amountPaid}`
    );
  }

  try {
    await prisma.$transaction(async (database) => {
      await claimPaymentAndIncrementVotes(database, {
        transactionId: transaction.id,
        checkoutRequestId: checkoutRequestId || transaction.transactionId || undefined,
        nomineeId: transaction.nomineeId,
        categoryId: transaction.categoryId,
        numberOfVotes: transaction.numberOfVotes,
        receiptNumber: receipt,
      });
    });
  } catch (error) {
    console.error("PayHero callback processing failed", error);
    return NextResponse.json({ error: "Callback processing failed" }, { status: 500 });
  }

  return NextResponse.json({
    status: "success",
    message: "Votes successfully recorded",
  });
}
