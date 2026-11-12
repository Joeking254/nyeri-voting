import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (auth.response) return auth.response;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error("Admin health check database failure", error);
    return NextResponse.json({ ready: false, checks: { database: false } }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const callbackToken = process.env.MPESA_CALLBACK_TOKEN;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  const darajaConfigured = [
    process.env.MPESA_CONSUMER_KEY,
    process.env.MPESA_CONSUMER_SECRET,
    process.env.MPESA_PASSKEY,
    process.env.MPESA_SHORTCODE,
  ].every(Boolean);
  let rateLimitConnected = false;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const redisResponse = await fetch(`${process.env.UPSTASH_REDIS_REST_URL.replace(/\/$/, "")}/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify(["PING"]),
        cache: "no-store",
        signal: AbortSignal.timeout(2_000),
      });
      const redisResult = await redisResponse.json() as { result?: unknown };
      rateLimitConnected = redisResponse.ok && redisResult.result === "PONG";
    } catch {
      rateLimitConnected = false;
    }
  }
  let callbackConfigured = false;
  if (callbackToken && callbackToken.length >= 32 && callbackUrl) {
    try {
      const parsedCallbackUrl = new URL(callbackUrl);
      callbackConfigured = parsedCallbackUrl.protocol === "https:" && parsedCallbackUrl.searchParams.get("token") === callbackToken;
    } catch {
      callbackConfigured = false;
    }
  }
  const checks = { database: true, darajaConfigured, callbackConfigured, rateLimitConnected, adminAuthenticated: true };
  return NextResponse.json({ ready: Object.values(checks).every(Boolean), role: auth.session.role, checks }, {
    status: Object.values(checks).every(Boolean) ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
