import { prisma } from "@/lib/prisma";
import { AwardsExperience } from "@/components/awards-experience";
import type { NomineeCardData } from "@/components/nominee-card";

export const dynamic = "force-dynamic";

const emptyPageData = {
  nominees: [] as NomineeCardData[],
  categories: [] as Array<{ id: string; name: string; description: string | null; imageUrl: string | null }>,
  announcements: [] as Array<{ id: string; title: string; message: string; kind: string }>,
  sponsors: [] as Array<{ id: string; name: string; logoUrl: string; websiteUrl: string | null; tier: string }>,
  news: [] as Array<{ id: string; slug: string; title: string; excerpt: string | null; imageUrl: string | null; publishedAt: string | null }>,
  stats: { totalVotes: "0", totalNominees: 0, totalCategories: 0 },
  databaseAvailable: true,
  votePrice: 10,
  votingStatus: "open" as "open" | "paused" | "scheduled" | "closed",
  votingStartsAt: null as string | null,
  votingEndsAt: null as string | null,
  publicVoteCounts: true,
};

export default async function HomePage() {
  let pageData = emptyPageData;
  try {
    const now = new Date();
    const [categories, eventSettings, announcements, sponsors, news] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { orderIndex: "asc" },
        include: {
          nominees: {
            where: { isActive: true, isApproved: true },
            orderBy: { totalVotes: "desc" },
            select: { id: true, slug: true, fullName: true, stageName: true, bio: true, location: true, photoUrl: true, photoPosition: true, isVerified: true, isFeatured: true, totalVotes: true },
          },
        },
      }),
      prisma.eventSettings.findUnique({ where: { id: "global" } }),
      prisma.announcement.findMany({
        where: { isPublished: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] },
        orderBy: [{ kind: "desc" }, { createdAt: "desc" }],
        take: 3,
        select: { id: true, title: true, message: true, kind: true },
      }),
      prisma.sponsor.findMany({ where: { isActive: true }, orderBy: [{ tier: "asc" }, { orderIndex: "asc" }], take: 12, select: { id: true, name: true, logoUrl: true, websiteUrl: true, tier: true } }),
      prisma.newsArticle.findMany({ where: { isPublished: true, publishedAt: { lte: now } }, orderBy: { publishedAt: "desc" }, take: 3, select: { id: true, slug: true, title: true, excerpt: true, imageUrl: true, publishedAt: true } }),
    ]);

    const nominees = categories.flatMap((category) => category.nominees.map((nominee) => ({
      ...nominee,
      totalVotes: nominee.totalVotes.toString(),
      category: category.name,
    })));
    const totalVotes = nominees.reduce((sum, nominee) => sum + BigInt(nominee.totalVotes), BigInt(0));
    const votingStartsAt = eventSettings?.votingStartsAt?.toISOString() ?? null;
    const votingEndsAt = eventSettings?.votingEndsAt?.toISOString() ?? null;
    const votingStatus = eventSettings?.votingOpen === false || (eventSettings?.votingEndsAt && eventSettings.votingEndsAt <= now)
      ? "closed"
      : eventSettings?.votingStartsAt && eventSettings.votingStartsAt > now
        ? "scheduled"
        : "open";

    pageData = {
      nominees,
      categories: categories.map(({ id, name, description, imageUrl }) => ({ id, name, description, imageUrl })),
      announcements,
      sponsors: sponsors.map((sponsor) => ({ ...sponsor, tier: sponsor.tier })),
      news: news.map((article) => ({ ...article, publishedAt: article.publishedAt?.toISOString() ?? null })),
      stats: { totalVotes: totalVotes.toString(), totalNominees: nominees.length, totalCategories: categories.length },
      databaseAvailable: true,
      votePrice: eventSettings?.votePrice ?? 10,
      votingStatus,
      votingStartsAt,
      votingEndsAt,
      publicVoteCounts: eventSettings?.publicVoteCounts ?? true,
    };
  } catch (error) {
    pageData = { ...emptyPageData, databaseAvailable: false };
    console.error("Unable to load public awards data", error);
  }

  return <AwardsExperience {...pageData} />;
}
