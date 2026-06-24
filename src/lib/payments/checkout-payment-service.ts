import { getDealerBalance } from "@/lib/accounting/accounting-service";
import { getBalanceTopUpSettings } from "./balance-topup-settings";

export type PaymentMode = "BALANCE_ONLY" | "CARD_ONLY" | "SPLIT";

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export type CheckoutPaymentContext = {
  availableBalance: number;
  cartTotal: number;
  canPayFullBalance: boolean;
  canSplit: boolean;
  canCardOnly: boolean;
  split: { balancePortion: number; cardPortion: number };
  methods: PaymentMode[];
  splitEnabled: boolean;
  balanceEnabled: boolean;
  shortfall: number;
};

export async function buildCheckoutPaymentContext(opts: {
  dealerId: string;
  cartTotal: number;
  balanceEnabled?: boolean;
}): Promise<CheckoutPaymentContext> {
  const settings = await getBalanceTopUpSettings();
  const balanceInfo = await getDealerBalance(opts.dealerId);
  const availableBalance = roundMoney(balanceInfo.balance);
  const cartTotal = roundMoney(opts.cartTotal);
  const balanceEnabled = opts.balanceEnabled !== false && settings.enabled;
  const canPayFullBalance = balanceEnabled && availableBalance >= cartTotal;
  const balancePortion = canPayFullBalance
    ? cartTotal
    : roundMoney(Math.max(0, Math.min(availableBalance, cartTotal)));
  const cardPortion = roundMoney(cartTotal - balancePortion);
  const canSplit =
    balanceEnabled && settings.splitEnabled && balancePortion > 0 && cardPortion > 0;
  const canCardOnly = cartTotal > 0;
  const shortfall = roundMoney(Math.max(0, cartTotal - availableBalance));

  const methods: PaymentMode[] = [];
  if (canPayFullBalance) methods.push("BALANCE_ONLY");
  if (canSplit) methods.push("SPLIT");
  if (canCardOnly) methods.push("CARD_ONLY");

  return {
    availableBalance,
    cartTotal,
    canPayFullBalance,
    canSplit,
    canCardOnly,
    split: { balancePortion, cardPortion },
    methods,
    splitEnabled: settings.splitEnabled,
    balanceEnabled,
    shortfall,
  };
}

export function assertPaymentModeAllowed(
  ctx: CheckoutPaymentContext,
  mode: PaymentMode
): { ok: boolean; error?: string } {
  if (!ctx.methods.includes(mode)) {
    return { ok: false, error: "Seçilen ödeme modu bu sepet için kullanılamaz." };
  }
  if (mode === "BALANCE_ONLY" && !ctx.canPayFullBalance) {
    return { ok: false, error: "Bakiye yetersiz — tam bakiye ödemesi yapılamaz." };
  }
  if (mode === "SPLIT" && !ctx.canSplit) {
    return { ok: false, error: "Bölünmüş ödeme bu sepet için kullanılamaz." };
  }
  return { ok: true };
}

export function buildOrderPaymentMetadata(opts: {
  mode: PaymentMode;
  cartTotal: number;
  balancePortion: number;
  cardPortion: number;
  gateway?: string;
  gatewayReference?: string;
}) {
  return {
    mode: opts.mode,
    cartTotal: roundMoney(opts.cartTotal),
    balancePortion: roundMoney(opts.balancePortion),
    cardPortion: roundMoney(opts.cardPortion),
    balanceCharged: 0,
    cardCharged: 0,
    gateway: opts.gateway || "",
    gatewayReference: opts.gatewayReference || "",
    topUpRequestId: null,
  };
}
