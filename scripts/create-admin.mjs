import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
if (!email || !password || password.length < 12) {
  console.error("Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD (minimum 12 characters) before running this script.");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const existing = await prisma.adminUser.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    await prisma.adminUser.update({
      where: { email },
      data: { passwordHash: await bcrypt.hash(password, 12), role: "super_admin" }
    });
    console.log(`Updated existing super admin: ${email}`);
  } else {
    await prisma.adminUser.create({ data: { email, passwordHash: await bcrypt.hash(password, 12), role: "super_admin" } });
    console.log(`Created super admin: ${email}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Could not create admin.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
