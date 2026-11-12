import { initiateMpesaStkPush } from "@/lib/mpesa";
import {
  initiatePayHeroStkPush,
  isPayHeroConfigured,
  normalizeKenyanPhone,
} from "@/lib/payhero";

export { normalizeKenyanPhone };

export type PaymentProvider = "payhero" | "daraja";

export function getActivePaymentProvider(): PaymentProvider {
  const configuredProvider = process.env.PAYMENT_PROVIDER?.toLowerCase().trim();
  if (configuredProvider === "daraja") {
    return "daraja";
  }
  if (configuredProvider === "payhero") {
    return "payhero";
  }
  if (isPayHeroConfigured()) {
    return "payhero";
  }
  return "daraja";
}

export type InitiatePaymentInput = {
  phoneNumber: string;
  amount: number;
  votePrice: number;
  accountReference: string;
  customerName?: string;
};

export type InitiatePaymentResult = {
  checkoutRequestId: string;
  merchantRequestId?: string;
  provider: PaymentProvider;
};

export async function initiatePayment(
  input: InitiatePaymentInput
): Promise<InitiatePaymentResult> {
  const provider = getActivePaymentProvider();

  if (provider === "payhero") {
    const result = await initiatePayHeroStkPush({
      phoneNumber: input.phoneNumber,
      amount: input.amount,
      votePrice: input.votePrice,
      accountReference: input.accountReference,
      customerName: input.customerName,
    });
    return {
      checkoutRequestId: result.checkoutRequestId,
      merchantRequestId: result.merchantRequestId,
      provider: "payhero",
    };
  }

  const result = await initiateMpesaStkPush({
    phoneNumber: input.phoneNumber,
    amount: input.amount,
    votePrice: input.votePrice,
    accountReference: input.accountReference,
  });

  return {
    checkoutRequestId: result.checkoutRequestId,
    merchantRequestId: result.merchantRequestId,
    provider: "daraja",
  };
}
