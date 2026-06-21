import { isAdminRole, getAdminSecretPath, isSuperAdmin } from "@/lib/auth/admin-access";
import { assertPageFactoryAccess } from "./access";

export type PageFactoryGatewayStep = "pricing" | "pending" | "ready" | "dealer_required" | "auth_required";

export type PageFactoryGatewayState = {
  step: PageFactoryGatewayStep;
  reason?: string;
  code?: string;
  redirectTo?: string;
};

type EnaUser = { id: string; role: string; dealerId?: string | null };

export async function resolvePageFactoryGatewayState(user: EnaUser | null): Promise<PageFactoryGatewayState> {
  if (!user) {
    return { step: "auth_required", reason: "Giriş gerekli", code: "AUTH_REQUIRED" };
  }

  if (isSuperAdmin(user.role)) {
    return { step: "ready", redirectTo: "/dealer/page-factory" };
  }

  if (isAdminRole(user.role)) {
    return { step: "ready", redirectTo: `${getAdminSecretPath()}/page-factory` };
  }

  const access = await assertPageFactoryAccess(user);
  if (!access.allowed) {
    if (access.code === "DEALER_REQUIRED") {
      return { step: "dealer_required", reason: access.reason, code: access.code };
    }
    if (access.code === "LISANS_BEKLIYOR" || access.code === "BAYI_ONAYI_YOK") {
      return { step: "pending", reason: access.reason, code: access.code };
    }
    return { step: "pricing", reason: access.reason, code: access.code || "LISANS_YOK" };
  }

  return { step: "ready", redirectTo: "/dealer/page-factory" };
}
