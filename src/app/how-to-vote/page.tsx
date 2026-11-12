import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PublicPageShell } from "@/components/public-page-shell";
import { ArrowRight, CheckCircle2, ShieldAlert, ShieldCheck, Smartphone, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HowToVotePage() {
  const settings = await prisma.eventSettings.findUnique({ where: { id: "global" } }).catch(() => null);
  const price = settings?.votePrice ?? 10;

  const steps = [
    {
      title: "Discover Your Nominee",
      desc: "Browse through the award categories and locate your favorite content creator, videographer, photographer, or influencer.",
      icon: Trophy,
    },
    {
      title: "Choose Vote Quantity",
      desc: `Select how many votes to cast (1, 5, 10, or custom). The cost is KES ${price} per vote and calculated upfront.`,
      icon: CheckCircle2,
    },
    {
      title: "Enter Mobile Number",
      desc: "Provide your Safaricom or Airtel M-Pesa phone number (07... or 01...). Click Pay to trigger the STK Push prompt.",
      icon: Smartphone,
    },
    {
      title: "Enter PIN on Your Handset",
      desc: "An instant M-Pesa prompt appears on your phone screen. Enter your secret M-Pesa PIN. As soon as payment completes, votes are added immediately.",
      icon: ShieldCheck,
    },
  ];

  return (
    <PublicPageShell
      eyebrow="Voter Guide"
      title="How to Vote via M-Pesa"
      description={`Voting is 100% digital, transparent, and direct. Each vote costs KES ${price}, and tallies update instantly upon M-Pesa confirmation.`}
    >
      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              className="flex items-start gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Step {index + 1}
                  </span>
                </div>
                <h2 className="mt-0.5 text-base font-bold text-slate-950 dark:text-white">
                  {step.title}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Safety Notice */}
      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
        <ShieldAlert className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="text-xs leading-relaxed">
          <strong className="font-bold">Security Reminder: </strong>
          <span>
            Only enter your M-Pesa PIN into the official Safaricom pop-up prompt on your personal mobile device. The awards organizers, nominees, and platform staff will NEVER ask for your PIN, password, or verification code.
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Link
          href="/#nominees"
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 text-sm font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500"
        >
          <span>Explore Nominees & Vote</span>
          <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/leaderboard"
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <span>View Current Leaderboard</span>
        </Link>
      </div>
    </PublicPageShell>
  );
}
