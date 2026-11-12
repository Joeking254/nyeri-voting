import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const createSchema = z.object({ name: z.string().trim().min(2).max(100), description: z.string().trim().max(1000).optional().default("") });
const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  orderIndex: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  votingOpen: z.boolean().optional(),
});

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (auth.response) return auth.response;
  const categories = await prisma.category.findMany({
    orderBy: { orderIndex: "asc" },
    include: { _count: { select: { nominees: true, votes: true } } },
  });
  return NextResponse.json(categories.map((category) => ({ ...category, totalVotes: category.totalVotes.toString() })));
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if (auth.response) return auth.response;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a category name and valid description." }, { status: 400 });
  try {
    const category = await prisma.category.create({ data: { ...parsed.data, orderIndex: await prisma.category.count() } });
    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A category with this name may already exist." }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi(request);
  if (auth.response) return auth.response;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid category update." }, { status: 400 });
  if ((parsed.data.votingOpen !== undefined || parsed.data.orderIndex !== undefined) && auth.session.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin access required for voting controls and reordering." }, { status: 403 });
  }
  const { id, ...data } = parsed.data;
  try {
    const category = await prisma.category.update({ where: { id }, data });
    return NextResponse.json(category);
  } catch {
    return NextResponse.json({ error: "Category could not be updated." }, { status: 404 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApi(request, true);
  if (auth.response) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Category ID is required." }, { status: 400 });
  const [nominees, votes, adjustments] = await Promise.all([
    prisma.nominee.count({ where: { categoryId: id } }),
    prisma.voteTransaction.count({ where: { categoryId: id } }),
    prisma.voteAdjustment.count({ where: { categoryId: id } }),
  ]);
  if (nominees || votes || adjustments) return NextResponse.json({ error: "This category has nominees or audit records. Archive it instead." }, { status: 409 });
  try {
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Category could not be deleted." }, { status: 404 });
  }
}
