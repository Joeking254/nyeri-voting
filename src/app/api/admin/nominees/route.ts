import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { createNomineeSlug } from "@/lib/slug";

export const runtime = "nodejs";
const socialSchema = z.record(z.string().max(300));
const photoPositionSchema = z.enum(["center", "top", "bottom"]);
const photoUrlSchema = z.string().trim().max(1000).refine((value) => {
  if (!value) return true;
  if (/^\/uploads\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/.test(value)) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "Use a valid HTTPS image URL or an uploaded nominee image.");
const nomineeSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  stageName: z.string().trim().max(120).optional().default(""),
  categoryId: z.string().min(1),
  bio: z.string().trim().max(1500).optional().default(""),
  location: z.string().trim().max(120).optional().default(""),
  photoUrl: photoUrlSchema.optional(),
  photoPosition: photoPositionSchema.optional().default("center"),
  isFeatured: z.boolean().optional().default(false),
  isVerified: z.boolean().optional().default(false),
  socialHandles: socialSchema.optional().default({}),
});
const updateSchema = nomineeSchema.partial().extend({ id: z.string().min(1), isActive: z.boolean().optional(), isApproved: z.boolean().optional() });

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (auth.response) return auth.response;
  const nominees = await prisma.nominee.findMany({
    orderBy: [{ category: { orderIndex: "asc" } }, { fullName: "asc" }],
    include: { category: { select: { id: true, name: true } }, _count: { select: { votes: true } } },
  });
  return NextResponse.json(nominees.map((nominee) => ({ ...nominee, totalVotes: nominee.totalVotes.toString() })));
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if (auth.response) return auth.response;
  const parsed = nomineeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the nominee details and try again." }, { status: 400 });
  const category = await prisma.category.findFirst({ where: { id: parsed.data.categoryId, isActive: true }, select: { id: true } });
  if (!category) return NextResponse.json({ error: "Choose an active category." }, { status: 400 });
  const nominee = await prisma.nominee.create({
    data: {
      ...parsed.data,
      slug: await createNomineeSlug(parsed.data.stageName || parsed.data.fullName),
      stageName: parsed.data.stageName || null,
      bio: parsed.data.bio || null,
      location: parsed.data.location || null,
      photoUrl: parsed.data.photoUrl || null,
      socialHandles: parsed.data.socialHandles,
    },
    include: { category: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ ...nominee, totalVotes: nominee.totalVotes.toString() }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi(request);
  if (auth.response) return auth.response;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the nominee details and try again." }, { status: 400 });
  const { id, ...data } = parsed.data;
  if ((data.isApproved !== undefined || data.isFeatured !== undefined || data.isVerified !== undefined) && auth.session.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin access required for approval, featuring, and verification changes." }, { status: 403 });
  }
  if (data.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: data.categoryId, isActive: true }, select: { id: true } });
    if (!category) return NextResponse.json({ error: "Choose an active category." }, { status: 400 });
  }
  const nominee = await prisma.nominee.update({
    where: { id },
    data: {
      ...data,
      stageName: data.stageName === "" ? null : data.stageName,
      bio: data.bio === "" ? null : data.bio,
      location: data.location === "" ? null : data.location,
      photoUrl: data.photoUrl === "" ? null : data.photoUrl,
    },
    include: { category: { select: { id: true, name: true } } },
  }).catch(() => null);
  return nominee
    ? NextResponse.json({ ...nominee, totalVotes: nominee.totalVotes.toString() })
    : NextResponse.json({ error: "Nominee not found." }, { status: 404 });
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApi(request);
  if (auth.response) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Nominee ID is required." }, { status: 400 });
  const nominee = await prisma.nominee.update({ where: { id }, data: { isActive: false } }).catch(() => null);
  return nominee ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Nominee not found." }, { status: 404 });
}
