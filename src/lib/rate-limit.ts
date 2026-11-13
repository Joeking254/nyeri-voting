import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

const MAX_REQUESTS = 5;
const WINDOW_MS = 60_000;
const memoryWindows = new Map<string, { count: number; expiresAt: number }>();

function hashKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function memoryRateLimit(key: string) {
  const now = Date.now();
  const current = memoryWindows.get(key);
  if (!current || current.expiresAt <= now) {
    memoryWindows.set(key, { count: 1, expiresAt: now + WINDOW_MS });
    return { success: true, reset: now + WINDOW_MS };
  }
  current.count += 1;
  return { success: current.count <= MAX_REQUESTS, reset: current.expiresAt };
}

export async function rateLimitStkPush(request: Request, normalizedPhone: string) {
  const forwardedIp =
    request.headers.get("x-real-ip") ||
    request.headers.get("x-nf-client-connection-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const keys = [`ip:${hashKey(forwardedIp)}`, `phone:${hashKey(normalizedPhone)}`];

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // If Upstash Redis credentials are provided, use distributed rate limiting
  if (redisUrl && redisToken) {
    try {
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
      if (response.ok) {
        const result = (await response.json()) as { result?: unknown };
        const counts = result.result;
        if (Array.isArray(counts) && counts.length === 2 && counts.every((count) => typeof count === "number")) {
          if (counts.every((count) => count <= MAX_REQUESTS)) return null;
          const retryAfter = Math.max(1, Math.ceil(WINDOW_MS / 1000));
          return NextResponse.json(
            { error: "Too many payment prompts. Wait a minute before trying again." },
            { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } },
          );
        }
      }
    } catch (err) {
      console.warn("Upstash Redis unavailable, using local memory rate limiter:", err);
    }
  }

  // Local in-memory sliding window rate limiter (safe on EC2/PM2 and prevents spam)
  const results = keys.map(memoryRateLimit);
  const blocked = results.find((result) => !result.success);
  if (!blocked) return null;
  return NextResponse.json(
    { error: "Too many payment prompts. Wait a minute before trying again." },
    { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((blocked.reset - Date.now()) / 1000))) } },
  );
}
