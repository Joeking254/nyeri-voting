import { PublicPageShell } from "@/components/public-page-shell";

export default function VotingRulesPage() {
  return <PublicPageShell eyebrow="Official rules" title="Voting rules"><div className="space-y-4 text-sm leading-7 text-slate-700"><p>Each paid vote is KES 10 by default; the current price is shown before you confirm an M-Pesa request. The event may change the price or close voting through its official settings.</p><p>A vote is recorded only after a verified Safaricom Daraja payment callback. A pending, failed, cancelled, or timed-out payment does not add votes.</p><p>Do not attempt to automate requests, interfere with payment callbacks, or submit fraudulent transactions. Rate limits and payment verification are applied to protect voters and nominees.</p><p>Published standings may be hidden or delayed by the organizers. Final results are subject to payment reconciliation and official publication.</p></div></PublicPageShell>;
}
