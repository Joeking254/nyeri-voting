import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

export async function createNomineeSlug(displayName: string) {
  const base = slugify(displayName) || "creator";
  const initial = await prisma.nominee.findUnique({ where: { slug: base }, select: { id: true } });
  if (!initial) return base;
  return `${base}-${randomUUID().slice(0, 8)}`;
}
