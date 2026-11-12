import { PublicPageShell } from "@/components/public-page-shell";

export default function TermsPage() {
  return <PublicPageShell eyebrow="Platform terms" title="Terms and conditions"><div className="space-y-4 text-sm leading-7 text-slate-700"><p>By using this platform, you agree to follow the published voting rules and use the payment flow only for legitimate votes.</p><p>Payments are processed by Safaricom Daraja. A successful M-Pesa charge is recorded as a vote only after the platform verifies the callback against the pending transaction.</p><p>The organizers may suspend voting, review suspicious activity, correct verified technical errors through an audited process, and publish final results after reconciliation.</p><p>Information on this site may change as the organizers update award categories, schedules, and event announcements.</p></div></PublicPageShell>;
}
