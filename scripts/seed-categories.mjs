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
  console.log(`Created ${created} missing suggested categories; existing categories and nominees were preserved.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Category seeding failed.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
