"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, RefreshCw, Store, User } from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";
import {
  OPERATION_STATUSES,
  operationStatusLabel,
  normalizeOperationStatus,
} from "@/lib/fulfillment/operasyon-status";
import type { OperasyonOrderView } from "@/lib/fulfillment/operasyon-service";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { readSafeJson } from "@/lib/http/safe-json";

type Props = {
  scope: "admin" | "dealer";
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "text-blue-700 bg-blue-50 border-blue-200",
  PICKING: "text-indigo-700 bg-indigo-50 border-indigo-200",
  PACKED: "text-amber-700 bg-amber-50 border-amber-200",
  SHIPPED: "text-purple-700 bg-purple-50 border-purple-200",
  DELIVERED: "text-green-700 bg-green-50 border-green-200",
};

function apiBase(scope: "admin" | "dealer") {
  return scope === "admin" ? "/api/fulfillment/orders" : "/api/dealer/operasyon/orders";
}

function detailHref(scope: "admin" | "dealer", id: string) {
  return scope === "admin"
    ? toAdminUrl(`/admin/orders/operasyon/${id}`)
    : `/dealer/marketplace/orders/${id}`;
}

export default function OperasyonOrdersPanel({ scope }: Props) {
  const router = useRouter();
  const base = apiBase(scope);
  const [orders, setOrders] = useState<OperasyonOrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("fulfillmentStatus", statusFilter);
      const r = await fetch(`${base}?${params}`);
      const d = await readSafeJson<{ success?: boolean; data?: OperasyonOrderView[]; error?: string }>(
        r,
        "Operasyon siparişleri",
      );
      if (!r.ok || !d.success) throw new Error(d.error || "Yüklenemedi");
      setOrders(d.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [base, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.marketplaceOrderId?.toLowerCase().includes(q) ||
      o.dealer?.company?.toLowerCase().includes(q) ||
      o.dealer?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {scope === "admin" && (
        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          Pazaryeri / manuel operasyon siparişleri. Satıra tıklayınca tam operasyon detay sayfası açılır. B2B siparişler{" "}
          <Link href={toAdminUrl("/admin/orders")} className="text-ena-primary hover:underline">
            B2B sekmesinde
          </Link>
          .
        </p>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sipariş no, müşteri, bayi, TY no…"
            className="flex-1 min-w-[200px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw size={14} /> Yenile
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${statusFilter === "all" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}
          >
            Tümü
          </button>
          {OPERATION_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${statusFilter === s ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}
            >
              {operationStatusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">Yükleniyor…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm border border-dashed rounded-xl bg-white">
          Pazaryeri operasyon siparişi yok. Marketplace Hub&apos;dan senkronize edin.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => {
            const st = normalizeOperationStatus(o.fulfillmentStatus);
            const href = detailHref(scope, o.id);
            return (
              <button
                key={o.id}
                type="button"
                className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md hover:border-slate-300 transition-all"
                onClick={() => router.push(href)}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                      {o.orderNumber}
                      <span className="text-[10px] font-normal text-slate-400 inline-flex items-center gap-0.5">
                        Detay <ChevronRight size={12} />
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs">
                      <span className="inline-flex items-center gap-1 text-purple-700">
                        <Store size={12} /> {o.dealer?.company || o.dealer?.name || "Bayi"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-gray-700">
                        <User size={12} /> {o.customerName || "Müşteri bilgisi yok"}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      {o.marketplace || "Pazaryeri"} · TY #{o.marketplaceOrderId || "—"} · {formatDate(o.createdAt)}
                      {(o.documents?.length || 0) > 0 ? ` · ${o.documents.length} belge` : ""}
                    </div>
                  </div>
                  <div className="text-right space-y-1 shrink-0">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${STATUS_COLORS[st] || "text-gray-600 bg-gray-50"}`}>
                      {operationStatusLabel(st)}
                    </span>
                    <div className="text-sm font-bold text-gray-900">{formatPrice(o.totalAmount)}</div>
                    <div className="text-[10px] text-gray-400">{o.items?.length || 0} kalem</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
