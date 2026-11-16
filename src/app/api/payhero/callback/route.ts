import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthorizedPayHeroCallback, checkPayHeroTransactionStatus } from "@/lib/payhero";
import { claimPaymentAndIncrementVotes } from "@/lib/vote-counts";

export const runtime = "nodejs";

export interface PayHeroData {
  Status?: string;
  status?: string | boolean;
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
  third_party_reference?: string;
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
  const isAuthorized = isAuthorizedPayHeroCallback(request);

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

  const data: PayHeroData = (payload.response && typeof payload.response === "object") ? payload.response : payload;

  const rawStatus = (
    typeof data.Status === "string"
      ? data.Status
      : typeof data.status === "string"
        ? data.status
        : ""
  ).toUpperCase();
  const resultCode = data.ResultCode ?? data.result_code;
  const isSuccess =
    rawStatus === "SUCCESS" ||
    resultCode === 0 ||
    data.success === true ||
    data.status === true;

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

  if (externalRef && typeof externalRef === "string") {
    transaction = await prisma.voteTransaction.findUnique({
      where: { id: externalRef.trim() },
      select: {
        id: true,
        status: true,
        phoneNumber: true,
        nomineeId: true,
        categoryId: true,
        numberOfVotes: true,
        amountPaid: true,
        transactionId: true,
        merchantRequestId: true,
      },
    });
  }

  if (!transaction && checkoutRequestId && typeof checkoutRequestId === "string") {
    transaction = await prisma.voteTransaction.findFirst({
      where: {
        OR: [
          { transactionId: checkoutRequestId.trim() },
          { merchantRequestId: checkoutRequestId.trim() },
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
        merchantRequestId: true,
      },
    });
  }

  if (!transaction && reference && typeof reference === "string") {
    transaction = await prisma.voteTransaction.findFirst({
      where: {
        OR: [
          { transactionId: reference.trim() },
          { merchantRequestId: reference.trim() },
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
        merchantRequestId: true,
      },
    });
  }

  // If callback was not authenticated by token parameter, verify with PayHero API
  if (!isAuthorized) {
    if (!transaction) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const verifyRef = reference || transaction.merchantRequestId || transaction.transactionId || transaction.id;
    const verifiedStatus = await checkPayHeroTransactionStatus(verifyRef);
    if (!verifiedStatus || (verifiedStatus.status !== "SUCCESS" && verifiedStatus.status !== "FAILED")) {
      console.warn("Unverified PayHero callback rejected: status check failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
    (typeof data.third_party_reference === "string" && data.third_party_reference.trim()) ||
    (typeof data.provider_reference === "string" && data.provider_reference.trim()) ||
    (typeof data.MpesaReceiptNumber === "string" && data.MpesaReceiptNumber.trim()) ||
    (typeof data.mpesa_receipt_number === "string" && data.mpesa_receipt_number.trim()) ||
    (typeof data.payment_reference === "string" && data.payment_reference.trim()) ||
    (typeof data.reference === "string" && data.reference.trim()) ||
    (typeof checkoutRequestId === "string" && checkoutRequestId.trim()) ||
    `PH-${Date.now()}-${transaction.id.slice(0, 6)}`;

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
        checkoutRequestId: (typeof checkoutRequestId === "string" ? checkoutRequestId : undefined) || transaction.transactionId || undefined,
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
