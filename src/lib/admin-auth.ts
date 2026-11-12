import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-token";
import type { AdminSession } from "@/lib/admin-token";
import { prisma } from "@/lib/prisma";
import { isSameOriginRequest } from "@/lib/origin";

export { ADMIN_COOKIE } from "@/lib/admin-token";
export type { AdminSession } from "@/lib/admin-token";

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return token ? loadCurrentAdmin(token) : null;
}

async function loadCurrentAdmin(token: string): Promise<AdminSession | null> {
  const signedSession = await verifyAdminToken(token);
  if (!signedSession) return null;
  const admin = await prisma.adminUser.findUnique({
    where: { id: signedSession.adminId },
    select: { email: true, role: true },
  });
  return admin ? { ...signedSession, email: admin.email, role: admin.role } : null;
}

export async function requireAdminApi(request: Request, elevated = false) {
  if (!isSameOriginRequest(request)) {
    return { response: NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 }) };
  }

  const token = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`))?.[1];
  const session = token ? await loadCurrentAdmin(decodeURIComponent(token)) : null;
  if (!session) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  if (elevated && session.role !== "super_admin") {
    return { response: NextResponse.json({ error: "Super admin access required" }, { status: 403 }) };
  }
  return { session };
}

export function setAdminCookie(response: NextResponse, token: string, isHttps?: boolean) {
  const secure =
    isHttps !== undefined
      ? isHttps
      : Boolean(process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://"));

  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}
