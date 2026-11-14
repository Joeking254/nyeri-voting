import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { NomineeMediaStage } from "@/components/nominee-media-stage";
import { ProfileVoteActions } from "@/components/profile-vote-actions";
import { prisma } from "@/lib/prisma";
import { CheckCircle2, ChevronRight, ExternalLink, MapPin, ShieldCheck, Trophy, Users } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ vote_status?: string; votes?: string; receipt?: string }>;
};

function safeSocialLinks(value: unknown): Array<[string, string]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([name, link]) => {
    if (typeof link !== "string") return [];
    try {
      const url = new URL(link);
      return url.protocol === "https:" ? [[name, url.toString()] as [string, string]] : [];
    } catch {
      return [];
    }
  });
}

export default async function NomineeProfilePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const search = searchParams ? await searchParams : {};
  const nominee = await prisma.nominee.findFirst({
    where: { slug, isActive: true, isApproved: true, category: { isActive: true } },
    include: { category: { select: { id: true, name: true, votingOpen: true } } },
  });
  if (!nominee) notFound();

  const settings = await prisma.eventSettings.findUnique({ where: { id: "global" } });
  const now = new Date();
  const votingOpen =
    (settings?.votingOpen ?? true) &&
    nominee.category.votingOpen &&
    (!settings?.votingStartsAt || settings.votingStartsAt <= now) &&
    (!settings?.votingEndsAt || settings.votingEndsAt > now);

  const cardData = {
    id: nominee.id,
    slug: nominee.slug,
    fullName: nominee.fullName,
    stageName: nominee.stageName,
    bio: nominee.bio,
    location: nominee.location,
    photoUrl: nominee.photoUrl,
    photoPosition: nominee.photoPosition,
    isVerified: nominee.isVerified,
    isFeatured: nominee.isFeatured,
    totalVotes: nominee.totalVotes.toString(),
    category: nominee.category.name,
  };

  const socials = safeSocialLinks(nominee.socialHandles);
  const votePrice = settings?.votePrice ?? 10;
  const displayName = nominee.stageName || nominee.fullName;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <Header />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-slate-900 dark:hover:text-white">Home</Link>
          <ChevronRight className="size-3.5" />
          <Link href="/categories" className="hover:text-slate-900 dark:hover:text-white">Categories</Link>
          <ChevronRight className="size-3.5" />
          <Link href={`/?category=${encodeURIComponent(nominee.category.name)}#nominees`} className="hover:text-slate-900 dark:hover:text-white">
            {nominee.category.name}
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="font-semibold text-slate-900 dark:text-white">{displayName}</span>
        </nav>

        {/* Card Payment Confirmation Banner */}
        {search?.vote_status === "success" && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
            <CheckCircle2 className="size-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-bold">Card Payment Successful!</p>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                {search.votes ? `${search.votes} votes were` : "Your votes were"} credited to {displayName}. Receipt: {search.receipt || "Confirmed"}
              </p>
            </div>
          </div>
        )}

        {/* Profile Showcase Card */}
        <article className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid md:grid-cols-[minmax(320px,0.9fr)_1.1fr]">
            {/* Portrait Media Stage with Automatic Ambient Rendering */}
            <NomineeMediaStage
              photoUrl={nominee.photoUrl}
              displayName={displayName}
              categoryName={nominee.category.name}
              isVerified={nominee.isVerified}
              photoPosition={nominee.photoPosition}
            />

            {/* Profile Information & Actions */}
            <div className="flex flex-col justify-center p-6 sm:p-10">
              <span className="self-start rounded-full bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                {nominee.category.name}
              </span>

              <h1 className="mt-4 font-serif text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                {nominee.fullName}
              </h1>

              {nominee.stageName && nominee.stageName !== nominee.fullName && (
                <p className="mt-1 text-base font-semibold text-sky-700 dark:text-sky-400">
                  @{nominee.stageName.replace(/^@/, "")}
                </p>
              )}

              {nominee.location && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <MapPin className="size-3.5 text-slate-400" />
                  <span>{nominee.location}, Nyeri County</span>
                </p>
              )}

              <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {nominee.bio || "Nominated for outstanding digital creativity and contribution to Nyeri County."}
              </p>

              {/* Social Links */}
              {socials.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2" aria-label="Social media profiles">
                  {socials.map(([name, url]) => (
                    <a
                      key={name}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold capitalize text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <span>{name}</span>
                      <ExternalLink className="size-3 text-slate-400" />
                    </a>
                  ))}
                </div>
              )}

              {/* Vote Actions */}
              <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
                <ProfileVoteActions
                  nominee={cardData}
                  votePrice={votePrice}
                  votingOpen={votingOpen}
                />
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>1 Vote = KES {votePrice}. Instant verification via M-Pesa STK Push.</span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
