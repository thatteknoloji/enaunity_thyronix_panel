import { getSession } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/admin-access";
import { assertPageFactoryAccess } from "@/lib/page-factory/access";
import { NextResponse } from "next/server";

export async function requireProductUniverseApiAccess() {
  const user = await getSession();
  const access = await assertPageFactoryAccess(user);
  if (!access.allowed) {
    return {
      error: NextResponse.json(
        { success: false, error: access.reason, code: access.code },
        { status: access.code === "AUTH_REQUIRED" ? 401 : 403 }
      ),
      user: null,
      isAdmin: false,
      dealerId: null as string | null,
    };
  }

  const isAdmin = isAdminRole(user!.role);
  return {
    error: null,
    user: user!,
    isAdmin,
    dealerId: isAdmin ? null : user!.dealerId || null,
  };
}

export function productScopeFilter(dealerId: string | null, isAdmin: boolean) {
  if (isAdmin) return {};
  return { dealerId: dealerId || "__none__" };
}
