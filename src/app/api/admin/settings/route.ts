import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const settingsSchema = z.object({
  votingOpen: z.boolean().optional(),
  votePrice: z.number().int().min(1).max(100000).optional(),
  unlimitedVotes: z.boolean().optional(),
  votingStartsAt: z.string().datetime().nullable().optional(),
  votingEndsAt: z.string().datetime().nullable().optional(),
  publicVoteCounts: z.boolean().optional(),
  publicLeaderboard: z.boolean().optional(),
  leaderboardAfterClose: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one setting is required");

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (auth.response) return auth.response;
  const settings = await prisma.eventSettings.findUnique({ where: { id: "global" } });
  return NextResponse.json({
    votingOpen: settings?.votingOpen ?? true,
    votePrice: settings?.votePrice ?? 10,
    unlimitedVotes: settings?.unlimitedVotes ?? true,
    votingStartsAt: settings?.votingStartsAt?.toISOString() ?? null,
    votingEndsAt: settings?.votingEndsAt?.toISOString() ?? null,
    publicVoteCounts: settings?.publicVoteCounts ?? true,
    publicLeaderboard: settings?.publicLeaderboard ?? true,
    leaderboardAfterClose: settings?.leaderboardAfterClose ?? false,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi(request, true);
  if (auth.response) return auth.response;
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid voting setting" }, { status: 400 });
  const { votingStartsAt, votingEndsAt, ...settingsData } = parsed.data;
  const settings = await prisma.eventSettings.upsert({
    where: { id: "global" },
    create: {
      id: "global",
      ...settingsData,
      ...(votingStartsAt !== undefined ? { votingStartsAt: votingStartsAt ? new Date(votingStartsAt) : null } : {}),
      ...(votingEndsAt !== undefined ? { votingEndsAt: votingEndsAt ? new Date(votingEndsAt) : null } : {}),
    },
    update: {
      ...settingsData,
      ...(votingStartsAt !== undefined ? { votingStartsAt: votingStartsAt ? new Date(votingStartsAt) : null } : {}),
      ...(votingEndsAt !== undefined ? { votingEndsAt: votingEndsAt ? new Date(votingEndsAt) : null } : {}),
    },
  });
  return NextResponse.json({ ...settings, votingStartsAt: settings.votingStartsAt?.toISOString() ?? null, votingEndsAt: settings.votingEndsAt?.toISOString() ?? null });
}
