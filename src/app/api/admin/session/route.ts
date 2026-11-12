import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, getAdminSession, setAdminCookie } from "@/lib/admin-auth";
import { createAdminToken } from "@/lib/admin-token";
import { isSameOriginRequest } from "@/lib/origin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const credentialsSchema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200) });
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  const jwtSecret = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    return NextResponse.json({ error: "Admin sign-in is not configured. Set a JWT_SECRET of at least 32 characters." }, { status: 503 });
  }
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const current = attempts.get(address);
  if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many login attempts. Try again in 15 minutes." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });

  let admin = null;
  try {
    admin = await prisma.adminUser.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      select: { id: true, email: true, passwordHash: true, role: true },
    });
  } catch (dbError) {
    console.error("Admin login database error:", dbError);
    return NextResponse.json(
      { error: "Database connection failed. Please verify your MySQL credentials in .env and ensure the database is initialized." },
      { status: 500 }
    );
  }
  const passwordMatches = admin ? await bcrypt.compare(parsed.data.password, admin.passwordHash) : false;
  if (!admin || !passwordMatches) {
    attempts.set(address, { count: (current?.resetAt ?? 0) > now ? (current?.count ?? 0) + 1 : 1, resetAt: current?.resetAt && current.resetAt > now ? current.resetAt : now + WINDOW_MS });
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  attempts.delete(address);
  let token: string;
  try {
    token = await createAdminToken({ adminId: admin.id, email: admin.email, role: admin.role });
  } catch (error) {
    console.error("Admin token creation failed", error);
    return NextResponse.json({ error: "Unable to create an admin session." }, { status: 503 });
  }
  const isHttps =
    request.url.startsWith("https://") ||
    request.headers.get("x-forwarded-proto") === "https";
  const response = NextResponse.json({ email: admin.email, role: admin.role });
  setAdminCookie(response, token, isHttps);
  return response;
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  const isHttps =
    request.url.startsWith("https://") ||
    request.headers.get("x-forwarded-proto") === "https";
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  return NextResponse.json({ email: session.email, role: session.role });
}
