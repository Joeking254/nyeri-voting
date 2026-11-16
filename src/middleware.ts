import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-token";

const ADMIN_GATE_COOKIE = "admin_gate_key";
const DEFAULT_GATE_SECRET = "nyeri-admin-vault-2026";

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const configuredSecret = process.env.ADMIN_SECRET_KEY || DEFAULT_GATE_SECRET;

  // 1. Check if user is unlocking the gate via ?gate=SECRET_KEY
  const gateParam = searchParams.get("gate");
  if (gateParam && gateParam === configuredSecret) {
    const cleanUrl = new URL(request.url);
    cleanUrl.searchParams.delete("gate");
    if (pathname === "/admin" || pathname === "/admin/") {
      cleanUrl.pathname = "/admin/login";
    }

    const response = NextResponse.redirect(cleanUrl);
    const isHttps =
      request.url.startsWith("https://") ||
      request.headers.get("x-forwarded-proto") === "https";

    response.cookies.set(ADMIN_GATE_COOKIE, configuredSecret, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
    return response;
  }

  // 2. Check if user already has an active authenticated admin session
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const session = token ? await verifyAdminToken(token) : null;

  if (session) {
    // Authenticated admin: allow access to all admin routes & APIs
    return NextResponse.next();
  }

  // 3. Unauthenticated: Check if the user has unlocked the gate cookie
  const gateCookie = request.cookies.get(ADMIN_GATE_COOKIE)?.value;
  const hasGateAccess = gateCookie === configuredSecret;

  if (!hasGateAccess) {
    // Completely hide the admin panel and APIs from unauthorized visitors and scanners
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.rewrite(new URL("/not-found", request.url), { status: 404 });
  }

  // 4. Has gate cookie but no session yet:
  if (pathname === "/admin/login" || pathname === "/api/admin/session") {
    return NextResponse.next();
  }

  // If hitting other admin pages without session, redirect to login
  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const login = new URL("/admin/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
