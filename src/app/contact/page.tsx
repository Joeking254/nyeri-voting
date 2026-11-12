import { PublicPageShell } from "@/components/public-page-shell";

export const dynamic = "force-dynamic";

export default function ContactPage() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE;
  return <PublicPageShell eyebrow="Get in touch" title="Contact the awards team" description="For nominee, event, or payment support, contact the organizers using the official channels below."><div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-700">Please include your M-Pesa receipt number when asking about a payment. Never send your PIN.</p><div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-sky-700">{email ? <a href={`mailto:${email}`}>{email}</a> : <span className="text-slate-500">Organizer email will be published soon.</span>}{phone && <a href={`tel:${phone}`}>{phone}</a>}</div></div></PublicPageShell>;
}
