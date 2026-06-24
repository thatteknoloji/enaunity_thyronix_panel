import { prisma } from "@/lib/db";
import { getPaymentSettings } from "./payment-settings";
import type { ProductLibraryPaymentMethod } from "./gateway-config";

export type PolicyScope = "GLOBAL" | "GROUP" | "DEALER";
export type ResolvedPaymentMethods = {
  methods: ProductLibraryPaymentMethod[];
  balanceEnabled: boolean;
  bankTransferEnabled: boolean;
  cardEnabled: boolean;
  cardMethod: ProductLibraryPaymentMethod | null;
};

type PolicyRow = {
  cardEnabled: boolean | null;
  bankTransferEnabled: boolean | null;
  balanceEnabled: boolean | null;
};

function resolveField(
  field: keyof PolicyRow,
  dealerPolicy: PolicyRow | null,
  groupPolicy: PolicyRow | null,
  globalPolicy: PolicyRow | null,
  fallback: boolean,
): boolean {
  if (dealerPolicy?.[field] !== null && dealerPolicy?.[field] !== undefined) return !!dealerPolicy[field];
  if (groupPolicy?.[field] !== null && groupPolicy?.[field] !== undefined) return !!groupPolicy[field];
  if (globalPolicy?.[field] !== null && globalPolicy?.[field] !== undefined) return !!globalPolicy[field];
  return fallback;
}

async function getPolicy(scope: string, scopeKey: string): Promise<PolicyRow | null> {
  const row = await prisma.paymentMethodPolicy.findUnique({
    where: { scope_scopeKey: { scope, scopeKey } },
  });
  if (!row) return null;
  return {
    cardEnabled: row.cardEnabled,
    bankTransferEnabled: row.bankTransferEnabled,
    balanceEnabled: row.balanceEnabled,
  };
}

export async function resolveDealerPaymentMethods(dealerId: string): Promise<ResolvedPaymentMethods> {
  const settings = await getPaymentSettings();
  const dealer = await prisma.dealer.findUnique({
    where: { id: dealerId },
    select: { group: true },
  });

  const [globalPolicy, groupPolicy, dealerPolicy] = await Promise.all([
    getPolicy("GLOBAL", ""),
    dealer ? getPolicy("GROUP", dealer.group) : Promise.resolve(null),
    getPolicy("DEALER", dealerId),
  ]);

  const cardOperational =
    (settings.activeCardProvider === "ESNEKPOS" && settings.esnekpos.enabled && settings.esnekpos.configured) ||
    (settings.activeCardProvider === "IYZICO" && settings.iyzico.enabled && settings.iyzico.configured);

  const cardFallback = cardOperational;

  const cardEnabled = resolveField("cardEnabled", dealerPolicy, groupPolicy, globalPolicy, cardFallback);
  const bankTransferEnabled = resolveField(
    "bankTransferEnabled",
    dealerPolicy,
    groupPolicy,
    globalPolicy,
    settings.bankTransferEnabled,
  );
  const balanceEnabled = resolveField("balanceEnabled", dealerPolicy, groupPolicy, globalPolicy, true);

  const methods: ProductLibraryPaymentMethod[] = [];
  let cardMethod: ProductLibraryPaymentMethod | null = null;

  if (cardEnabled) {
    if (settings.activeCardProvider === "ESNEKPOS" && settings.esnekpos.enabled && settings.esnekpos.configured) {
      methods.push("ESNEKPOS");
      cardMethod = "ESNEKPOS";
    } else if (settings.activeCardProvider === "IYZICO" && settings.iyzico.enabled && settings.iyzico.configured) {
      methods.push("IYZICO");
      cardMethod = "IYZICO";
    }
  }
  if (bankTransferEnabled) methods.push("BANK_TRANSFER");

  return { methods, balanceEnabled, bankTransferEnabled, cardEnabled, cardMethod };
}

export function dealerAccountMethodEnabled(resolved: ResolvedPaymentMethods): boolean {
  return resolved.balanceEnabled;
}

export async function assertPaymentMethodAllowed(
  dealerId: string,
  method: ProductLibraryPaymentMethod | "DEALER_ACCOUNT",
): Promise<{ ok: boolean; error?: string; alternatives?: string[] }> {
  const resolved = await resolveDealerPaymentMethods(dealerId);

  if (method === "DEALER_ACCOUNT") {
    if (!resolved.balanceEnabled) {
      return {
        ok: false,
        error: "Bakiye ile ödeme bu bayi için kapalı.",
        alternatives: resolved.methods,
      };
    }
    return { ok: true };
  }

  if (!resolved.methods.includes(method)) {
    return {
      ok: false,
      error: "Seçilen ödeme yöntemi bu bayi için kullanılamıyor.",
      alternatives: resolved.methods,
    };
  }
  return { ok: true };
}

export const PAYMENT_DEADLINE_HOURS = 24;

export function paymentDeadlineFromNow(): Date {
  const d = new Date();
  d.setHours(d.getHours() + PAYMENT_DEADLINE_HOURS);
  return d;
}

export async function upsertPaymentMethodPolicy(input: {
  scope: "GLOBAL" | "GROUP" | "DEALER";
  scopeKey?: string;
  cardEnabled?: boolean | null;
  bankTransferEnabled?: boolean | null;
  balanceEnabled?: boolean | null;
  updatedBy?: string;
}) {
  const scopeKey = input.scope === "GLOBAL" ? "" : (input.scopeKey || "");
  return prisma.paymentMethodPolicy.upsert({
    where: { scope_scopeKey: { scope: input.scope, scopeKey } },
    create: {
      scope: input.scope,
      scopeKey,
      cardEnabled: input.cardEnabled ?? null,
      bankTransferEnabled: input.bankTransferEnabled ?? null,
      balanceEnabled: input.balanceEnabled ?? null,
      updatedBy: input.updatedBy || "",
    },
    update: {
      ...(input.cardEnabled !== undefined ? { cardEnabled: input.cardEnabled } : {}),
      ...(input.bankTransferEnabled !== undefined ? { bankTransferEnabled: input.bankTransferEnabled } : {}),
      ...(input.balanceEnabled !== undefined ? { balanceEnabled: input.balanceEnabled } : {}),
      updatedBy: input.updatedBy || "",
    },
  });
}

export async function listPaymentMethodPolicies() {
  return prisma.paymentMethodPolicy.findMany({ orderBy: [{ scope: "asc" }, { scopeKey: "asc" }] });
}
