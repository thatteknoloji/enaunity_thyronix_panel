"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  Package,
  Paperclip,
  RefreshCw,
  Store,
  Truck,
  Upload,
  User,
} from "lucide-react";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  getNextOperationStatus,
  normalizeOperationStatus,
  operationStatusLabel,
  OPERATION_STATUSES,
} from "@/lib/fulfillment/operasyon-status";
import type { OperasyonOrderView } from "@/lib/fulfillment/operasyon-service";
import { marketplaceImagePlaceholder } from "@/lib/marketplace-hub/marketplace-image";
import { readSafeJson } from "@/lib/http/safe-json";
import { SendToProductionButton } from "@/components/production-center/SendToProductionButton";

type Scope = "admin" | "dealer";

type Props = {
  scope: Scope;
  orderId: string;
  backHref: string;
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "text-blue-700 bg-blue-50 border-blue-200",
  PICKING: "text-indigo-700 bg-indigo-50 border-indigo-200",
  PACKED: "text-amber-700 bg-amber-50 border-amber-200",
  SHIPPED: "text-purple-700 bg-purple-50 border-purple-200",
  DELIVERED: "text-green-700 bg-green-50 border-green-200",
  CANCELLED: "text-rose-700 bg-rose-50 border-rose-200",
};

function tyCommonLabelSupported(cargo?: string): boolean {
  const name = (cargo || "").toLowerCase();
  if (!name) return true;
  return !["yurtiçi", "yurtici", "mng", "ptt", "sürat", "surat"].some((k) => name.includes(k));
}

function apiBase(scope: Scope) {
  return scope === "admin" ? "/api/fulfillment/orders" : "/api/dealer/operasyon/orders";
}

function patchUrl(scope: Scope, id: string) {
  return scope === "admin" ? `/api/fulfillment/orders/${id}` : `/api/dealer/operasyon/orders/${id}`;
}

function ProductThumb({ name, imageUrl }: { name: string; imageUrl?: string }) {
  const [src, setSrc] = useState(imageUrl || marketplaceImagePlaceholder(name));
  useEffect(() => {
    setSrc(imageUrl || marketplaceImagePlaceholder(name));
  }, [imageUrl, name]);
  return (
    <div className="h-16 w-16 rounded-xl bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center border border-slate-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setSrc(marketplaceImagePlaceholder(name))}
      />
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  actions,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 bg-slate-50/70">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Icon size={16} className="text-slate-500" />
          {title}
        </h2>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function OperasyonOrderDetailView({ scope, orderId, backHref }: Props) {
  const base = apiBase(scope);
  const [order, setOrder] = useState<OperasyonOrderView | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tracking, setTracking] = useState({ trackingNumber: "", cargoCompany: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${base}?id=${orderId}`);
      const d = await readSafeJson<{ success?: boolean; data?: OperasyonOrderView; error?: string }>(
        r,
        "Sipariş detayı",
      );
      if (!r.ok || !d.success || !d.data) throw new Error(d.error || "Sipariş bulunamadı");
      setOrder(d.data);
      setTracking({
        trackingNumber: d.data.cargoTrackingNumber || d.data.trackingNumber || "",
        cargoCompany: d.data.cargoCompany || "",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yüklenemedi");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [base, orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const patchOrder = async (body: Record<string, unknown>) => {
    setActing(true);
    try {
      const r = await fetch(patchUrl(scope, orderId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await readSafeJson<{ success?: boolean; data?: OperasyonOrderView; error?: string }>(
        r,
        "Operasyon işlemi",
      );
      if (!r.ok || !d.success || !d.data) throw new Error(d.error || "İşlem başarısız");
      setOrder(d.data);
      setTracking({
        trackingNumber: d.data.cargoTrackingNumber || d.data.trackingNumber || "",
        cargoCompany: d.data.cargoCompany || "",
      });
      toast.success("Güncellendi");
      return d.data;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata");
      return null;
    } finally {
      setActing(false);
    }
  };

  const uploadLabel = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("files", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const ud = await readSafeJson<{
        success?: boolean;
        data?: Array<{ fileUrl: string; fileName: string; fileSize?: number }>;
        error?: string;
      }>(up, "Etiket yükleme");
      if (!ud.success || !ud.data?.[0]) throw new Error(ud.error || "Yükleme başarısız");
      const f = ud.data[0];
      await patchOrder({
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

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} kopyalandı`);
    } catch {
      toast.error("Kopyalanamadı");
    }
  };

  const nextStatus = useMemo(
    () => (order ? getNextOperationStatus(order.fulfillmentStatus) : null),
    [order],
  );

  const pipeline = useMemo(() => {
    const current = normalizeOperationStatus(order?.fulfillmentStatus || "NEW");
    const idx = OPERATION_STATUSES.indexOf(current as (typeof OPERATION_STATUSES)[number]);
    return OPERATION_STATUSES.map((status, i) => ({
      status,
      label: operationStatusLabel(status),
      done: idx >= 0 && i <= idx,
      current: status === current,
    }));
  }, [order?.fulfillmentStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-10 animate-pulse space-y-4">
          <div className="h-24 rounded-2xl bg-slate-200" />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="h-64 rounded-2xl bg-slate-200 lg:col-span-2" />
            <div className="h-64 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center max-w-md">
          <Package size={28} className="mx-auto text-slate-300 mb-3" />
          <h1 className="text-lg font-semibold text-slate-900">Sipariş bulunamadı</h1>
          <p className="text-sm text-slate-500 mt-2">Bu sipariş silinmiş veya erişim yetkiniz olmayabilir.</p>
          <Link href={backHref} className="inline-flex mt-5 text-sm text-blue-700 hover:underline">
            Listeye dön
          </Link>
        </div>
      </div>
    );
  }

  const statusKey = normalizeOperationStatus(order.fulfillmentStatus);
  const addressBlock = [order.customerName, order.customerPhone, order.customerAddress, order.customerCity]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3">
                <ArrowLeft size={16} /> Operasyon listesine dön
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Sipariş #{order.orderNumber}
                </h1>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[statusKey] || "text-slate-600 bg-slate-50 border-slate-200"}`}>
                  {operationStatusLabel(order.fulfillmentStatus)}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-slate-500">
                {(order.marketplace || order.sourceType || "MANUAL").toUpperCase()}
                {order.marketplaceOrderId ? ` · #${order.marketplaceOrderId}` : ""}
                {" · "}
                {formatDate(order.createdAt)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyText(order.orderNumber, "Sipariş no")}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                >
                  <Copy size={12} /> Sipariş no
                </button>
                {order.marketplaceOrderId ? (
                  <button
                    type="button"
                    onClick={() => copyText(order.marketplaceOrderId, "Pazaryeri no")}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    <Copy size={12} /> Pazaryeri no
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => load()}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                >
                  <RefreshCw size={12} /> Yenile
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-right">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Toplam</p>
                <p className="text-lg font-bold text-slate-900">{formatPrice(order.totalAmount)}</p>
              </div>
              {scope === "dealer" ? <SendToProductionButton dealerOrderId={order.id} /> : null}
              {nextStatus ? (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => patchOrder({ action: "advance" })}
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {operationStatusLabel(nextStatus)} <ChevronRight size={16} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2">
            {pipeline.map((step) => (
              <div
                key={step.status}
                className={`rounded-xl border px-3 py-2 text-center ${
                  step.current
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : step.done
                      ? "border-slate-200 bg-white text-slate-600"
                      : "border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide">{step.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <Section title="Ürün kalemleri" icon={Package}>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-xl border border-slate-100 p-3">
                  <ProductThumb name={item.name} imageUrl={item.imageUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    {item.variantLabel ? (
                      <p className="text-xs font-medium text-indigo-700 mt-0.5">Varyant: {item.variantLabel}</p>
                    ) : null}
                    <p className="text-[11px] text-slate-400 mt-1">
                      Barkod: {item.barcode || "—"} · SKU: {item.sku || "—"} · ×{item.quantity}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {item.orderImageUrl ? (
                        <a href={item.orderImageUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
                          <ExternalLink size={12} /> Ürün görseli
                        </a>
                      ) : (
                        <span className="text-xs text-amber-600">Görsel yok</span>
                      )}
                      {item.orderPdfUrl ? (
                        <a href={item.orderPdfUrl} target="_blank" rel="noreferrer" className="text-xs text-amber-700 hover:underline inline-flex items-center gap-1">
                          <FileText size={12} /> Üretim PDF
                        </a>
                      ) : (
                        <span className="text-xs text-amber-600">PDF yok</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-slate-800 shrink-0">
                    {formatPrice(item.salePrice * item.quantity)}
                  </p>
                </div>
              ))}
              {!order.items.length ? (
                <p className="text-sm text-amber-700">Kalem bulunamadı.</p>
              ) : null}
            </div>
          </Section>

          <Section title="Sipariş belgeleri" icon={Paperclip}>
            {order.documents?.length ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {order.documents.map((doc) => {
                  const isImage = doc.fileType === "image" || /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.fileUrl);
                  return (
                    <a
                      key={`${doc.fileUrl}-${doc.fileName}`}
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50"
                    >
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={doc.fileUrl} alt={doc.fileName} className="h-14 w-14 rounded-lg object-cover bg-slate-100" />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                          <FileText size={20} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{doc.fileName}</p>
                        <p className="text-[11px] text-slate-400">{doc.fileType}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                Bu siparişte henüz ürün görseli veya PDF yok.
              </p>
            )}
          </Section>

          <Section title="Kargo ve etiket" icon={Truck}>
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  placeholder="Kargo firması"
                  value={tracking.cargoCompany}
                  onChange={(e) => setTracking({ ...tracking, cargoCompany: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
                <input
                  placeholder="Kargo takip numarası"
                  value={tracking.trackingNumber}
                  onChange={(e) => setTracking({ ...tracking, trackingNumber: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => patchOrder({ action: "tracking", ...tracking })}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Kargo bilgilerini kaydet
                </button>
                {order.marketplace?.toUpperCase() === "TRENDYOL" ? (
                  <>
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => patchOrder({ action: "refresh_ty_order" })}
                      className="inline-flex items-center gap-1 rounded-xl border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                    >
                      <RefreshCw size={14} /> TY&apos;den yenile
                    </button>
                    {tyCommonLabelSupported(order.cargoCompany) ? (
                      <button
                        type="button"
                        disabled={acting || !order.cargoTrackingNumber}
                        onClick={() => patchOrder({ action: "fetch_ty_label" })}
                        className="inline-flex items-center gap-1 rounded-xl border border-orange-200 px-3 py-2 text-sm text-orange-700 hover:bg-orange-50 disabled:opacity-50"
                      >
                        <Truck size={14} /> TY etiket çek
                      </button>
                    ) : null}
                  </>
                ) : null}
                <label className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                  <Upload size={14} />
                  {uploading ? "Yükleniyor…" : "Kargo etiketi PDF"}
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadLabel(f);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                {order.shippingLabelUrl ? (
                  <a
                    href={order.shippingLabelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline px-2"
                  >
                    <FileText size={14} /> Etiketi aç
                  </a>
                ) : null}
              </div>
              {order.marketplace?.toUpperCase() === "TRENDYOL" ? (
                <p className="text-xs text-slate-500">
                  TY sipariş no: #{order.marketplaceOrderId}
                  {order.cargoTrackingNumber ? ` · Kargo: ${order.cargoTrackingNumber}` : " · Kargo no henüz yok"}
                  {order.cargoCompany ? ` · ${order.cargoCompany}` : ""}
                </p>
              ) : null}
            </div>
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Bayi" icon={Store}>
            <p className="text-sm font-semibold text-slate-900">
              {order.dealer?.company || order.dealer?.name || "—"}
            </p>
          </Section>

          <Section
            title="Müşteri / teslimat"
            icon={User}
            actions={
              addressBlock ? (
                <button
                  type="button"
                  onClick={() => copyText(addressBlock, "Adres")}
                  className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
                >
                  <Copy size={12} /> Kopyala
                </button>
              ) : null
            }
          >
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-slate-900">{order.customerName || "—"}</p>
              <p className="text-slate-500">{order.customerPhone || "Telefon yok"}</p>
              <p className="text-slate-700 leading-relaxed">
                {order.customerAddress || order.customerCity || "Adres bilgisi yok"}
              </p>
              {order.customerCity && order.customerAddress ? (
                <p className="text-xs text-slate-400">{order.customerCity}</p>
              ) : null}
            </div>
          </Section>

          {order.notes ? (
            <Section title="Sipariş notu" icon={FileText}>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{order.notes}</p>
            </Section>
          ) : null}

          <Section title="Özet" icon={Package}>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Kaynak</dt>
                <dd className="font-medium text-slate-800">{order.sourceType || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Pazaryeri</dt>
                <dd className="font-medium text-slate-800">{order.marketplace || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Kalem</dt>
                <dd className="font-medium text-slate-800">{order.items.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Belge</dt>
                <dd className="font-medium text-slate-800">{order.documents?.length || 0}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-slate-100 pt-2">
                <dt className="text-slate-500">Toplam</dt>
                <dd className="font-bold text-slate-900">{formatPrice(order.totalAmount)}</dd>
              </div>
            </dl>
          </Section>
        </div>
      </div>
    </div>
  );
}
