import { NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasModuleAccess } from "@/lib/modules/access";
import { isAdminRole } from "@/lib/auth/admin-access";
import type { User } from "@/types";
import {
  canAccessThyronixResource,
  getThyronixTenantFilter,
  resolveThyronixOwner,
  type ThyronixTenantResource,
} from "./tenant-access";

export const THYRONIX_ADMIN_ONLY_PREFIXES = [
  "/api/thyronix/snapshots",
  "/api/thyronix/rollback",
  "/api/thyronix/demo-seed",
  "/api/thyronix/dashboard/history",
] as const;

export function isThyronixAdminOnlyPath(pathname: string): boolean {
  return THYRONIX_ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
}

export function isThyronixAdmin(user: User): boolean {
  return isAdminRole(user.role) || user.role === "admin";
}

export async function requireThyronixLicense(user: User): Promise<User> {
  if (isThyronixAdmin(user)) return user;
  if (!user.dealerId) throw new Error("Forbidden");
  const ok = await hasModuleAccess(user.dealerId, "THYRONIX");
  if (!ok) throw new Error("Forbidden");
  return user;
}

/** Licensed dealer or platform admin */
export async function requireThyronixDealerOrAdmin(): Promise<User> {
  const user = await requireAuth();
  return requireThyronixLicense(user);
}

/** Platform admin only (system routes) */
export async function requireThyronixAdmin(): Promise<User> {
  return requireAdmin();
}

export function withTenantFilter(user: User, where: Record<string, unknown> = {}): Record<string, unknown> {
  const tenant = getThyronixTenantFilter(user);
  if (Object.keys(tenant).length === 0) return where;
  return { AND: [where, tenant] };
}

export function tenantOwnerFields(user: User) {
  return resolveThyronixOwner(user);
}

export async function getAccessibleSourceIds(user: User): Promise<string[] | null> {
  if (isThyronixAdmin(user)) return null;
  const rows = await prisma.thyronixSource.findMany({
    where: withTenantFilter(user, {}),
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function loadSource(sourceId: string) {
  return prisma.thyronixSource.findUnique({ where: { id: sourceId } });
}

async function loadProduct(productId: string) {
  return prisma.thyronixProduct.findUnique({ where: { id: productId } });
}

async function loadFeed(feedId: string) {
  return prisma.thyronixFeed.findUnique({ where: { id: feedId } });
}

async function loadRule(ruleId: string) {
  return prisma.thyronixRule.findUnique({ where: { id: ruleId } });
}

export async function canAccessSource(user: User, sourceId: string): Promise<boolean> {
  const source = await loadSource(sourceId);
  if (!source) return false;
  return canAccessThyronixResource(user, source as ThyronixTenantResource);
}

export async function canAccessProduct(user: User, productId: string): Promise<boolean> {
  const product = await loadProduct(productId);
  if (!product) return false;
  return canAccessThyronixResource(user, product as ThyronixTenantResource);
}

export async function canAccessFeed(user: User, feedId: string): Promise<boolean> {
  const feed = await loadFeed(feedId);
  if (!feed) return false;
  return canAccessThyronixResource(user, feed as ThyronixTenantResource);
}

export async function canAccessRule(user: User, ruleId: string): Promise<boolean> {
  const rule = await loadRule(ruleId);
  if (!rule) return false;
  return canAccessThyronixResource(user, rule as ThyronixTenantResource);
}

export async function canAccessMapping(user: User, sourceId?: string | null): Promise<boolean> {
  if (!sourceId) return isThyronixAdmin(user);
  return canAccessSource(user, sourceId);
}

export async function assertCanAccessSource(user: User, sourceId: string) {
  const ok = await canAccessSource(user, sourceId);
  if (!ok) throw new Error("Forbidden");
}

export async function assertCanAccessProduct(user: User, productId: string) {
  const ok = await canAccessProduct(user, productId);
  if (!ok) throw new Error("Forbidden");
}

export async function assertCanAccessFeed(user: User, feedId: string) {
  const ok = await canAccessFeed(user, feedId);
  if (!ok) throw new Error("Forbidden");
}

export function mappingListFilter(user: User, sourceIds: string[] | null) {
  if (sourceIds === null) return {};
  return { OR: [{ sourceId: null }, { sourceId: { in: sourceIds } }] };
}

export function thyronixErrorResponse(e: unknown, fallback = "Sunucu hatası") {
  if (e instanceof Error) {
    if (e.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: "Oturum bulunamadı" }, { status: 401 });
    }
    if (e.message === "Forbidden") {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 403 });
    }
    if (e.message === "NotFound") {
      return NextResponse.json({ success: false, error: "Kayıt bulunamadı" }, { status: 404 });
    }
  }
  return NextResponse.json({ success: false, error: fallback }, { status: 500 });
}
