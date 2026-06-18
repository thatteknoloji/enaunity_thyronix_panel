import type { User } from "@/types";

export type ThyronixTenantScope = "GLOBAL" | "DEALER";
export type ThyronixOwnerType = "ADMIN" | "DEALER";

export type ThyronixTenantResource = {
  dealerId?: string | null;
  tenantScope?: ThyronixTenantScope | string | null;
  ownerType?: ThyronixOwnerType | string | null;
};

export function isGlobalThyronixResource(resource: ThyronixTenantResource): boolean {
  return !resource.tenantScope || resource.tenantScope === "GLOBAL";
}

export function isDealerThyronixResource(resource: ThyronixTenantResource): boolean {
  return resource.tenantScope === "DEALER";
}

export function resolveThyronixOwner(user: User): {
  ownerType: ThyronixOwnerType;
  dealerId: string | null;
  tenantScope: ThyronixTenantScope;
} {
  if (user.role === "admin") {
    return { ownerType: "ADMIN", dealerId: null, tenantScope: "GLOBAL" };
  }
  return {
    ownerType: "DEALER",
    dealerId: user.dealerId || null,
    tenantScope: "DEALER",
  };
}

/** Prisma where-clause fragment for tenant-scoped queries. */
export function getThyronixTenantFilter(user: User): Record<string, unknown> {
  if (user.role === "admin") {
    return {};
  }
  if (!user.dealerId) {
    return { id: "__none__" };
  }
  return {
    OR: [
      { tenantScope: "GLOBAL" },
      { tenantScope: "DEALER", dealerId: user.dealerId },
    ],
  };
}

export function canAccessThyronixResource(user: User, resource: ThyronixTenantResource): boolean {
  if (user.role === "admin") return true;
  if (isGlobalThyronixResource(resource)) return true;
  if (!user.dealerId) return false;
  return resource.dealerId === user.dealerId;
}
