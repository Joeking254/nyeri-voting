import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const failures = [];
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
const provider = (process.env.PAYMENT_PROVIDER || "").toLowerCase().trim();
const isPayHero =
  provider === "payhero" ||
  Boolean(
    process.env.PAYHERO_API_KEY ||
      process.env.PAYHERO_AUTH_TOKEN ||
      process.env.PAYHERO_CHANNEL_ID ||
      (process.env.PAYHERO_API_USERNAME && process.env.PAYHERO_API_PASSWORD)
  );

const callbackToken =
  (isPayHero ? process.env.PAYHERO_CALLBACK_TOKEN : null) ||
  process.env.MPESA_CALLBACK_TOKEN ||
  process.env.PAYHERO_CALLBACK_TOKEN;

const callbackUrl =
  (isPayHero ? process.env.PAYHERO_CALLBACK_URL : null) ||
  process.env.MPESA_CALLBACK_URL ||
  (appUrl && callbackToken ? `${appUrl}/api/${isPayHero ? "payhero" : "mpesa"}/callback?token=${callbackToken}` : null);

const adminEmail = process.env.ADMIN_HEALTH_EMAIL;
const adminPassword = process.env.ADMIN_HEALTH_PASSWORD;

if (!process.env.DATABASE_URL) failures.push("DATABASE_URL is missing");
if (!process.env.JWT_SECRET && !process.env.ADMIN_JWT_SECRET) failures.push("JWT_SECRET is missing");
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) failures.push("Upstash Redis credentials are missing");
if (!callbackToken || callbackToken.length < 16) failures.push(`${isPayHero ? "PAYHERO" : "MPESA"}_CALLBACK_TOKEN must be at least 16 characters`);
if (!callbackUrl || !callbackUrl.startsWith("https://")) failures.push(`${isPayHero ? "PAYHERO" : "MPESA"}_CALLBACK_URL must be an HTTPS URL`);
if (!appUrl?.startsWith("https://")) failures.push("NEXT_PUBLIC_APP_URL must be an HTTPS URL");

if (isPayHero) {
  const hasAuth = Boolean(
    process.env.PAYHERO_API_KEY ||
      process.env.PAYHERO_AUTH_TOKEN ||
      (process.env.PAYHERO_API_USERNAME && process.env.PAYHERO_API_PASSWORD)
  );
  if (!hasAuth) failures.push("PAYHERO_API_KEY (or PAYHERO_API_USERNAME and PAYHERO_API_PASSWORD) is missing");
  if (!process.env.PAYHERO_CHANNEL_ID) failures.push("PAYHERO_CHANNEL_ID is missing");
} else {
  if (!process.env.MPESA_CONSUMER_KEY) failures.push("MPESA_CONSUMER_KEY is missing");
  if (!process.env.MPESA_CONSUMER_SECRET) failures.push("MPESA_CONSUMER_SECRET is missing");
  if (!process.env.MPESA_PASSKEY) failures.push("MPESA_PASSKEY is missing");
  if (!process.env.MPESA_SHORTCODE) failures.push("MPESA_SHORTCODE is missing");
}

if (!adminEmail || !adminPassword) failures.push("Set temporary ADMIN_HEALTH_EMAIL and ADMIN_HEALTH_PASSWORD for this check");

if (failures.length) {
  console.error("Pre-launch configuration failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

const prisma = new PrismaClient();
let cookie;
try {
  await prisma.$queryRaw`SELECT 1`;
  console.log("PASS database connectivity");
} catch {
  failures.push("Database connection failed; check DATABASE_URL and database network access");
} finally {
  await prisma.$disconnect();
}

try {
  const ping = new URL(callbackUrl);
  if (ping.searchParams.get("token") !== callbackToken) throw new Error("callback URL token mismatch");
  const response = await fetch(ping, { method: "GET", signal: AbortSignal.timeout(10_000), cache: "no-store" });
  if (response.status !== 204) throw new Error(`expected 204, received ${response.status}`);
  console.log("PASS callback URL authentication ping");
} catch (error) {
  failures.push(`Callback ping failed: ${error instanceof Error ? error.message : "unknown error"}`);
}

try {
  const login = await fetch(`${appUrl}/api/admin/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!login.ok) throw new Error(`login returned ${login.status}`);
  cookie = login.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("login response did not set a session cookie");
  const health = await fetch(`${appUrl}/api/admin/health`, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(10_000), cache: "no-store" });
  if (!health.ok) throw new Error(`authenticated health check returned ${health.status}`);
  const result = await health.json();
  if (!result.ready) throw new Error("one or more authenticated readiness checks failed");
  console.log("PASS admin login and authenticated readiness check");
} catch (error) {
  failures.push(`Admin authentication check failed: ${error instanceof Error ? error.message : "unknown error"}`);
}

if (failures.length) {
  console.error("Pre-launch checks failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("All pre-launch checks passed.");
