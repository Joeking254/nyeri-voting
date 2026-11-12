import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { claimPaymentAndIncrementVotes } from "@/lib/vote-counts";

export const runtime = "nodejs";

interface DarajaCallbackBody {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: {
        Item?: Array<{ Name?: string; Value?: string | number }>;
      };
    };
  };
}

interface PayHeroCallbackBody {
  Status?: string;
  status?: string;
  ResultCode?: number;
  result_code?: number;
  ExternalReference?: string;
  external_reference?: string;
  CheckoutRequestID?: string;
  checkout_request_id?: string;
  MpesaReceiptNumber?: string;
  mpesa_receipt_number?: string;
  payment_reference?: string;
  Amount?: number;
  amount?: number;
  Phone?: string | number;
  PhoneNumber?: string | number;
  response?: PayHeroCallbackBody;
}

type CombinedCallbackPayload = DarajaCallbackBody & PayHeroCallbackBody;

function callbackValue(items: Array<{ Name?: string; Value?: string | number }>, name: string) {
  return items.find((item) => item.Name === name)?.Value;
}

function isAuthorizedCallback(request: Request): boolean {
  const expectedToken =
    process.env.MPESA_CALLBACK_TOKEN || process.env.PAYHERO_CALLBACK_TOKEN;
  const providedToken = new URL(request.url).searchParams.get("token");
  if (!expectedToken || expectedToken.length < 16 || !providedToken) return false;
  const expected = Buffer.from(expectedToken, "utf8");
  const provided = Buffer.from(providedToken, "utf8");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export async function GET(request: Request) {
  if (!isAuthorizedCallback(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isAuthorizedCallback(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 32_768) return NextResponse.json({ error: "Callback payload is too large" }, { status: 413 });

  let payload: CombinedCallbackPayload;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > 32_768) return NextResponse.json({ error: "Callback payload is too large" }, { status: 413 });
    payload = JSON.parse(body) as CombinedCallbackPayload;
  } catch {
    return NextResponse.json({ error: "Invalid callback JSON" }, { status: 400 });
  }

  // Handle PayHero callback if sent to this endpoint
  const hasPayheroFields = Boolean(
    payload.response ||
      payload.ExternalReference ||
      payload.external_reference ||
      (payload.Status && !payload.Body)
  );

  if (hasPayheroFields) {
    const payheroData: PayHeroCallbackBody = payload.response || payload;
    const isSuccess =
      (payheroData.Status || payheroData.status || "").toUpperCase() === "SUCCESS" ||
      payheroData.ResultCode === 0;
    const externalRef = payheroData.ExternalReference || payheroData.external_reference;
    const checkoutReqId = payheroData.CheckoutRequestID || payheroData.checkout_request_id;

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
    if (!transaction && checkoutReqId) {
      transaction = await prisma.voteTransaction.findUnique({
        where: { transactionId: checkoutReqId },
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

    if (!transaction || transaction.status !== "PENDING") {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    if (!isSuccess) {
      await prisma.voteTransaction.updateMany({
        where: { id: transaction.id, status: "PENDING" },
        data: { status: "FAILED" },
      });
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const receipt =
      payheroData.MpesaReceiptNumber ||
      payheroData.mpesa_receipt_number ||
      payheroData.payment_reference ||
      `PH-${Date.now()}-${transaction.id.slice(0, 6)}`;

    try {
      await prisma.$transaction(async (database) => {
        await claimPaymentAndIncrementVotes(database, {
          transactionId: transaction.id,
          checkoutRequestId: checkoutReqId || transaction.transactionId || undefined,
          nomineeId: transaction.nomineeId,
          categoryId: transaction.categoryId,
          numberOfVotes: transaction.numberOfVotes,
          receiptNumber: receipt,
        });
      });
    } catch (error) {
      console.error("PayHero callback processing failed in mpesa endpoint", error);
      return NextResponse.json({ error: "Callback processing failed" }, { status: 500 });
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  // Handle standard Safaricom Daraja callback
  const callback = payload.Body?.stkCallback;
  const checkoutRequestId = callback?.CheckoutRequestID;
  if (!callback || !checkoutRequestId || typeof callback.ResultCode !== "number") {
    return NextResponse.json({ error: "Malformed callback" }, { status: 400 });
  }

  const transaction = await prisma.voteTransaction.findUnique({
    where: { transactionId: checkoutRequestId },
    select: {
      id: true,
      status: true,
      phoneNumber: true,
      nomineeId: true,
      categoryId: true,
      numberOfVotes: true,
      amountPaid: true,
      merchantRequestId: true,
    },
  });

  // Acknowledge unknown or already processed callbacks without changing vote counts.
  if (!transaction || transaction.status !== "PENDING") {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
  if (callback.MerchantRequestID && transaction.merchantRequestId && callback.MerchantRequestID !== transaction.merchantRequestId) {
    return NextResponse.json({ error: "Merchant request mismatch" }, { status: 400 });
  }

  if (callback.ResultCode !== 0) {
    await prisma.voteTransaction.updateMany({
      where: { id: transaction.id, status: "PENDING" },
      data: { status: "FAILED" },
    });
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  const items = callback.CallbackMetadata?.Item ?? [];
  const receipt = callbackValue(items, "MpesaReceiptNumber");
  const paidAmount = callbackValue(items, "Amount");
  const paidPhone = callbackValue(items, "PhoneNumber");
  const normalizedPhone =
    typeof paidPhone === "number" || typeof paidPhone === "string" ? String(paidPhone) : "";
  if (
    typeof receipt !== "string" ||
    !receipt.trim() ||
    Number(paidAmount) !== transaction.amountPaid ||
    normalizedPhone !== transaction.phoneNumber
  ) {
    return NextResponse.json({ error: "Payment details do not match pending transaction" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (database) => {
      await claimPaymentAndIncrementVotes(database, {
        transactionId: transaction.id,
        checkoutRequestId,
        nomineeId: transaction.nomineeId,
        categoryId: transaction.categoryId,
        numberOfVotes: transaction.numberOfVotes,
        receiptNumber: receipt,
      });
    });
  } catch (error) {
    console.error("M-Pesa callback processing failed", error);
    return NextResponse.json({ error: "Callback processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
