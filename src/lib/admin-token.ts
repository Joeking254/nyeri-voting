import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE = "nyeri_admin_session";
export type AdminSession = { adminId: string; email: string; role: "super_admin" | "moderator" };

function jwtKey() {
  const secret = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters");
  return new TextEncoder().encode(secret);
}

export async function createAdminToken(session: AdminSession) {
  return new SignJWT({ email: session.email, role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.adminId)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(jwtKey());
}

export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, jwtKey(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string" || (payload.role !== "super_admin" && payload.role !== "moderator")) return null;
    return { adminId: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}
