"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MpesaVoteState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "polling"; transactionId: string }
  | { status: "success"; transactionId: string; receiptNumber: string | null; numberOfVotes: number; amountPaid: number }
  | { status: "error"; message: string; transactionId?: string };

type StartVoteInput = { nomineeId: string; phoneNumber: string; numberOfVotes: number };
type StatusResponse = {
  status?: "PENDING" | "SUCCESS" | "FAILED";
  receiptNumber?: string | null;
  numberOfVotes?: number;
  amountPaid?: number;
  error?: string;
};

export function normalizePhoneNumber(value: string): string | null {
  const digits = value.replace(/[\s+()-]/g, "");
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  return null;
}

const wait = (milliseconds: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Request cancelled", "AbortError"));
      return;
    }
    const onAbort = () => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
      reject(new DOMException("Request cancelled", "AbortError"));
    };
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", onAbort, { once: true });
  });

export function useMpesaVote() {
  const [state, setState] = useState<MpesaVoteState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState({ status: "idle" });
  }, []);

  const startVote = useCallback(async ({ nomineeId, phoneNumber, numberOfVotes }: StartVoteInput) => {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      setState({ status: "error", message: "Enter a valid mobile number, such as 0712 345 678 or 0110 123 456." });
      return;
    }
    if (!Number.isSafeInteger(numberOfVotes) || numberOfVotes < 1 || numberOfVotes > 214_748_364) {
      setState({ status: "error", message: "Choose a valid number of votes." });
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "sending" });

    try {
      const initiateResponse = await fetch("/api/votes/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomineeId, phoneNumber: normalizedPhone, numberOfVotes }),
        signal: controller.signal,
      });
      const initiated = (await initiateResponse.json()) as { transactionId?: string; error?: string };
      if (!initiateResponse.ok || !initiated.transactionId) {
        throw new Error(initiated.error || "We could not start the M-Pesa request. Please try again.");
      }

      const transactionId = initiated.transactionId;
      setState({ status: "polling", transactionId });
      const deadline = Date.now() + 180_000;

      while (Date.now() < deadline) {
        await wait(3_000, controller.signal);
        const statusResponse = await fetch(`/api/votes/${encodeURIComponent(transactionId)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = (await statusResponse.json()) as StatusResponse;
        if (!statusResponse.ok) throw new Error(result.error || "Unable to check payment status.");
        if (result.status === "SUCCESS") {
          setState({
            status: "success",
            transactionId,
            receiptNumber: result.receiptNumber ?? null,
            numberOfVotes: result.numberOfVotes ?? numberOfVotes,
            amountPaid: result.amountPaid ?? numberOfVotes * 10,
          });
          return;
        }
        if (result.status === "FAILED") {
          setState({ status: "error", transactionId, message: "The payment was cancelled or could not be completed. No votes were added." });
          return;
        }
      }

      setState({ status: "error", transactionId, message: "This payment is still pending. If you completed the prompt, allow a little longer for confirmation." });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState({ status: "error", message: error instanceof Error ? error.message : "Something went wrong. Please try again." });
    }
  }, []);

  return { state, startVote, reset };
}
