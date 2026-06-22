import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import type { User } from "@/types";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: { id: string; email: string; role: string; dealerId?: string | null; subUserRole?: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, dealerId: user.dealerId, subUserRole: user.subUserRole },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function sign2FAChallenge(payload: { id: string; isSubUser: boolean }): string {
  return jwt.sign({ ...payload, purpose: "2fa" }, JWT_SECRET, { expiresIn: "5m" });
}

export function verify2FAChallenge(token: string): { id: string; isSubUser: boolean } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; isSubUser: boolean; purpose?: string };
    if (payload.purpose !== "2fa") return null;
    return { id: payload.id, isSubUser: Boolean(payload.isSubUser) };
  } catch {
    return null;
  }
}

export function verifyToken(token: string): { id: string; email: string; role: string; dealerId?: string; subUserRole?: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string; dealerId?: string; subUserRole?: string };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  // API key auth via middleware-set headers (for /api/dealer/* routes)
  if (!token) {
    try {
      const headersList = await headers();
      const dealerId = headersList.get("x-dealer-id");
      const keyName = headersList.get("x-api-key-name");
      if (dealerId) {
        return {
          id: `api:${dealerId}`,
          email: `api@${keyName || "key"}`,
          name: keyName || "API Key",
          role: "dealer",
          dealerId,
        } as User;
      }
    } catch {}
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const { prisma } = await import("./db");

  if (payload.subUserRole) {
    const subUser = await prisma.subUser.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, name: true, role: true, dealerId: true, active: true },
    });
    if (!subUser || !subUser.active) return null;
    return {
      id: subUser.id,
      email: subUser.email,
      name: subUser.name,
      role: "dealer",
      dealerId: subUser.dealerId,
      subUserRole: subUser.role,
      isSubUser: true,
    } as User;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, name: true, role: true, dealerId: true, adminRoleId: true },
  });

  if (user?.adminRoleId) {
    const adminRole = await prisma.adminRole.findUnique({
      where: { id: user.adminRoleId },
      select: { id: true, name: true, permissions: true },
    });
    return { ...user, adminRole: adminRole || undefined } as User;
  }

  return user;
}

export async function requireAuth(): Promise<User> {
  const user = await getSession();
  if (!user) throw new Error("Unauthorized");
  return user;
}

import { isAdminRole } from "@/lib/auth/admin-access";

export async function requireAdmin(): Promise<User & { adminRole?: { id: string; name: string; permissions: string } }> {
  const user = await requireAuth();
  if (!isAdminRole(user.role) && user.role !== "admin") throw new Error("Forbidden");
  return user;
}

export async function requireSuperAdmin(): Promise<User & { adminRole?: { id: string; name: string; permissions: string } }> {
  const user = await requireAdmin();
  if (user.role !== "SUPER_ADMIN") throw new Error("Forbidden");
  return user;
}

export async function requireDealer(): Promise<User> {
  const user = await requireAuth();
  if (!user.dealerId) throw new Error("Forbidden");
  return user;
}

export async function requirePermission(permission: string): Promise<User> {
  const user = await requireAdmin();
  if (!user.adminRole?.permissions) throw new Error("Forbidden");
  const perms: string[] = JSON.parse(user.adminRole.permissions);
  if (perms.includes("*")) return user;
  if (!perms.includes(permission)) throw new Error("Forbidden");
  return user;
}

export async function logAdminAction(userId: string, userName: string, action: string, target: string = "", detail: string = "") {
  const { prisma } = await import("./db");
  try {
    await prisma.adminLog.create({ data: { userId, userName, action, target, detail } });
  } catch {}
}
