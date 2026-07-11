"use client";

import { AlertTriangle, Package } from "lucide-react";
import type { ProductStockStatus as StockStatus } from "@/lib/products/stock-status";

type Props = {
  status: StockStatus;
  showWarnings?: boolean;
  compact?: boolean;
};

export function ProductStockStatus({ status, showWarnings = true, compact = false }: Props) {
  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <div className="flex items-center gap-2">
        <Package size={compact ? 13 : 15} className={status.headlineClass} />
        <span className={`${status.headlineClass} ${compact ? "text-xs" : "text-sm"}`}>
          {status.headline}
          {status.quantityLabel ? ` (${status.quantityLabel})` : ""}
        </span>
      </div>
      {showWarnings &&
        status.warnings.map((warning) => (
          <div
            key={warning}
            className={`flex items-start gap-1.5 text-amber-400 ${compact ? "text-[11px]" : "text-xs"}`}
          >
            <AlertTriangle size={compact ? 11 : 12} className="mt-0.5 shrink-0" />
            <span>{warning}</span>
          </div>
        ))}
    </div>
  );
}

export function CatalogStockBadge({ status }: { status: StockStatus }) {
  if (status.level === "in" && !status.isLowStock && status.warnings.length === 0) return null;

  const className =
    status.level === "out"
      ? "bg-red-500/90 text-white"
      : status.level === "low" || status.isLowStock
        ? "bg-amber-500 text-white"
        : status.level === "partial"
          ? "bg-orange-500/90 text-white"
          : "bg-amber-500 text-white";

  const label =
    status.level === "out"
      ? "Stokta Yok"
      : status.level === "low" || status.isLowStock
        ? "Düşük Stok"
        : status.level === "partial"
          ? "Kısmi Stok"
          : "Düşük Stok";

  return (
    <span className={`absolute top-2 left-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold ${className}`}>
      {label}
    </span>
  );
}
