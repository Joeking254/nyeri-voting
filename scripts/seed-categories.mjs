import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const suggestions = [
  ["Best Content Creator", "Recognizing outstanding digital storytelling and creative impact in Nyeri."],
  ["Best TikTok Creator", "For short-form video creators with standout originality and audience connection."],
  ["Best YouTube Creator", "For video creators producing exceptional long-form or series content."],
  ["Best Videographer", "For excellence in filming, editing, and visual storytelling."],
  ["Best Photographer", "For a distinctive photographic eye and body of work."],
  ["Best Graphic Designer", "For creative visual communication and design."],
  ["Best Digital Influencer", "For positive digital influence and meaningful community engagement."],
  ["Best Comedy Creator", "For original comedy that entertains and connects audiences."],
  ["Best Lifestyle Creator", "For engaging lifestyle, culture, food, travel, or wellness content."],
  ["Best Emerging Creator", "For a promising new creative voice making an impact."],
  ["Best Podcast Host", "For excellent conversation, production, and listener connection."],
  ["Best Event Coverage Creator", "For memorable coverage of events and community moments."],
  ["People's Choice Award", "A public recognition selected by the Nyeri community."],
];

function equivalentKey(name) {
  return name.normalize("NFKD").toLowerCase().replace(/^best\s+/, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\bcreators\b/g, "creator");
}

try {
  const existing = await prisma.category.findMany({ select: { name: true } });
  const keys = new Set(existing.map((category) => equivalentKey(category.name)));
  let created = 0;
  for (const [name, description] of suggestions) {
    const key = equivalentKey(name);
    if (keys.has(key)) continue;
    await prisma.category.create({ data: { name, description, orderIndex: await prisma.category.count() } });
    keys.add(key);
    created += 1;
  }
  await prisma.eventSettings.upsert({ where: { id: "global" }, create: { id: "global" }, update: {} });

  // Ensure default nominees exist
  const initialNominees = [
    {
      slug: "skits-ke",
      fullName: "STEVE",
      stageName: "SKITS KE",
      bio: "Standout comedy and short-form storytelling in Nyeri.",
      photoUrl: "/uploads/6b320cda-a0a2-4cf3-88b1-8855d9f38512.png",
      photoPosition: "center",
      totalVotes: 0n,
      categoryName: "Best Content Creator",
    },
    {
      slug: "mambake",
      fullName: "Joe ke",
      stageName: "Mambake",
      bio: "Through lenses he captures the vibes.",
      photoUrl: "/uploads/df09afde-c847-42d3-aaf1-9f6019859242.jpg",
      photoPosition: "top",
      totalVotes: 300n,
      categoryName: "Best Videographer",
    },
    {
      slug: "dragon",
      fullName: "Stano",
      stageName: "Dragon",
      bio: "Life story and vlogs.",
      photoUrl: "/uploads/b2cf27d6-9664-4448-8f8f-027e7b5d661f.jpg",
      photoPosition: "center",
      totalVotes: 0n,
      categoryName: "Best Content Creator",
    },
  ];

  for (const n of initialNominees) {
    const existingNominee = await prisma.nominee.findUnique({ where: { slug: n.slug } });
    if (!existingNominee) {
      let cat = await prisma.category.findFirst({
        where: {
          OR: [
            { name: { contains: n.categoryName.replace(/^Best\s+/, "") } },
            { name: n.categoryName },
          ],
        },
      });
      if (!cat) {
        cat = await prisma.category.findFirst();
      }
      if (cat) {
        await prisma.nominee.create({
          data: {
            slug: n.slug,
            fullName: n.fullName,
            stageName: n.stageName,
            bio: n.bio,
            photoUrl: n.photoUrl,
            photoPosition: n.photoPosition,
            totalVotes: n.totalVotes,
            isActive: true,
            isApproved: true,
            categoryId: cat.id,
          },
        });
        console.log(`Seeded nominee ${n.fullName} (${n.stageName})`);
      }
    }
  }

  console.log(`Created ${created} missing suggested categories; existing categories and nominees were preserved.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Category seeding failed.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
