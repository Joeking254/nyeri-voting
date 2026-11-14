import { createHmac, timingSafeEqual } from "node:crypto";

export const PAYSTACK_MIN_USD = 2;
export const USD_PER_VOTE = 0.08; // 25 votes = $2.00

export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export function getPaystackSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("Missing PAYSTACK_SECRET_KEY environment variable.");
  }
  return key.trim();
}

export function getPaystackPublicKey(): string {
  return (
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
    process.env.PAYSTACK_PUBLIC_KEY ||
    ""
  ).trim();
}

export function getPaystackCurrency(): string {
  return (process.env.PAYSTACK_CURRENCY || "KES").toUpperCase().trim();
}

export function calculatePaystackAmount(numberOfVotes: number): {
  numberOfVotes: number;
  amountUsd: number;
  amountSubunit: number; // in cents (e.g. 200 for $2)
  currency: string;
} {
  const currency = getPaystackCurrency();
  // Ensure minimum is 25 votes ($2.00)
  const votes = Math.max(25, Number.isSafeInteger(numberOfVotes) ? numberOfVotes : 25);
  const amountUsd = Math.max(PAYSTACK_MIN_USD, Number((votes * USD_PER_VOTE).toFixed(2)));

  // If currency is USD, subunit is cents (1 USD = 100 cents)
  // If currency is KES, approximately 1 USD ~ 130 KES, so 1 vote = KES 10, min 25 votes = KES 250 = 25000 cents
  const amountSubunit =
    currency === "USD"
      ? Math.round(amountUsd * 100)
      : Math.round(votes * 10 * 100);

  return {
    numberOfVotes: votes,
    amountUsd,
    amountSubunit,
    currency,
  };
}

export type InitiatePaystackInput = {
  email: string;
  numberOfVotes: number;
  nomineeId: string;
  nomineeName: string;
  categoryId: string;
  categoryName: string;
  reference: string;
  callbackUrl?: string;
};

export type InitiatePaystackResult = {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
};

export async function initiatePaystackTransaction(
  input: InitiatePaystackInput
): Promise<InitiatePaystackResult> {
  const secretKey = getPaystackSecretKey();
  const pricing = calculatePaystackAmount(input.numberOfVotes);

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://13.62.100.156").replace(/\/$/, "");
  const callbackUrl = input.callbackUrl || `${appUrl}/api/paystack/callback`;

  const payload = {
    email: input.email,
    amount: pricing.amountSubunit,
    currency: pricing.currency,
    reference: input.reference,
    callback_url: callbackUrl,
    metadata: {
      transactionId: input.reference,
      nomineeId: input.nomineeId,
      nomineeName: input.nomineeName,
      categoryId: input.categoryId,
      categoryName: input.categoryName,
      numberOfVotes: pricing.numberOfVotes,
      amountUsd: pricing.amountUsd,
      custom_fields: [
        {
          display_name: "Nominee",
          variable_name: "nominee",
          value: input.nomineeName,
        },
        {
          display_name: "Category",
          variable_name: "category",
          value: input.categoryName,
        },
        {
          display_name: "Votes",
          variable_name: "votes",
          value: pricing.numberOfVotes,
        },
      ],
    },
  };

  let response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  let rawText = await response.text();
  let result: {
    status: boolean;
    message?: string;
    code?: string;
    data?: {
      authorization_url: string;
      access_code: string;
      reference: string;
    };
  } | null = null;

  try {
    result = JSON.parse(rawText);
  } catch {
    throw new Error(`Paystack returned invalid response (${response.status}): ${rawText.slice(0, 100)}`);
  }

  // Smart fallback: If merchant integration rejects USD, automatically retry in KES
  if (!response.ok && result?.code === "unsupported_currency" && payload.currency !== "KES") {
    console.log("Paystack merchant requires KES currency, retrying with KES equivalent...");
    payload.currency = "KES";
    payload.amount = Math.round(pricing.numberOfVotes * 10 * 100);
    response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    rawText = await response.text();
    try {
      result = JSON.parse(rawText);
    } catch {
      throw new Error(`Paystack retry returned invalid response (${response.status})`);
    }
  }

  if (!response.ok || !result?.status || !result.data?.authorization_url) {
    console.error("Paystack initialize failed:", response.status, rawText);
    const msg = result?.message || `Paystack initialization failed (HTTP ${response.status})`;
    throw new Error(msg);
  }

  return {
    authorizationUrl: result.data.authorization_url,
    accessCode: result.data.access_code,
    reference: result.data.reference,
  };
}

export type PaystackVerifyData = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  customer?: { email?: string };
  metadata?: {
    transactionId?: string;
    nomineeId?: string;
    categoryId?: string;
    numberOfVotes?: number;
    amountUsd?: number;
  };
};

export async function verifyPaystackTransaction(
  reference: string
): Promise<{ success: boolean; data?: PaystackVerifyData; message?: string }> {
  const secretKey = getPaystackSecretKey();

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    }
  );

  const rawText = await response.text();
  let result: {
    status: boolean;
    message?: string;
    data?: PaystackVerifyData;
  } | null = null;

  try {
    result = JSON.parse(rawText);
  } catch {
    return { success: false, message: `Invalid response from Paystack (${response.status})` };
  }

  if (!response.ok || !result?.status || !result.data) {
    return { success: false, message: result?.message || "Could not verify transaction with Paystack" };
  }

  const isSuccess = result.data.status?.toLowerCase() === "success";
  return {
    success: isSuccess,
    data: result.data,
    message: result.message,
  };
}

export function isAuthorizedPaystackWebhook(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) return false;
  const secretKey = getPaystackSecretKey();
  const computedHash = createHmac("sha512", secretKey).update(rawBody).digest("hex");

  try {
    const signatureBuffer = Buffer.from(signatureHeader, "utf8");
    const hashBuffer = Buffer.from(computedHash, "utf8");
    return (
      signatureBuffer.length === hashBuffer.length &&
      timingSafeEqual(signatureBuffer, hashBuffer)
    );
  } catch {
    return false;
  }
}
