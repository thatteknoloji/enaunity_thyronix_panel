"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Landmark, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PaymentCheckoutSettings {
  methods: string[];
  balanceEnabled: boolean;
  bankTransferEnabled: boolean;
  activeCardProvider: string;
  cardDisplayName: string;
  extraFeePercent: number;
  extraFeeFixed: number;
  installmentsEnabled: boolean;
  maxInstallments: number;
  minAmount: number;
  checkoutTitle: string;
  checkoutDescription: string;
}

const METHOD_LABELS: Record<string, string> = {
  DEALER_ACCOUNT: "Bakiye / Cari Hesap",
  BANK_TRANSFER: "Havale / EFT",
  ESNEKPOS: "EsnekPOS",
  IYZICO: "İyzico",
};

type Props = {
  amount: number;
  currency?: string;
  dealerId?: string;
  onConfirm: (method: string, installmentCount: number) => void | Promise<void>;
  loading?: boolean;
  title?: string;
};

export function PaymentCheckoutPanel({ amount, currency = "TRY", dealerId, onConfirm, loading, title }: Props) {
  const [settings, setSettings] = useState<PaymentCheckoutSettings | null>(null);
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [installment, setInstallment] = useState(1);
  const [fetching, setFetching] = useState(true);

  const availableMethods = useMemo(() => {
    if (!settings) return [];
    const methods = [...settings.methods];
    if (dealerId && settings.balanceEnabled) {
      methods.unshift("DEALER_ACCOUNT");
    }
    return Array.from(new Set(methods));
  }, [dealerId, settings]);

  useEffect(() => {
    const url = dealerId ? `/api/payments/settings?dealerId=${dealerId}` : "/api/payments/settings";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSettings(d.data);
          const methods = [...(d.data.methods || [])];
          if (dealerId && d.data.balanceEnabled) {
            methods.unshift("DEALER_ACCOUNT");
          }
          setMethod(Array.from(new Set(methods))[0] || "BANK_TRANSFER");
        }
      })
      .finally(() => setFetching(false));
  }, [dealerId]);

  const pricing = useMemo(() => {
    if (!settings || method === "BANK_TRANSFER" || method === "DEALER_ACCOUNT") {
      return { base: amount, fee: 0, total: amount };
    }
    const fee = Math.round((amount * (settings.extraFeePercent / 100) + settings.extraFeeFixed) * 100) / 100;
    return { base: amount, fee, total: amount + fee };
  }, [amount, method, settings]);

  const installmentOptions = useMemo(() => {
    if (!settings?.installmentsEnabled || method === "BANK_TRANSFER" || method === "DEALER_ACCOUNT") return [1];
    return Array.from({ length: settings.maxInstallments }, (_, i) => i + 1);
  }, [settings, method]);

  if (fetching) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">
        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
        Ödeme seçenekleri yükleniyor...
      </div>
    );
  }

  if (!availableMethods.length) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Ödeme yöntemi yapılandırılmamış. Admin → Ödeme Altyapısı
      </div>
    );
  }

  const currentSettings = settings as PaymentCheckoutSettings;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900">{title || currentSettings.checkoutTitle || "Ödeme"}</h3>
        {currentSettings.checkoutDescription && (
          <p className="text-sm text-gray-500 mt-1">{currentSettings.checkoutDescription}</p>
        )}
      </div>

      <div className="space-y-2">
        {availableMethods.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMethod(m); setInstallment(1); }}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
              method === m ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            {m === "BANK_TRANSFER" ? <Landmark size={18} className="text-gray-600" /> : m === "DEALER_ACCOUNT" ? <Wallet size={18} className="text-gray-600" /> : <CreditCard size={18} className="text-gray-600" />}
            <span className="text-sm font-medium text-gray-900">
              {m === currentSettings.activeCardProvider ? currentSettings.cardDisplayName : METHOD_LABELS[m] || m}
            </span>
          </button>
        ))}
      </div>

      {currentSettings.installmentsEnabled && method !== "BANK_TRANSFER" && installmentOptions.length > 1 && (
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Taksit</label>
          <select className="admin-input" value={installment} onChange={(e) => setInstallment(parseInt(e.target.value))}>
            {installmentOptions.map((n) => (
              <option key={n} value={n}>{n === 1 ? "Tek çekim" : `${n} taksit`}</option>
            ))}
          </select>
        </div>
      )}

      <div className="rounded-lg bg-gray-50 p-4 text-sm space-y-1">
        <div className="flex justify-between text-gray-600"><span>Tutar</span><span>{pricing.base.toLocaleString("tr-TR")} {currency}</span></div>
        {pricing.fee > 0 && (
          <div className="flex justify-between text-gray-600"><span>İşlem ücreti</span><span>+{pricing.fee.toLocaleString("tr-TR")} {currency}</span></div>
        )}
        <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
          <span>Toplam</span><span>{pricing.total.toLocaleString("tr-TR")} {currency}</span>
        </div>
        {installment > 1 && (
          <p className="text-xs text-gray-500 pt-1">
            ≈ {(pricing.total / installment).toLocaleString("tr-TR")} {currency} × {installment} taksit
          </p>
        )}
      </div>

      {pricing.total < (currentSettings.minAmount || 0) && method !== "BANK_TRANSFER" && method !== "DEALER_ACCOUNT" && (
        <p className="text-xs text-red-600">Minimum ödeme tutarı: {currentSettings.minAmount} {currency}</p>
      )}

      <Button
        type="button"
        className="w-full"
        disabled={loading || (method !== "BANK_TRANSFER" && method !== "DEALER_ACCOUNT" && pricing.total < (currentSettings.minAmount || 0))}
        onClick={() => onConfirm(method, installment)}
      >
        {loading ? <><Loader2 size={14} className="animate-spin mr-1" /> İşleniyor...</> : (method === "DEALER_ACCOUNT" || method === "BANK_TRANSFER" ? "Siparişi Oluştur" : "Ödemeye Devam Et")}
      </Button>
    </div>
  );
}
