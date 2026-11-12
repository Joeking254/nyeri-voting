import { prisma } from "@/lib/prisma";
import { PublicPageShell } from "@/components/public-page-shell";

export const dynamic = "force-dynamic";
const tierOrder = ["title", "gold", "silver", "supporting"];
const tierLabel: Record<string, string> = { title: "Title Sponsor", gold: "Gold Sponsor", silver: "Silver Sponsor", supporting: "Supporting Partner" };

export default async function SponsorsPage() {
  const sponsors = await prisma.sponsor.findMany({ where: { isActive: true }, orderBy: { orderIndex: "asc" } }).catch(() => []);
  const tiers = tierOrder.map((tier) => ({ tier, sponsors: sponsors.filter((sponsor) => sponsor.tier === tier) })).filter((group) => group.sponsors.length);
  return <PublicPageShell eyebrow="Partners" title="Sponsors and partners" description="Thank you to the organizations supporting Nyeri's creative community.">{tiers.length ? <div className="space-y-8">{tiers.map((group) => <section key={group.tier}><h2 className="mb-3 text-lg font-bold text-slate-900">{tierLabel[group.tier]}</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{group.sponsors.map((sponsor) => <article key={sponsor.id} className="rounded-xl border border-slate-200 bg-white p-5">{sponsor.websiteUrl ? <a href={sponsor.websiteUrl} target="_blank" rel="noreferrer" aria-label={`Visit ${sponsor.name}`}><img src={sponsor.logoUrl} alt={sponsor.name} className="h-16 max-w-48 object-contain object-left" /></a> : <img src={sponsor.logoUrl} alt={sponsor.name} className="h-16 max-w-48 object-contain object-left" />}<h3 className="mt-4 font-semibold text-slate-900">{sponsor.name}</h3>{sponsor.description && <p className="mt-1 text-sm leading-6 text-slate-600">{sponsor.description}</p>}</article>)}</div></section>)}</div> : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">Sponsors will be announced soon.</p>}</PublicPageShell>;
}
