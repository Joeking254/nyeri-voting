import Link from "next/link";
import { PublicPageShell } from "@/components/public-page-shell";

export default function AboutPage() {
  return <PublicPageShell eyebrow="About the awards" title="Celebrating Nyeri's creative voices" description="The Nyeri Content Creators Awards recognize the people telling our stories, building community, and shaping culture through digital creativity."><div className="space-y-5 text-sm leading-7 text-slate-700"><p>The People&apos;s Choice awards give the community a chance to recognize content creators, videographers, photographers, digital influencers, and other creative professionals connected to Nyeri County.</p><p>Nominees are organized by category. Public votes are recorded only after the associated M-Pesa payment has been verified by the awards platform.</p><Link className="inline-flex min-h-11 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800" href="/">Explore nominees</Link></div></PublicPageShell>;
}
