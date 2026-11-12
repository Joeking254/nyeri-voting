"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Share2 } from "lucide-react";
import { VotingModal } from "@/components/voting-modal";
import type { NomineeCardData } from "@/components/nominee-card";

type Props = { nominee: NomineeCardData; votePrice: number; votingOpen: boolean };

export function ProfileVoteActions({ nominee, votePrice, votingOpen }: Props) {
  const [voting, setVoting] = useState(false);
  const [copied, setCopied] = useState(false);
  const displayName = nominee.stageName || nominee.fullName;

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: displayName, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!votingOpen}
          onClick={() => setVoting(true)}
          className="flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 px-6 text-sm font-bold text-white shadow-md shadow-sky-600/20 transition-all hover:scale-[1.02] hover:from-sky-700 hover:to-sky-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>{votingOpen ? `Vote for ${displayName} · KES ${votePrice}` : "Voting is Closed"}</span>
          <ArrowUpRight className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => void share()}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {copied ? (
            <>
              <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>Link Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="size-4" />
              <span>Share Profile</span>
            </>
          )}
        </button>
      </div>

      {voting && <VotingModal nominee={nominee} votePrice={votePrice} onClose={() => setVoting(false)} />}
    </>
  );
}
