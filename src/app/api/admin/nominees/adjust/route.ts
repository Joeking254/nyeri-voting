import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const adjustmentSchema = z.object({
  nomineeId: z.string().min(1),
  delta: z.number().int().min(-1000000).max(1000000).refine((value) => value !== 0),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdminApi(request, true);
  if (auth.response) return auth.response;

  const parsed = adjustmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid adjustment amount." }, { status: 400 });
  }

  const nominee = await prisma.nominee.findUnique({
    where: { id: parsed.data.nomineeId },
    select: { id: true, categoryId: true, totalVotes: true, fullName: true, stageName: true },
  });

  if (!nominee) {
    return NextResponse.json({ error: "Nominee not found." }, { status: 404 });
  }

  let delta = parsed.data.delta;
  // If deducting more than available, adjust to zero instead of failing
  if (nominee.totalVotes + BigInt(delta) < BigInt(0)) {
    delta = -Number(nominee.totalVotes);
  }

  if (delta === 0) {
    return NextResponse.json({ ok: true, newTotal: 0 });
  }

  const reason = parsed.data.reason || (delta > 0 ? `Added ${delta} votes` : `Deducted ${Math.abs(delta)} votes`);

  await prisma.$transaction(async (database) => {
    await database.nominee.update({
      where: { id: nominee.id },
      data: { totalVotes: { increment: BigInt(delta) } },
    });

    await database.category.update({
      where: { id: nominee.categoryId },
      data: { totalVotes: { increment: BigInt(delta) } },
    });

    await database.voteAdjustment.create({
      data: {
        nomineeId: nominee.id,
        categoryId: nominee.categoryId,
        adminUserId: auth.session.adminId,
        delta,
        reason,
      },
    });
  });

  const updated = await prisma.nominee.findUnique({
    where: { id: nominee.id },
    select: { totalVotes: true },
  });

  return NextResponse.json({
    ok: true,
    newTotal: updated ? updated.totalVotes.toString() : "0",
    delta,
  });
}
