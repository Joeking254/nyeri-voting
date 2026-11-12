const KENYAN_MOBILE = /^(?:254[17]\d{8}|0[17]\d{8})$/;

export function normalizeKenyanPhone(phone: string): string | null {
  const value = phone.replace(/[\s+()-]/g, "");
  if (!KENYAN_MOBILE.test(value)) return null;
  return value.startsWith("0") ? `254${value.slice(1)}` : value;
}

function getNairobiTimestamp(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function initiateMpesaStkPush(input: {
  phoneNumber: string;
  amount: number;
  votePrice: number;
  accountReference: string;
}): Promise<{ checkoutRequestId: string; merchantRequestId: string }> {
  const baseUrl = requiredEnv("MPESA_BASE_URL").replace(/\/$/, "");
  const consumerKey = requiredEnv("MPESA_CONSUMER_KEY");
  const consumerSecret = requiredEnv("MPESA_CONSUMER_SECRET");
  const shortcode = requiredEnv("MPESA_SHORTCODE");
  const passkey = requiredEnv("MPESA_PASSKEY");
  const timestamp = getNairobiTimestamp();
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

  const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`,
    },
    cache: "no-store",
  });
  if (!tokenResponse.ok) throw new Error("Daraja access token request failed");
  const tokenData = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenData.access_token) throw new Error("Daraja did not return an access token");

  const callbackToken = requiredEnv("MPESA_CALLBACK_TOKEN");
  const appUrl = requiredEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");
  const callbackUrl = new URL(process.env.MPESA_CALLBACK_URL || `${appUrl}/api/mpesa/callback`);
  if (process.env.NODE_ENV === "production" && callbackUrl.protocol !== "https:") {
    throw new Error("MPESA_CALLBACK_URL must use HTTPS in production");
  }
  const configuredToken = callbackUrl.searchParams.get("token");
  if (configuredToken && configuredToken !== callbackToken) throw new Error("MPESA_CALLBACK_URL token does not match MPESA_CALLBACK_TOKEN");
  callbackUrl.searchParams.set("token", callbackToken);
  const transactionType = process.env.MPESA_TRANSACTION_TYPE || "CustomerPayBillOnline";

  const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: transactionType,
      Amount: input.amount,
      PartyA: input.phoneNumber,
      PartyB: shortcode,
      PhoneNumber: input.phoneNumber,
      CallBackURL: callbackUrl.toString(),
      AccountReference: input.accountReference,
      TransactionDesc: `Nyeri award vote x${input.amount / input.votePrice}`,
    }),
    cache: "no-store",
  });

  const stkData = (await stkResponse.json().catch(() => null)) as
    | { ResponseCode?: string; CheckoutRequestID?: string; MerchantRequestID?: string }
    | null;
  if (!stkResponse.ok || stkData?.ResponseCode !== "0" || !stkData.CheckoutRequestID || !stkData.MerchantRequestID) {
    throw new Error("Daraja rejected the STK Push request");
  }

  return {
    checkoutRequestId: stkData.CheckoutRequestID,
    merchantRequestId: stkData.MerchantRequestID,
  };
}
