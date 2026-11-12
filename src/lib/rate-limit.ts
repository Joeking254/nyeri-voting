import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

const MAX_REQUESTS = 5;
const WINDOW_MS = 60_000;
const devWindows = new Map<string, { count: number; expiresAt: number }>();

function hashKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function developmentLimit(key: string) {
  const now = Date.now();
  const current = devWindows.get(key);
  if (!current || current.expiresAt <= now) {
    devWindows.set(key, { count: 1, expiresAt: now + 60_000 });
    return { success: true, reset: now + 60_000 };
  }
  current.count += 1;
  return { success: current.count <= MAX_REQUESTS, reset: current.expiresAt };
}

export async function rateLimitStkPush(request: Request, normalizedPhone: string) {
  const forwardedIp = request.headers.get("x-real-ip")
    || request.headers.get("x-nf-client-connection-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  const keys = [`ip:${hashKey(forwardedIp)}`, `phone:${hashKey(normalizedPhone)}`];

  try {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!redisUrl || !redisToken) throw new Error("Upstash REST credentials are missing");
    const now = Date.now();
    const member = `${now}:${crypto.randomUUID()}`;
    const script = [
      "local now = tonumber(ARGV[1])",
      "local window = tonumber(ARGV[2])",
      "local member = ARGV[3]",
      "local counts = {}",
      "for i, key in ipairs(KEYS) do",
      "  redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)",
      "  redis.call('ZADD', key, now, member .. ':' .. i)",
      "  redis.call('PEXPIRE', key, window)",
      "  counts[i] = redis.call('ZCARD', key)",
      "end",
      "return counts",
    ].join("\n");
    const response = await fetch(`${redisUrl.replace(/\/$/, "")}/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(["EVAL", script, String(keys.length), ...keys, String(now), String(WINDOW_MS), member]),
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) throw new Error(`Upstash rate-limit request failed (${response.status})`);
    const result = await response.json() as { result?: unknown };
    const counts = result.result;
    if (!Array.isArray(counts) || counts.length !== 2 || counts.some((count) => typeof count !== "number")) {
      throw new Error("Upstash returned an invalid rate-limit result");
    }
    if (counts.every((count) => count <= MAX_REQUESTS)) return null;
    const retryAfter = Math.max(1, Math.ceil(WINDOW_MS / 1000));
    return NextResponse.json(
      { error: "Too many payment prompts. Wait a minute before trying again." },
      { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.error("Shared STK rate limiter unavailable", error);
      return NextResponse.json({ error: "Payment service temporarily unavailable." }, { status: 503, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
    }

    const results = keys.map(developmentLimit);
    const blocked = results.find((result) => !result.success);
    if (!blocked) return null;
    return NextResponse.json(
      { error: "Too many payment prompts. Wait a minute before trying again." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((blocked.reset - Date.now()) / 1000))) } },
    );
  }
}
