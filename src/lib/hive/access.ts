import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAdminRole, isSuperAdmin } from "@/lib/auth/admin-access";
import { hasModuleAccess } from "@/lib/modules/access";
import type { User } from "@/types";

export async function requireHiveDealerOrAdmin(): Promise<User> {
  const user = await requireAuth();
  if (isAdminRole(user.role) || isSuperAdmin(user.role)) return user;
  if (!user.dealerId) throw new Error("Forbidden");
  const ok = await hasModuleAccess(user.dealerId, "HIVE");
  if (!ok) throw new Error("Forbidden");
  return user;
}

export function hiveErrorResponse(e: unknown) {
  const msg = e instanceof Error ? e.message : "Sunucu hatası";
  const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
  return NextResponse.json({ success: false, error: msg }, { status });
}
