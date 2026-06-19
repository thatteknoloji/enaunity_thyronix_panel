"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Truck, Warehouse, DollarSign, FileText, BarChart3 } from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";
import { getCostBreakdown } from "@/lib/fulfillment/breakdown";
import { ORDER_STATUSES } from "@/lib/fulfillment/types";
import { statusLabel } from "@/lib/ui/turkish-labels";
import { toAdminUrl } from "@/lib/auth/admin-access";

type OperasyonOrder = {
  id: string;
  orderNumber: string;
  status: string;
  fulfillmentStatus?: string;
  marketplace: string;
  sourceType: string;
  totalAmount: number;
  totalCost: number;
  totalProfit: number;
  customerName: string;
  createdAt: string;
  engine: string;
  dealer?: { name?: string; company?: string };
  items?: Array<{ id: string; name: string; quantity: number; salePrice: number }>;
  costItems?: Array<{ type: string; title: string; amount: number }>;
};

const FULFILLMENT_STATUS_TABS = [
  { key: "all", label: "Tümü" },
  ...ORDER_STATUSES.map((s) => ({ key: s, label: statusLabel(s) })),
];

const statusColors: Record<string, string> = {
  NEW: "text-blue-700 bg-blue-50 border-blue-200",
  PROCESSING: "text-indigo-700 bg-indigo-50 border-indigo-200",
  WAITING_FOR_PACKING: "text-amber-700 bg-amber-50 border-amber-200",
  PACKING: "text-amber-700 bg-amber-50 border-amber-200",
  WAITING_FOR_SHIPMENT: "text-orange-700 bg-orange-50 border-orange-200",
  READY_TO_SHIP: "text-cyan-700 bg-cyan-50 border-cyan-200",
  SHIPPED: "text-purple-700 bg-purple-50 border-purple-200",
  DELIVERED: "text-green-700 bg-green-50 border-green-200",
  RETURNED: "text-pink-700 bg-pink-50 border-pink-200",
  CANCELLED: "text-red-700 bg-red-50 border-red-200",
};

async function api<T>(url: string): Promise<T> {
  const r = await fetch(url);
  const d = await r.json();
  if (!r.ok || !d.success) throw new Error(d.error || "Yüklenemedi");
  return d.data;
}

export default function OperasyonOrdersPanel() {
  const [orders, setOrders] = useState<OperasyonOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OperasyonOrder | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("fulfillmentStatus", statusFilter);
      const data = await api<OperasyonOrder[]>(`/api/fulfillment/orders?${params}`);
      setOrders(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openOrder = async (id: string) => {
    try {
      setSelected(await api<OperasyonOrder>(`/api/fulfillment/orders?id=${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Detay yüklenemedi");
    }
  };

  const filtered = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.dealer?.company?.toLowerCase().includes(q) ||
      o.dealer?.name?.toLowerCase().includes(q) ||
      o.marketplace?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
        <span className="font-medium text-slate-800">İlgili modüller:</span>
        <Link href={toAdminUrl("/admin/stock-movements")} className="inline-flex items-center gap-1 hover:text-ena-primary"><Warehouse size={12} /> Depo hareketleri</Link>
        <Link href={toAdminUrl("/admin/shipping")} className="inline-flex items-center gap-1 hover:text-ena-primary"><Truck size={12} /> Kargo merkezi</Link>
        <Link href={toAdminUrl("/admin/dealer-transactions")} className="inline-flex items-center gap-1 hover:text-ena-primary"><DollarSign size={12} /> Cari hareketler</Link>
        <Link href={toAdminUrl("/admin/invoices?tab=statements")} className="inline-flex items-center gap-1 hover:text-ena-primary"><FileText size={12} /> Ekstreler</Link>
        <Link href={toAdminUrl("/admin/reports?tab=operasyon")} className="inline-flex items-center gap-1 hover:text-ena-primary"><BarChart3 size={12} /> Operasyon raporu</Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <input
            placeholder="Sipariş no, bayi, pazaryeri ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
          />
          <button onClick={load} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-3 py-2 border rounded-lg">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Yenile
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {FULFILLMENT_STATUS_TABS.slice(0, 8).map((t) => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${statusFilter === t.key ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">Yükleniyor…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm border border-dashed rounded-xl bg-white">Operasyon siparişi bulunamadı</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => {
            const b = getCostBreakdown(o.costItems || []);
            const st = o.fulfillmentStatus || o.status;
            return (
              <div
                key={o.id}
                className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm cursor-pointer transition-shadow"
                onClick={() => openOrder(o.id)}
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{o.orderNumber}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {o.dealer?.company || o.dealer?.name || "—"} · {o.marketplace || o.sourceType || "Manuel"}
                      {o.engine === "core" && <span className="ml-1 text-emerald-600">· Çekirdek</span>}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{formatDate(o.createdAt)}</div>
                  </div>
                  <div className="text-right space-y-1">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${statusColors[st] || "text-gray-600 bg-gray-50 border-gray-200"}`}>
                      {statusLabel(st)}
                    </span>
                    <div className="text-sm font-bold text-gray-900">{formatPrice(o.totalAmount)}</div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-3 text-[11px] text-gray-500">
                  <span>Maliyet: {formatPrice(b.total)}</span>
                  <span className="text-emerald-600 font-medium">Kar: {formatPrice(o.totalProfit)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-900">{selected.orderNumber}</h3>
            <p className="text-sm text-gray-500">{selected.customerName} · {selected.marketplace || selected.sourceType}</p>
            <div className="mt-4 space-y-2 text-sm text-gray-700">
              <div className="flex justify-between"><span>Satış Tutarı</span><span className="font-medium">{formatPrice(selected.totalAmount)}</span></div>
              {(() => {
                const b = getCostBreakdown(selected.costItems || []);
                return (
                  <>
                    <div className="flex justify-between"><span>Ürün Maliyeti</span><span>{formatPrice(b.productCost)}</span></div>
                    <div className="flex justify-between"><span>Kargo</span><span>{formatPrice(b.shippingCost)}</span></div>
                    <div className="flex justify-between"><span>Paketleme</span><span>{formatPrice(b.packagingCost)}</span></div>
                    <div className="flex justify-between"><span>Ek Hizmet</span><span>{formatPrice(b.serviceCost)}</span></div>
                    <div className="flex justify-between font-semibold border-t pt-2"><span>Toplam Maliyet</span><span>{formatPrice(b.total)}</span></div>
                    <div className="flex justify-between text-emerald-600 font-semibold"><span>Tahmini Kar</span><span>{formatPrice(selected.totalProfit)}</span></div>
                  </>
                );
              })()}
            </div>
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-gray-500 mb-2">ÜRÜNLER</h4>
              {selected.items?.map((i) => (
                <div key={i.id} className="text-xs py-1 border-b border-gray-100 text-gray-700">
                  {i.name} × {i.quantity} — {formatPrice(i.salePrice)}
                </div>
              ))}
              {!selected.items?.length && <p className="text-xs text-gray-400">Kalem yok</p>}
            </div>
            <button onClick={() => setSelected(null)} className="mt-4 text-sm text-gray-500 hover:text-gray-800">Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
}
