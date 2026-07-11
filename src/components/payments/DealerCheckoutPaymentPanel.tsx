"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, Landmark, Loader2, Wallet, Split } from "lucide-react";
import { Button } from "@/components/ui/button";

type PaymentMode = "BALANCE_ONLY" | "CARD_ONLY" | "SPLIT";
type DealerPaymentSelection = PaymentMode | "BANK_TRANSFER";

type CheckoutContext = {
  availableBalance: number;
  cartTotal: number;
  canPayFullBalance: boolean;
  canSplit: boolean;
  canCardOnly: boolean;
  split: { balancePortion: number; cardPortion: number };
  methods: PaymentMode[];
  shortfall: number;
  bankTransferEnabled?: boolean;
  cardMethods?: string[];
  cardDisplayName?: string;
  cardAvailable?: boolean;
};

type Props = {
  cartTotal: number;
  dealerId: string;
  onConfirm: (payload: { paymentMode?: PaymentMode; paymentMethod: string; installmentCount: number }) => void | Promise<void>;
  loading?: boolean;
  returnUrl?: string;
  confirmLabel?: string;
};

const MODE_LABELS: Record<PaymentMode, string> = {
  BALANCE_ONLY: "Tam bakiye ile öde",
  SPLIT: "Bakiye + kart (bölünmüş)",
  CARD_ONLY: "Tamamını kartla öde",
};

export function DealerCheckoutPaymentPanel({
  cartTotal,
  dealerId,
  onConfirm,
  loading,
  returnUrl = "/checkout",
  confirmLabel,
}: Props) {
  const [ctx, setCtx] = useState<CheckoutContext | null>(null);
  const [mode, setMode] = useState<DealerPaymentSelection>("CARD_ONLY");
  const [installment, setInstallment] = useState(1);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!cartTotal || !dealerId) return;
    setFetching(true);
    fetch(`/api/dealer/checkout-payment?cartTotal=${cartTotal}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setCtx(d.data);
          const hasBalance = d.data.methods.includes("BALANCE_ONLY");
          const hasCard = d.data.methods.includes("CARD_ONLY");
          const hasSplit = d.data.methods.includes("SPLIT");
          const hasBankTransfer = Boolean(d.data.bankTransferEnabled);
          if (hasBalance) setMode("BALANCE_ONLY");
          else if (hasSplit) setMode("SPLIT");
          else if (hasCard) setMode("CARD_ONLY");
          else if (hasBankTransfer) setMode("BANK_TRANSFER");
          else setMode("CARD_ONLY");
        }
      })
      .finally(() => setFetching(false));
  }, [cartTotal, dealerId]);

  const balanceReturn = `/dealer/balance?returnUrl=${encodeURIComponent(returnUrl)}`;

  const cardMethod = useMemo(() => {
    const methods = ctx?.cardMethods || ["ESNEKPOS"];
    return methods.includes("ESNEKPOS") ? "ESNEKPOS" : methods[0] || "ESNEKPOS";
  }, [ctx]);

  const selections = useMemo(() => {
    if (!ctx) return [] as DealerPaymentSelection[];
    const hasCard = (ctx.cardMethods?.length || 0) > 0 && ctx.cardAvailable !== false;
    const next: DealerPaymentSelection[] = [];
    if (ctx.methods.includes("BALANCE_ONLY")) next.push("BALANCE_ONLY");
    if (hasCard && ctx.methods.includes("SPLIT")) next.push("SPLIT");
    if (hasCard && ctx.methods.includes("CARD_ONLY")) next.push("CARD_ONLY");
    if (ctx.bankTransferEnabled) next.push("BANK_TRANSFER");
    return next;
  }, [ctx]);

  const cardLabel = ctx?.cardDisplayName || "Kredi Kartı";

  if (fetching) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">
        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
        Ödeme seçenekleri yükleniyor...
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Ödeme özeti yüklenemedi.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900">Ödeme Yöntemi</h3>
        <p className="text-sm text-gray-500 mt-1">
          Mevcut bakiye: <strong>{ctx.availableBalance.toLocaleString("tr-TR")} ₺</strong>
          {" · "}
          Sepet: <strong>{ctx.cartTotal.toLocaleString("tr-TR")} ₺</strong>
        </p>
      </div>

      <div className="space-y-2">
        {(["BALANCE_ONLY", "SPLIT", "CARD_ONLY", "BANK_TRANSFER"] as DealerPaymentSelection[]).map((m) => {
          const hasCard = (ctx.cardMethods?.length || 0) > 0 && ctx.cardAvailable !== false;
          const enabled =
            m === "BANK_TRANSFER"
              ? Boolean(ctx.bankTransferEnabled)
              : m === "CARD_ONLY" || m === "SPLIT"
                ? hasCard && ctx.methods.includes(m as PaymentMode)
                : ctx.methods.includes(m as PaymentMode);
          return (
            <button
              key={m}
              type="button"
              disabled={!enabled}
              onClick={() => setMode(m)}
              className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                mode === m ? "border-gray-900 bg-gray-50" : "border-gray-200"
              } ${!enabled ? "opacity-50 cursor-not-allowed" : "hover:border-gray-300"}`}
            >
              {m === "BALANCE_ONLY" ? (
                <Wallet size={18} className="text-gray-600 mt-0.5" />
              ) : m === "SPLIT" ? (
                <Split size={18} className="text-gray-600 mt-0.5" />
              ) : m === "BANK_TRANSFER" ? (
                <Landmark size={18} className="text-gray-600 mt-0.5" />
              ) : (
                <CreditCard size={18} className="text-gray-600 mt-0.5" />
              )}
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {m === "BANK_TRANSFER"
                    ? "Havale / EFT ile öde"
                    : m === "CARD_ONLY"
                      ? `${cardLabel} ile öde`
                      : m === "SPLIT"
                        ? `Bakiye + ${cardLabel}`
                        : MODE_LABELS[m as PaymentMode]}
                </div>
                {m === "BALANCE_ONLY" && !enabled && ctx.shortfall > 0 && (
                  <p className="text-xs text-amber-600 mt-0.5">
                    {ctx.shortfall.toLocaleString("tr-TR")} ₺ eksik —{" "}
                    <Link href={balanceReturn} className="underline">
                      Bakiye yükle
                    </Link>
                  </p>
                )}
                {m === "SPLIT" && enabled && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {ctx.split.balancePortion.toLocaleString("tr-TR")} ₺ bakiye +{" "}
                    {ctx.split.cardPortion.toLocaleString("tr-TR")} ₺ kart
                  </p>
                )}
                {m === "CARD_ONLY" && (
                  <p className="text-xs text-gray-500 mt-0.5">Bakiye kullanılmaz</p>
                )}
                {m === "BANK_TRANSFER" && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Sipariş açılır, havale onayı ve dekont ile ilerler
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {ctx.cardAvailable === false && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          Kredi kartı ödemesi şu an kapalı. Yönetici: Admin → Ödeme Altyapısı → EsnekPOS credential girin.
        </div>
      )}

      {ctx.shortfall > 0 && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
          Bakiyeniz yetersiz.{" "}
          <Link href={balanceReturn} className="font-semibold underline">
            Bakiye ekle
          </Link>{" "}
          veya bölünmüş / kart ödemesi kullanın.
        </div>
      )}

      <Button
        type="button"
        className="w-full"
        disabled={loading || !selections.includes(mode)}
        onClick={() => {
          if (mode === "BANK_TRANSFER") {
            void onConfirm({ paymentMethod: "BANK_TRANSFER", installmentCount: 1 });
            return;
          }
          const paymentMethod =
            mode === "BALANCE_ONLY" ? "DEALER_ACCOUNT" : mode === "SPLIT" ? "SPLIT" : cardMethod;
          void onConfirm({ paymentMode: mode, paymentMethod, installmentCount: installment });
        }}
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin mr-1" /> İşleniyor...
          </>
        ) : confirmLabel ? (
          confirmLabel
        ) : mode === "BALANCE_ONLY" || mode === "BANK_TRANSFER" ? (
          "Siparişi Oluştur"
        ) : (
          "Ödemeye Devam Et"
        )}
      </Button>
    </div>
  );
}
