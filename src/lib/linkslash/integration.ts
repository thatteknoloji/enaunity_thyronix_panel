import { isAdminRole } from "@/lib/auth/admin-access";
import { assertLinkSlashAccess } from "./access";

export type LinkSlashGatewayStep = "pricing" | "pending" | "ready" | "dealer_required" | "auth_required";

export type LinkSlashGatewayState = {
  step: LinkSlashGatewayStep;
  reason?: string;
  code?: string;
  redirectTo?: string;
};

type EnaUser = {
  id: string;
  role: string;
  dealerId?: string | null;
};

export async function resolveLinkSlashGatewayState(user: EnaUser | null): Promise<LinkSlashGatewayState> {
  if (!user) {
    return { step: "auth_required", reason: "Giriş gerekli", code: "AUTH_REQUIRED" };
  }

  if (isAdminRole(user.role)) {
    return { step: "ready", redirectTo: "/admin/linkslash" };
  }

  const access = await assertLinkSlashAccess(user);
  if (!access.allowed) {
    if (access.code === "DEALER_REQUIRED") {
      return { step: "dealer_required", reason: access.reason, code: access.code };
    }
    if (access.code === "LISANS_BEKLIYOR") {
      return { step: "pending", reason: access.reason, code: access.code };
    }
    return { step: "pricing", reason: access.reason, code: access.code || "LISANS_YOK" };
  }

  return { step: "ready", redirectTo: "/dealer/linkslash" };
}
