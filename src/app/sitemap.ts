import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const staticPaths = ["", "/about", "/categories", "/how-to-vote", "/leaderboard", "/sponsors", "/news", "/contact", "/privacy", "/terms", "/voting-rules", "/results"];
  let nominees: Array<{ slug: string }> = [];
  let articles: Array<{ slug: string; updatedAt: Date }> = [];
  try {
    [nominees, articles] = await Promise.all([
      prisma.nominee.findMany({ where: { isActive: true, isApproved: true }, select: { slug: true } }),
      prisma.newsArticle.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    ]);
  } catch { /* Keep static public routes available while the database is being configured. */ }
  return [
    ...staticPaths.map((path) => ({ url: `${baseUrl}${path}`, changeFrequency: "daily" as const })),
    ...nominees.map((nominee) => ({ url: `${baseUrl}/nominees/${encodeURIComponent(nominee.slug)}` })),
    ...articles.map((article) => ({ url: `${baseUrl}/news/${encodeURIComponent(article.slug)}`, lastModified: article.updatedAt })),
  ];
}
