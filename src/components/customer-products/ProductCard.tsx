import type { UnifiedStatus } from "@/lib/customer-products/types";
import { PRODUCT_META, type CustomerProductCard, type CustomerProductKey } from "@/lib/customer-products/types";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, FileText, Shield, CreditCard } from "lucide-react";

const STATUS_STYLES: Record<UnifiedStatus, string> = {
  ACTIVE: "bg-green-500/10 text-green-400 border-green-500/20",
  TRIAL: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  INACTIVE: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  EXPIRED: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_LABELS: Record<UnifiedStatus, string> = {
  ACTIVE: "Aktif",
  TRIAL: "Deneme",
  PENDING: "Bekliyor",
  INACTIVE: "Pasif",
  EXPIRED: "Süresi Doldu",
};

const ACCENT: Record<string, string> = {
  red: "from-red-500/10 to-ena-card border-red-500/20",
  blue: "from-blue-500/10 to-ena-card border-blue-500/20",
  violet: "from-violet-500/10 to-ena-card border-violet-500/20",
  emerald: "from-emerald-500/10 to-ena-card border-emerald-500/20",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

export function ProductStatusBadge({ status }: { status: UnifiedStatus }) {
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function CustomerProductCardView({ product }: { product: CustomerProductCard }) {
  const meta = PRODUCT_META[product.moduleKey as CustomerProductKey];
  const accent = ACCENT[meta.color] || ACCENT.red;
  const canEnter =
    product.moduleKey === "PRODUCT_LIBRARY"
      ? (product.libraryStats?.activePackageCount ?? 0) > 0 ||
        product.status === "ACTIVE" ||
        product.status === "TRIAL"
      : product.status === "ACTIVE" || product.status === "TRIAL";

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-6 space-y-5 ${accent}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">{product.label}</h3>
          <p className="text-xs text-ena-light mt-0.5">{product.description}</p>
        </div>
        <ProductStatusBadge status={product.status} />
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        {product.moduleKey === "PRODUCT_LIBRARY" && product.libraryStats ? (
          <>
            <div>
              <dt className="text-ena-light/60 text-xs">Paket Sayısı</dt>
              <dd className="text-white font-medium">{product.libraryStats.packageCount}</dd>
            </div>
            <div>
              <dt className="text-ena-light/60 text-xs">Aktif Paketler</dt>
              <dd className="text-white font-medium">{product.libraryStats.activePackageCount}</dd>
            </div>
            <div>
              <dt className="text-ena-light/60 text-xs">Bekleyen Ödeme</dt>
              <dd className="text-white font-medium">{product.libraryStats.pendingPayments}</dd>
            </div>
            <div>
              <dt className="text-ena-light/60 text-xs">Son İndirme</dt>
              <dd className="text-white font-medium text-xs">
                {product.libraryStats.lastDownloadPackage || "—"}
              </dd>
            </div>
          </>
        ) : (
          <>
            <div>
              <dt className="text-ena-light/60 text-xs">Paket</dt>
              <dd className="text-white font-medium">{product.planName || "—"}</dd>
            </div>
            <div>
              <dt className="text-ena-light/60 text-xs">Son Ödeme</dt>
              <dd className="text-white font-medium">
                {product.lastPaymentAmount != null
                  ? `${product.lastPaymentAmount.toLocaleString("tr-TR")} ₺`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-ena-light/60 text-xs">Son Giriş</dt>
              <dd className="text-white font-medium text-xs">{formatDate(product.lastLoginAt)}</dd>
            </div>
            <div>
              <dt className="text-ena-light/60 text-xs">Bağlantı</dt>
              <dd className="text-white font-medium text-xs">{product.linkStatus || (product.moduleKey === "ENA_COMMERCE" ? "ENA" : "—")}</dd>
            </div>
          </>
        )}
      </dl>

      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          href={canEnter ? meta.gatewayPath : meta.pricingPath}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors"
        >
          {canEnter ? <ArrowRight size={14} /> : <ArrowUpRight size={14} />}
          {product.moduleKey === "PRODUCT_LIBRARY" ? "Hazır Ürünlere Git" : canEnter ? "Ürüne Git" : "Lisans Al"}
        </Link>
        {product.moduleKey !== "PRODUCT_LIBRARY" && (
          <>
            <Link
              href={meta.pricingPath}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-ena-light text-xs font-medium transition-colors"
            >
              <ArrowUpRight size={14} /> Paketi Yükselt
            </Link>
            <Link
              href={`/products/licenses?module=${product.moduleKey}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-ena-light text-xs font-medium transition-colors"
            >
              <Shield size={14} /> Lisans Detayı
            </Link>
            <Link
              href={`/products/invoices?module=${product.moduleKey}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-ena-light text-xs font-medium transition-colors"
            >
              <CreditCard size={14} /> Fatura Geçmişi
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export { STATUS_LABELS, STATUS_STYLES, formatDate };
