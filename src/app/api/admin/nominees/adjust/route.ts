import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const adjustmentSchema = z.object({ nomineeId: z.string().min(1), delta: z.number().int().min(-100000).max(100000).refine((value) => value !== 0), reason: z.string().trim().min(8).max(500) });

export async function POST(request: Request) {
  const auth = await requireAdminApi(request, true);
  if (auth.response) return auth.response;
  const parsed = adjustmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a non-zero adjustment and a reason of at least 8 characters." }, { status: 400 });
  const nominee = await prisma.nominee.findUnique({ where: { id: parsed.data.nomineeId }, select: { id: true, categoryId: true, totalVotes: true } });
  if (!nominee) return NextResponse.json({ error: "Nominee not found." }, { status: 404 });
  if (nominee.totalVotes + BigInt(parsed.data.delta) < BigInt(0)) return NextResponse.json({ error: "Adjustment cannot reduce the nominee below zero votes." }, { status: 400 });

  await prisma.$transaction(async (database) => {
    const updatedNominee = await database.nominee.updateMany({
      where: { id: nominee.id, totalVotes: { gte: parsed.data.delta < 0 ? BigInt(-parsed.data.delta) : BigInt(0) } },
      data: { totalVotes: { increment: BigInt(parsed.data.delta) } },
    });
    if (updatedNominee.count !== 1) throw new Error("Nominee vote total changed; retry the adjustment.");
    await database.category.update({ where: { id: nominee.categoryId }, data: { totalVotes: { increment: BigInt(parsed.data.delta) } } });
    await database.voteAdjustment.create({
      data: { nomineeId: nominee.id, categoryId: nominee.categoryId, adminUserId: auth.session.adminId, delta: parsed.data.delta, reason: parsed.data.reason },
    });
  });
  return NextResponse.json({ ok: true });
}
