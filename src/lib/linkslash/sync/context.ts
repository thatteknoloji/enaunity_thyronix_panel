import { isAdminRole } from "@/lib/auth/admin-access";

export type SyncContext = {
  userId: string;
  tenantId: string;
  isAdmin: boolean;
};

type SyncUserLike = {
  id: string;
  role: string;
  dealerId?: string | null;
};

export function getSyncContext(user: SyncUserLike): SyncContext {
  return {
    userId: user.id,
    tenantId: user.dealerId || "",
    isAdmin: isAdminRole(user.role) || user.role === "admin",
  };
}

export function resolveTenantScope(ctx: SyncContext, requestedTenantId?: string | null): SyncContext {
  if (ctx.isAdmin && requestedTenantId) {
    return { ...ctx, tenantId: requestedTenantId };
  }
  return ctx;
}
