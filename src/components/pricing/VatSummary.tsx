"use client";

import type { VatAggregate } from "@/lib/pricing/vat-breakdown";
import { formatPrice } from "@/lib/utils";

type Props = {
  breakdown: VatAggregate;
  extraFee?: number;
  extraLines?: Array<{ label: string; amount: number; tone?: "discount" | "fee" }>;
  currency?: string;
  compact?: boolean;
  className?: string;
};

export function VatSummary({
  breakdown,
  extraFee = 0,
  extraLines = [],
  currency = "TRY",
  compact = false,
  className = "",
}: Props) {
  const paymentTotal = breakdown.totalGross + extraFee;

  if (compact) {
    return (
      <div className={`text-sm space-y-1 ${className}`}>
        <div className="flex justify-between text-gray-600">
          <span>Ara toplam (KDV hariç)</span>
          <span>{formatPrice(breakdown.subtotalNet)}</span>
        </div>
        {breakdown.byRate.map((r) => (
          <div key={r.vatRate} className="flex justify-between text-gray-500 text-xs pl-2">
            <span>KDV %{r.vatRate}</span>
            <span>{formatPrice(r.vat)}</span>
          </div>
        ))}
        <div className="flex justify-between text-gray-600">
          <span>Toplam KDV</span>
          <span>{formatPrice(breakdown.totalVat)}</span>
        </div>
        {extraLines.map((line) => (
          <div
            key={line.label}
            className={`flex justify-between ${line.tone === "discount" ? "text-emerald-600" : "text-gray-600"}`}
          >
            <span>{line.label}</span>
            <span>
              {line.tone === "discount" ? "-" : line.amount >= 0 ? "+" : ""}
              {formatPrice(Math.abs(line.amount))}
            </span>
          </div>
        ))}
        {extraFee > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>İşlem ücreti</span>
            <span>+{formatPrice(extraFee)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
          <span>Genel Toplam (KDV dahil)</span>
          <span>
            {paymentTotal.toLocaleString("tr-TR")} {currency}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 text-sm ${className}`}>
      {!compact && breakdown.lines.length > 0 && (
        <div className="space-y-2 border-b border-ena-border/60 pb-3">
          {breakdown.lines.map((line) => (
            <div key={line.id || line.name} className="rounded-xl bg-black/10 px-3 py-2">
              <div className="flex justify-between gap-3">
                <span className="font-medium text-ena-text truncate">{line.name}</span>
                <span className="text-ena-primary shrink-0">{formatPrice(line.lineGross)}</span>
              </div>
              <p className="text-xs text-ena-light/70 mt-1">
                {line.quantity} × {formatPrice(line.unitPrice)} —{" "}
                {line.vatIncluded ? (
                  <>
                    KDV dahil (%{line.vatRate}), içinde {formatPrice(line.lineVat)} KDV
                  </>
                ) : (
                  <>
                    KDV hariç (%{line.vatRate}), +{formatPrice(line.lineVat)} KDV
                  </>
                )}
              </p>
              <div className="mt-1 flex justify-between text-[11px] text-ena-light/60">
                <span>Matrah: {formatPrice(line.lineNet)}</span>
                <span>KDV: {formatPrice(line.lineVat)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <div className="flex justify-between text-ena-light">
          <span>Ara toplam (KDV hariç)</span>
          <span>{formatPrice(breakdown.subtotalNet)}</span>
        </div>
        {breakdown.byRate.map((r) => (
          <div key={r.vatRate} className="flex justify-between text-ena-light/80 text-xs pl-2">
            <span>KDV %{r.vatRate}</span>
            <span>{formatPrice(r.vat)}</span>
          </div>
        ))}
        <div className="flex justify-between text-ena-light">
          <span>Toplam KDV</span>
          <span>{formatPrice(breakdown.totalVat)}</span>
        </div>
        {extraLines.map((line) => (
          <div
            key={line.label}
            className={`flex justify-between ${line.tone === "discount" ? "text-emerald-400" : "text-amber-400"}`}
          >
            <span>{line.label}</span>
            <span>
              {line.tone === "discount" ? "-" : line.amount >= 0 ? "+" : ""}
              {formatPrice(Math.abs(line.amount))}
            </span>
          </div>
        ))}
        {extraFee > 0 && (
          <div className="flex justify-between text-ena-light">
            <span>İşlem ücreti</span>
            <span>+{formatPrice(extraFee)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold text-ena-text border-t border-ena-border pt-2 mt-2">
          <span>Genel Toplam (KDV dahil)</span>
          <span>{formatPrice(paymentTotal)}</span>
        </div>
      </div>
    </div>
  );
}
