import { timingSafeEqual } from "node:crypto";

const KENYAN_MOBILE = /^(?:254[17]\d{8}|0[17]\d{8})$/;

export function normalizeKenyanPhone(phone: string): string | null {
  const digits = phone.replace(/[\s+()-]/g, "");
  if (!KENYAN_MOBILE.test(digits)) return null;
  return digits.startsWith("0") ? `254${digits.slice(1)}` : digits;
}

export function isPayHeroConfigured(): boolean {
  const hasAuth = Boolean(
    (process.env.PAYHERO_API_USERNAME && process.env.PAYHERO_API_PASSWORD) ||
      process.env.PAYHERO_API_KEY ||
      process.env.PAYHERO_AUTH_TOKEN
  );
  const hasChannel = Boolean(process.env.PAYHERO_CHANNEL_ID);
  return hasAuth && hasChannel;
}

export function getPayHeroAuthHeader(): string {
  const token = process.env.PAYHERO_API_KEY || process.env.PAYHERO_AUTH_TOKEN;
  if (token) {
    return token.startsWith("Basic ") ? token : `Basic ${token}`;
  }
  if (process.env.PAYHERO_API_USERNAME && process.env.PAYHERO_API_PASSWORD) {
    const credentials = `${process.env.PAYHERO_API_USERNAME}:${process.env.PAYHERO_API_PASSWORD}`;
    return `Basic ${Buffer.from(credentials).toString("base64")}`;
  }
  throw new Error(
    "Missing PayHero credentials. Set PAYHERO_API_KEY (or PAYHERO_API_USERNAME and PAYHERO_API_PASSWORD)."
  );
}

export function getPayHeroBaseUrl(): string {
  return (process.env.PAYHERO_BASE_URL || "https://backend.payhero.co.ke").replace(/\/$/, "");
}

export function getPayHeroChannelId(): number {
  const raw = process.env.PAYHERO_CHANNEL_ID;
  const channelId = Number(raw);
  if (!Number.isSafeInteger(channelId) || channelId <= 0) {
    throw new Error(
      "Invalid or missing PAYHERO_CHANNEL_ID. Find your channel ID in the PayHero dashboard."
    );
  }
  return channelId;
}

export function getPayHeroCallbackUrl(): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const callbackUrl = new URL(
    process.env.PAYHERO_CALLBACK_URL || `${appUrl}/api/payhero/callback`
  );
  const token =
    process.env.PAYHERO_CALLBACK_TOKEN ||
    process.env.MPESA_CALLBACK_TOKEN ||
    "payhero-secret-token";

  if (process.env.NODE_ENV === "production" && callbackUrl.protocol !== "https:") {
    throw new Error("PAYHERO_CALLBACK_URL must use HTTPS in production");
  }

  callbackUrl.searchParams.set("token", token);
  return callbackUrl.toString();
}

export function isAuthorizedPayHeroCallback(request: Request): boolean {
  const expectedToken =
    process.env.PAYHERO_CALLBACK_TOKEN || process.env.MPESA_CALLBACK_TOKEN;
  const url = new URL(request.url);
  const providedToken =
    url.searchParams.get("token") ||
    request.headers.get("x-callback-token") ||
    request.headers.get("x-payhero-token");

  // In non-production or if no token was configured in .env, allow
  if (!expectedToken || process.env.NODE_ENV !== "production") {
    if (!providedToken) return true;
  }

  if (!providedToken) return false;
  const expected = Buffer.from(expectedToken, "utf8");
  const provided = Buffer.from(providedToken, "utf8");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export type PayHeroStkPushInput = {
  phoneNumber: string;
  amount: number;
  votePrice: number;
  accountReference: string;
  customerName?: string;
};

export type PayHeroStkPushResult = {
  checkoutRequestId: string;
  merchantRequestId: string;
  reference: string;
};

export async function initiatePayHeroStkPush(
  input: PayHeroStkPushInput
): Promise<PayHeroStkPushResult> {
  const baseUrl = getPayHeroBaseUrl();
  const authHeader = getPayHeroAuthHeader();
  const channelId = getPayHeroChannelId();
  const callbackUrl = getPayHeroCallbackUrl();
  const provider = process.env.PAYHERO_PROVIDER || "m-pesa";

  const payload = {
    amount: input.amount,
    phone_number: input.phoneNumber,
    channel_id: channelId,
    provider,
    external_reference: input.accountReference,
    customer_name: input.customerName || "Awards Voter",
    callback_url: callbackUrl,
  };

  const response = await fetch(`${baseUrl}/api/v2/payments`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  const rawText = await response.text();
  let data: {
    success?: boolean;
    status?: string;
    reference?: string;
    CheckoutRequestID?: string;
    checkout_request_id?: string;
    message?: string;
    error?: string;
    error_message?: string;
    error_code?: string;
  } | null = null;

  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(
      `PayHero returned invalid JSON (${response.status}): ${rawText.slice(0, 200)}`
    );
  }

  if (!response.ok || (data && data.success === false)) {
    console.error("PayHero payment initiation rejected:", response.status, rawText);
    let errorMessage =
      data?.error_message || data?.message || data?.error || `PayHero rejected payment (HTTP ${response.status})`;
    if (
      rawText.toLowerCase().includes("merchant account inactive") ||
      data?.error_code === "permission_denied"
    ) {
      errorMessage = "PayHero merchant account is inactive. Please complete account KYC activation on app.payhero.co.ke to accept live M-Pesa payments.";
    } else if (
      rawText.toLowerCase().includes("insufficient balance") ||
      (data?.error_message && data.error_message.toLowerCase().includes("insufficient balance"))
    ) {
      errorMessage =
        "PayHero Service Wallet is empty (0.00 KES). PayHero requires a small float (e.g. KES 50 or KES 100) in your PayHero Service Wallet to cover STK push dispatch fees. Please top up at app.payhero.co.ke (Wallet → Top Up).";
    }
    throw new Error(errorMessage);
  }

  const checkoutRequestId =
    data?.CheckoutRequestID ||
    data?.checkout_request_id ||
    data?.reference ||
    input.accountReference;

  const reference = data?.reference || checkoutRequestId;

  return {
    checkoutRequestId,
    merchantRequestId: reference,
    reference,
  };
}

export type PayHeroTransactionStatus = {
  status: "SUCCESS" | "FAILED" | "PENDING" | "UNKNOWN";
  receiptNumber?: string | null;
  rawStatus?: string;
  amount?: number;
  phoneNumber?: string;
};

export async function checkPayHeroTransactionStatus(
  reference: string
): Promise<PayHeroTransactionStatus | null> {
  if (!isPayHeroConfigured()) return null;

  try {
    const baseUrl = getPayHeroBaseUrl();
    const authHeader = getPayHeroAuthHeader();

    const url = `${baseUrl}/api/v2/transaction-status?reference=${encodeURIComponent(reference)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      success?: boolean;
      status?: string;
      payment_reference?: string;
      reference?: string;
      third_party_reference?: string;
      amount?: number;
      phone_number?: string;
      phone?: string;
    };

    const statusUpper = (data.status || "").toUpperCase();

    if (statusUpper === "SUCCESS") {
      return {
        status: "SUCCESS",
        receiptNumber: data.payment_reference || null,
        rawStatus: data.status,
        amount: data.amount,
        phoneNumber: data.phone_number || data.phone,
      };
    }

    if (statusUpper === "FAILED" || statusUpper === "CANCELLED") {
      return {
        status: "FAILED",
        rawStatus: data.status,
      };
    }

    if (statusUpper === "QUEUED" || statusUpper === "PENDING") {
      return {
        status: "PENDING",
        rawStatus: data.status,
      };
    }

    return {
      status: "UNKNOWN",
      rawStatus: data.status,
    };
  } catch (error) {
    console.warn("PayHero transaction-status query error:", error);
    return null;
  }
}

export async function topupPayHeroServiceWallet(
  amount: number,
  phoneNumber: string
): Promise<{ success: boolean; message?: string; reference?: string }> {
  const baseUrl = getPayHeroBaseUrl();
  const authHeader = getPayHeroAuthHeader();
  const normalizedPhone = normalizeKenyanPhone(phoneNumber);
  if (!normalizedPhone) {
    throw new Error("Invalid Kenyan phone number. Must be a 10-digit number like 0701969604 or 254701969604.");
  }

  const response = await fetch(`${baseUrl}/api/v2/topup`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(amount),
      phone_number: normalizedPhone,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  const rawText = await response.text();
  let data: any = null;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`PayHero topup error (${response.status}): ${rawText}`);
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || data.error_message || `Top-up failed (${response.status})`);
  }

  return data;
}
