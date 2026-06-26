"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  RefreshCw, Truck, ChevronRight, Upload, FileText, User, Store, Package,
} from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";
import {
  OPERATION_STATUSES,
  operationStatusLabel,
  getNextOperationStatus,
  normalizeOperationStatus,
} from "@/lib/fulfillment/operasyon-status";
import type { OperasyonOrderView } from "@/lib/fulfillment/operasyon-service";
import { marketplaceImagePlaceholder } from "@/lib/marketplace-hub/marketplace-image";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { SendToProductionButton } from "@/components/production-center/SendToProductionButton";

type Props = {
  scope: "admin" | "dealer";
};

function tyCommonLabelSupported(cargo?: string): boolean {
  const name = (cargo || "").toLowerCase();
  if (!name) return true;
  return !["yurtiçi", "yurtici", "mng", "ptt", "sürat", "surat"].some((k) => name.includes(k));
}

function ProductThumb({ name, imageUrl }: { name: string; imageUrl?: string }) {
  const [src, setSrc] = useState(imageUrl || marketplaceImagePlaceholder(name));
  useEffect(() => {
    setSrc(imageUrl || marketplaceImagePlaceholder(name));
  }, [imageUrl, name]);
  return (
    <div className="h-14 w-14 rounded-lg bg-gray-100 shrink-0 overflow-hidden flex items-center justify-center">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setSrc(marketplaceImagePlaceholder(name))}
        />
      ) : (
        <Package size={20} className="text-gray-300" />
      )}
    </div>
  );
}

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

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  const d = await r.json();
  if (!r.ok || !d.success) throw new Error(d.error || "Yüklenemedi");
  return d.data;
}

export default function OperasyonOrdersPanel({ scope }: Props) {
  const base = apiBase(scope);
  const [orders, setOrders] = useState<OperasyonOrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OperasyonOrderView | null>(null);
  const [acting, setActing] = useState(false);
  const [tracking, setTracking] = useState({ trackingNumber: "", cargoCompany: "" });
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("fulfillmentStatus", statusFilter);
      setOrders(await fetchJson<OperasyonOrderView[]>(`${base}?${params}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [base, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openOrder = async (id: string) => {
    try {
      let detail = await fetchJson<OperasyonOrderView>(`${base}?id=${id}`);
      const applyDetail = (d: OperasyonOrderView) => {
        setSelected(d);
        setTracking({
          trackingNumber: d.cargoTrackingNumber || d.trackingNumber || "",
          cargoCompany: d.cargoCompany || "",
        });
      };
      applyDetail(detail);

      if (detail.marketplace?.toUpperCase() === "TRENDYOL") {
        try {
          const url =
            scope === "admin"
              ? `/api/fulfillment/orders/${id}`
              : `/api/dealer/operasyon/orders/${id}`;
          const r = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "refresh_ty_order" }),
          });
          const d = await r.json();
          if (r.ok && d.success && d.data) {
            detail = d.data as OperasyonOrderView;
            applyDetail(detail);
            setOrders((prev) => prev.map((o) => (o.id === id ? detail : o)));
          }
        } catch {
          /* sessiz — mevcut detay gösterilir */
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Detay yüklenemedi");
    }
  };

  const patchOrder = async (id: string, body: Record<string, unknown>) => {
    setActing(true);
    try {
      const url = scope === "admin" ? `/api/fulfillment/orders/${id}` : `/api/dealer/operasyon/orders/${id}`;
      const r = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "İşlem başarısız");
      setSelected(d.data);
      toast.success("Güncellendi");
      load();
      return d.data as OperasyonOrderView;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata");
      return null;
    } finally {
      setActing(false);
    }
  };

  const uploadLabel = async (file: File) => {
    if (!selected) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("files", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const ud = await up.json();
      if (!ud.success || !ud.data?.[0]) throw new Error(ud.error || "Yükleme başarısız");
      const f = ud.data[0];
      await patchOrder(selected.id, {
        action: "shipping_label",
        fileUrl: f.fileUrl,
        fileName: f.fileName,
        fileSize: f.fileSize,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF yüklenemedi");
    } finally {
      setUploading(false);
    }
  };

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

  const nextLabel = selected
    ? getNextOperationStatus(selected.fulfillmentStatus)
    : null;

  return (
    <div className="space-y-4">
      {scope === "admin" && (
        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          Pazaryeri siparişleri — katalog eşleştirme yok; TY ham satır + foto. B2B siparişler{" "}
          <Link href={toAdminUrl("/admin/orders")} className="text-ena-primary hover:underline">B2B sekmesinde</Link>.
        </p>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <input
            placeholder="Sipariş no, müşteri, bayi, TY no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
          />
          <button onClick={load} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-3 py-2 border rounded-lg">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Yenile
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
            return (
              <div
                key={o.id}
                className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm cursor-pointer transition-shadow"
                onClick={() => openOrder(o.id)}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 text-sm">{o.orderNumber}</div>
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
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start gap-3">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{selected.orderNumber}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selected.marketplace} · #{selected.marketplaceOrderId}
                </p>
              </div>
              <span className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${STATUS_COLORS[normalizeOperationStatus(selected.fulfillmentStatus)]}`}>
                {operationStatusLabel(selected.fulfillmentStatus)}
              </span>
            </div>

            <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-purple-50/50 border border-purple-100 p-3">
                <p className="text-[10px] uppercase text-purple-600 font-semibold mb-1">Bayi</p>
                <p className="font-medium text-gray-900">{selected.dealer?.company || selected.dealer?.name || "—"}</p>
              </div>
              <div className="rounded-lg bg-blue-50/50 border border-blue-100 p-3">
                <p className="text-[10px] uppercase text-blue-600 font-semibold mb-1">Müşteri (pazaryeri)</p>
                <p className="font-medium text-gray-900">{selected.customerName || "—"}</p>
                <p className="text-xs text-gray-500 mt-0.5">{selected.customerPhone}</p>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-gray-100 p-3 text-xs text-gray-600">
              <p className="font-semibold text-gray-800 mb-1">Teslimat adresi</p>
              <p>{selected.customerAddress || selected.customerCity || "Adres bilgisi yok"}</p>
              {selected.customerCity && selected.customerAddress && (
                <p className="text-gray-400 mt-0.5">{selected.customerCity}</p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 items-center">
              {scope === "dealer" && (
                <SendToProductionButton dealerOrderId={selected.id} />
              )}
              {scope === "admin" && (
                <span className="text-[10px] text-gray-400 border border-dashed rounded-lg px-3 py-2">
                  Marketplace → Production Center entegrasyonu <strong>Yakında</strong>
                </span>
              )}
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                <Package size={12} /> ÜRÜN KALEMLERİ
              </h4>
              <div className="space-y-2">
                {selected.items?.map((i) => (
                  <div key={i.id} className="flex gap-3 items-start border border-gray-100 rounded-lg p-2">
                    <ProductThumb name={i.name} imageUrl={i.imageUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{i.name}</p>
                      <p className="text-[10px] text-gray-400">Barkod: {i.barcode || "—"} · ×{i.quantity}</p>
                      <p className="text-xs font-semibold text-gray-700">{formatPrice(i.salePrice * i.quantity)}</p>
                    </div>
                  </div>
                ))}
                {!selected.items?.length && <p className="text-xs text-amber-600">Kalem bulunamadı — yeniden sync deneyin.</p>}
              </div>
            </div>

            <div className="mt-4 border-t pt-4 space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <Truck size={12} /> KARGO
              </h4>
              <div className="flex flex-wrap gap-2">
                <input
                  placeholder="Kargo firması"
                  value={tracking.cargoCompany}
                  onChange={(e) => setTracking({ ...tracking, cargoCompany: e.target.value })}
                  className="flex-1 min-w-[120px] rounded border px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="TY kargo takip no (cargoTrackingNumber)"
                  value={tracking.trackingNumber}
                  onChange={(e) => setTracking({ ...tracking, trackingNumber: e.target.value })}
                  className="flex-1 min-w-[120px] rounded border px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => patchOrder(selected.id, { action: "tracking", ...tracking })}
                  className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg disabled:opacity-50"
                >
                  Kaydet
                </button>
              </div>
              {selected.marketplace?.toUpperCase() === "TRENDYOL" && (
                <p className="text-[10px] text-gray-500">
                  TY sipariş no: #{selected.marketplaceOrderId}
                  {selected.cargoTrackingNumber
                    ? ` · Kargo no: ${selected.cargoTrackingNumber}`
                    : " · Kargo no henüz yok — paketlendikten sonra sync yapın"}
                  {selected.cargoCompany && ` · ${selected.cargoCompany}`}
                </p>
              )}
              {selected.marketplace?.toUpperCase() === "TRENDYOL" &&
                !tyCommonLabelSupported(selected.cargoCompany) && (
                <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
                  {selected.cargoCompany || "Bu kargo firması"} için TY ortak etiket API kullanılamaz.
                  Etiketi Trendyol panelinden indirip aşağıdan PDF yükleyin.
                </p>
              )}

              <div className="flex flex-wrap gap-2 items-center">
                {selected.marketplace?.toUpperCase() === "TRENDYOL" && (
                  <>
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => patchOrder(selected.id, { action: "refresh_ty_order" })}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                    >
                      <RefreshCw size={14} /> TY&apos;den yenile
                    </button>
                    {tyCommonLabelSupported(selected.cargoCompany) && (
                      <button
                        type="button"
                        disabled={acting || !selected.cargoTrackingNumber}
                        title={
                          selected.cargoTrackingNumber
                            ? "Trendyol ortak etiket (ZPL) — sadece TEX/Aras"
                            : "Önce TY kargo takip numarası gerekli — TY'den yenile veya sync yapın"
                        }
                        onClick={() => patchOrder(selected.id, { action: "fetch_ty_label" })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-orange-200 text-orange-700 rounded-lg hover:bg-orange-50 disabled:opacity-50"
                      >
                        <Truck size={14} /> TY&apos;den etiket çek (ZPL)
                      </button>
                    )}
                  </>
                )}
                <label className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border rounded-lg cursor-pointer hover:bg-gray-50">
                  <Upload size={14} />
                  {uploading ? "Yükleniyor…" : "Kargo etiketi PDF yükle"}
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadLabel(f);
                    }}
                  />
                </label>
                {selected.shippingLabelUrl && (
                  <a
                    href={selected.shippingLabelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-ena-primary hover:underline"
                  >
                    <FileText size={14} /> Etiketi görüntüle
                  </a>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {nextLabel && (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => patchOrder(selected.id, { action: "advance" })}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {operationStatusLabel(nextLabel)} <ChevronRight size={16} />
                </button>
              )}
              <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800">
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
