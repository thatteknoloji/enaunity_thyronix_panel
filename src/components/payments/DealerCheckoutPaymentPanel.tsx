"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, Loader2, Wallet, Split } from "lucide-react";
import { Button } from "@/components/ui/button";

type PaymentMode = "BALANCE_ONLY" | "CARD_ONLY" | "SPLIT";

type CheckoutContext = {
  availableBalance: number;
  cartTotal: number;
  canPayFullBalance: boolean;
  canSplit: boolean;
  canCardOnly: boolean;
  split: { balancePortion: number; cardPortion: number };
  methods: PaymentMode[];
  shortfall: number;
  cardMethods?: string[];
};

type Props = {
  cartTotal: number;
  dealerId: string;
  onConfirm: (payload: { paymentMode: PaymentMode; paymentMethod: string; installmentCount: number }) => void | Promise<void>;
  loading?: boolean;
};

const MODE_LABELS: Record<PaymentMode, string> = {
  BALANCE_ONLY: "Tam bakiye ile öde",
  SPLIT: "Bakiye + kart (bölünmüş)",
  CARD_ONLY: "Tamamını kartla öde",
};

export function DealerCheckoutPaymentPanel({ cartTotal, dealerId, onConfirm, loading }: Props) {
  const [ctx, setCtx] = useState<CheckoutContext | null>(null);
  const [mode, setMode] = useState<PaymentMode>("CARD_ONLY");
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
          setMode(d.data.methods[0] || "CARD_ONLY");
        }
      })
      .finally(() => setFetching(false));
  }, [cartTotal, dealerId]);

  const cardMethod = useMemo(() => {
    const methods = ctx?.cardMethods || ["ESNEKPOS"];
    return methods.includes("ESNEKPOS") ? "ESNEKPOS" : methods[0] || "ESNEKPOS";
  }, [ctx]);

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
        {(["BALANCE_ONLY", "SPLIT", "CARD_ONLY"] as PaymentMode[]).map((m) => {
          const enabled = ctx.methods.includes(m);
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
              ) : (
                <CreditCard size={18} className="text-gray-600 mt-0.5" />
              )}
              <div>
                <div className="text-sm font-medium text-gray-900">{MODE_LABELS[m]}</div>
                {m === "BALANCE_ONLY" && !enabled && ctx.shortfall > 0 && (
                  <p className="text-xs text-amber-600 mt-0.5">
                    {ctx.shortfall.toLocaleString("tr-TR")} ₺ eksik —{" "}
                    <Link href="/dealer/balance?returnUrl=/checkout" className="underline">
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
              </div>
            </button>
          );
        })}
      </div>

      {ctx.shortfall > 0 && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
          Bakiyeniz yetersiz.{" "}
          <Link href="/dealer/balance?returnUrl=/checkout" className="font-semibold underline">
            Bakiye ekle
          </Link>{" "}
          veya bölünmüş / kart ödemesi kullanın.
        </div>
      )}

      <Button
        type="button"
        className="w-full"
        disabled={loading || !ctx.methods.includes(mode)}
        onClick={() => {
          const paymentMethod =
            mode === "BALANCE_ONLY" ? "DEALER_ACCOUNT" : mode === "SPLIT" ? "SPLIT" : cardMethod;
          void onConfirm({ paymentMode: mode, paymentMethod, installmentCount: installment });
        }}
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin mr-1" /> İşleniyor...
          </>
        ) : mode === "BALANCE_ONLY" ? (
          "Siparişi Oluştur"
        ) : (
          "Ödemeye Devam Et"
        )}
      </Button>
    </div>
  );
}
