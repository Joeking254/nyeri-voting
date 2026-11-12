"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, LoaderCircle, ShieldCheck, Smartphone, X } from "lucide-react";
import type { NomineeCardData } from "@/components/nominee-card";
import { normalizePhoneNumber, useMpesaVote } from "@/hooks/useMpesaVote";

type VotingModalProps = {
  nominee: NomineeCardData;
  onClose: () => void;
  votePrice: number;
};

const presets = [1, 5, 10, 25];

function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 12);
  if (digits.startsWith("254")) {
    const subscriber = digits.slice(3);
    return ["254", subscriber.slice(0, 3), subscriber.slice(3, 6), subscriber.slice(6, 9)]
      .filter(Boolean)
      .join(" ");
  }
  return [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 10)].filter(Boolean).join(" ");
}

export function VotingModal({ nominee, onClose, votePrice }: VotingModalProps) {
  const router = useRouter();
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customQuantity, setCustomQuantity] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const { state, startVote, reset } = useMpesaVote();

  const amount = quantity * votePrice;
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const phoneError = phoneTouched && (!phoneNumber || !normalizedPhone);

  const isBusy = state.status === "sending" || state.status === "polling";
  const displayName = nominee.stageName || nominee.fullName;

  // Lock body scroll while modal is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Listen for Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isBusy) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBusy, onClose]);

  // Refresh server-rendered counts on successful vote
  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [state.status, router]);

  function voteAgain() {
    reset();
    setPhoneNumber("");
    setPhoneTouched(false);
    setQuantity(1);
    setCustomQuantity(false);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPhoneTouched(true);
    if (!normalizedPhone) {
      phoneInputRef.current?.focus();
      return;
    }
    void startVote({ nomineeId: nominee.id, phoneNumber: normalizedPhone, numberOfVotes: quantity });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vote-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3.5 backdrop-blur-sm sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isBusy) {
          onClose();
        }
      }}
    >
      <div
        className="relative max-h-[calc(100dvh-24px)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-white sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Creator Header Card */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-3">
            {nominee.photoUrl ? (
              <img
                src={nominee.photoUrl}
                alt=""
                className="size-14 shrink-0 rounded-xl object-cover"
                style={{
                  objectPosition:
                    nominee.photoPosition === "bottom"
                      ? "center bottom"
                      : nominee.photoPosition === "center"
                      ? "center 20%"
                      : "center top",
                }}
              />
            ) : (
              <span
                className="grid size-14 shrink-0 place-items-center rounded-xl bg-slate-100 text-2xl font-bold text-slate-400 dark:bg-slate-800"
                aria-hidden="true"
              >
                {displayName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <span className="inline-block rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-400/10 dark:text-amber-300">
                {nominee.category}
              </span>
              <h2
                id="vote-dialog-title"
                className="mt-1 truncate text-lg font-bold tracking-tight text-slate-950 dark:text-white"
              >
                {displayName}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Close dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* State: Success */}
        {state.status === "success" ? (
          <section className="py-6 text-center" aria-live="polite">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Check className="size-8" strokeWidth={3} />
            </div>

            <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
              Vote Confirmed!
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              <strong className="font-bold text-slate-900 dark:text-white">
                {state.numberOfVotes} {state.numberOfVotes === 1 ? "vote" : "votes"}
              </strong>{" "}
              credited to{" "}
              <strong className="font-bold text-slate-900 dark:text-white">{displayName}</strong>
            </p>

            {state.receiptNumber && (
              <div className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <span>Receipt:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {state.receiptNumber}
                </span>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                className="min-h-11 w-full rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                onClick={voteAgain}
              >
                Cast More Votes
              </button>
              <button
                type="button"
                className="min-h-10 w-full rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </section>
        ) : state.status === "sending" || state.status === "polling" ? (
          /* State: Sending / Waiting for PIN */
          <section className="py-8 text-center" role="status" aria-live="polite">
            <div className="relative mx-auto flex size-16 items-center justify-center">
              <span className="absolute size-full animate-ping rounded-full bg-emerald-400/20" />
              <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
                <Smartphone className="size-7" />
              </div>
            </div>

            <h3 className="mt-5 text-lg font-extrabold text-slate-950 dark:text-white">
              {state.status === "sending"
                ? "Sending M-Pesa STK Prompt..."
                : "Prompt Sent to Your Handset!"}
            </h3>

            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {state.status === "sending"
                ? "Contacting Safaricom..."
                : "Check your phone screen and enter your M-Pesa PIN to complete payment."}
            </p>

            <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <LoaderCircle className="size-4 animate-spin text-emerald-600 dark:text-emerald-400" />
              <span>Waiting for confirmation (automatic)...</span>
            </div>
          </section>
        ) : (
          /* State: Choose Votes & Enter Phone */
          <form className="mt-5" onSubmit={handleSubmit}>
            {/* Presets Grid */}
            <fieldset>
              <legend className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Select Vote Count
              </legend>
              <div className="mt-2.5 grid grid-cols-4 gap-2">
                {presets.map((value) => {
                  const isSelected = !customQuantity && quantity === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setCustomQuantity(false);
                        setQuantity(value);
                        reset();
                      }}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2.5 transition-all ${
                        isSelected
                          ? "border-sky-600 bg-sky-50 font-bold text-sky-900 shadow-sm dark:border-sky-500 dark:bg-sky-950/60 dark:text-sky-200"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="text-sm font-extrabold">
                        {value} {value === 1 ? "Vote" : "Votes"}
                      </span>
                      <span className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        KES {value * votePrice}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-2">
                <button
                  type="button"
                  aria-pressed={customQuantity}
                  onClick={() => {
                    setCustomQuantity(true);
                    setQuantity(1);
                    reset();
                  }}
                  className={`w-full rounded-xl border py-2 text-xs font-bold transition-all ${
                    customQuantity
                      ? "border-sky-600 bg-sky-50 text-sky-900 dark:border-sky-500 dark:bg-sky-950 dark:text-sky-200"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300"
                  }`}
                >
                  Enter Custom Quantity
                </button>
              </div>
            </fieldset>

            {/* Custom Quantity Input */}
            {customQuantity && (
              <label className="mt-3 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Number of votes:
                <input
                  className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  type="number"
                  min="1"
                  max="214748364"
                  step="1"
                  value={quantity}
                  onChange={(event) => {
                    setQuantity(Math.max(1, Number(event.target.value) || 1));
                    reset();
                  }}
                />
              </label>
            )}

            {/* Total Summary Banner */}
            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-100 p-3.5 dark:bg-slate-800">
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Total Due
                </span>
                <p className="text-xs text-slate-500">
                  {quantity} {quantity === 1 ? "vote" : "votes"} × KES {votePrice}
                </p>
              </div>
              <span className="text-xl font-extrabold tabular-nums text-slate-950 dark:text-white">
                KES {amount.toLocaleString()}
              </span>
            </div>

            {/* Phone Number Input */}
            <div className="mt-4">
              <label
                className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                htmlFor="mpesa-phone"
              >
                <span>M-Pesa Mobile Number</span>
                <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">
                  Safaricom / Airtel
                </span>
              </label>
              <div className="relative mt-1.5">
                <input
                  ref={phoneInputRef}
                  id="mpesa-phone"
                  className={`h-12 w-full rounded-xl border px-3.5 text-sm font-semibold tracking-wide text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 focus:ring-2 dark:text-white ${
                    phoneError
                      ? "border-rose-500 bg-rose-50/20 focus:ring-rose-100 dark:border-rose-500 dark:bg-rose-950/20"
                      : "border-slate-300 bg-white focus:border-emerald-600 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800"
                  }`}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0712 345 678 or 0110 123 456"
                  value={phoneNumber}
                  onChange={(event) => {
                    setPhoneNumber(formatPhoneInput(event.target.value));
                    if (phoneTouched) setPhoneTouched(false);
                  }}
                  onBlur={() => setPhoneTouched(true)}
                  aria-invalid={phoneError}
                />
              </div>
              <p
                className={`mt-1.5 text-xs ${
                  phoneError ? "font-semibold text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {phoneError
                  ? "Please enter a valid Kenyan mobile number (e.g. 07XXXXXXXX or 01XXXXXXXX)."
                  : "We'll send an instant STK prompt to this phone."}
              </p>
            </div>

            {/* Error Banner */}
            {state.status === "error" && (
              <div
                className="mt-4 flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200"
                role="alert"
              >
                <AlertCircle className="size-4 shrink-0 text-rose-600" />
                <p>{state.message}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
              type="submit"
            >
              <span>Pay KES {amount.toLocaleString()} with M-Pesa</span>
            </button>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              <span>Safe & secure encrypted checkout</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
