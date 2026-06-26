import { getModuleLicenseState } from "@/lib/modules/access";

export const DROPSHIP_MODULE_KEY = "AI_DROPSHIP" as const;

export type DropshipGatewayStep =
  | { step: "redirect"; redirectTo: string }
  | { step: "pricing"; moduleKey: typeof DROPSHIP_MODULE_KEY }
  | { step: "pending"; reason: string };

/** Gateway, dealer API ve menü için tek kaynak lisans çözümlemesi */
export async function resolveDropshipGatewayStep(dealerId: string): Promise<DropshipGatewayStep> {
  const state = await getModuleLicenseState(dealerId, DROPSHIP_MODULE_KEY);
  if (state === "active") {
    return { step: "redirect", redirectTo: "/dealer/dropship" };
  }
  if (state === "pending") {
    return { step: "pending", reason: "Lisansınız onay bekliyor" };
  }
  return { step: "pricing", moduleKey: DROPSHIP_MODULE_KEY };
}
