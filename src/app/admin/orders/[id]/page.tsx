"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  ArrowLeft,
  AlertTriangle,
  Building2,
  Calendar,
  Copy,
  ExternalLink,
  FileText,
  Link2,
  Lock,
  MapPin,
  Package,
  Paperclip,
  Send,
  Truck,
  Unlock,
  User,
  Wallet,
} from "lucide-react";
import { getOrderPaymentInfo } from "@/lib/orders/payment-metadata";
import {
  canUnlockDigitalDelivery,
  digitalModeLabel,
  parseDigitalDeliverySnapshot,
} from "@/lib/products/digital-delivery";

type DetailOrder = {
  id: string;
  total: number;
  discount: number;
  status: string;
  address: string;
  notes: string;
  trackingNumber: string;
  carrier: string;
  marketplace: string;
  sourceType: string;
  orderNumber: string;
  hasBackorder: boolean;
  paymentTermDays: number;
  paymentTermRate: number;
  paymentDeadlineAt: string | null;
  metadataJson: string;
  createdAt: string;
  updatedAt: string;
  user?: { name: string; email: string } | null;
  dealer?: { id: string; company: string; name: string; email: string; phone: string; group: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    metadataJson?: string | null;
    product?: { name?: string; image?: string } | null;
    productCatalogItem?: { name?: string; imagesJson?: string } | null;
  }>;
  statusHistory?: Array<{ id: string; status: string; note: string; changedBy: string; createdAt: string }>;
  attachments?: Array<{ id: string; fileName: string; fileUrl: string; fileType: string }>;
  payments?: Array<{ id: string; amount: number; type: string; status: string; note: string; createdAt: string }>;
  invoices?: Array<{ id: string; number: string; status: string; paymentStatus: string; total: number; pdfUrl: string; createdAt: string }>;
  digitalDeliveries?: Array<{
    id: string;
    orderItemId: string;
    productName: string;
    mode: string;
    modeLabel: string;
    status: string;
    statusLabel: string;
    canAccess: boolean;
    assetName: string;
    assetUrl: string;
    accessInstructions: string;
    licenseValue: string;
    licenseSource: string;
    downloadLimit: number;
    downloadCount: number;
    lastAccessedAt: string | null;
    logs: Array<{ id: string; eventType: string; actorType: string; note: string; createdAt: string }>;
  }>;
  warehouseStatus?: {
    reserved: boolean;
    hasWarnings: boolean;
    warnings: string[];
    items: Array<{
      orderItemId: string;
      productId: string | null;
      productName?: string;
      quantity: number;
      reserved: boolean;
      availableStock?: number;
      insufficient: boolean;
      unmatched: boolean;
      warning?: string;
    }>;
  } | null;
};

type OrderMetadata = {
  platform?: string;
  company?: string;
  taxId?: string;
  invoiceAddress?: string;
  deliveryAddress?: string;
  sameAddress?: boolean;
  couponId?: string | null;
  couponDiscount?: number;
  campaignDiscount?: number;
  campaignLabel?: string;
  campaignFreeShip?: boolean;
  shippingCost?: number;
  paymentMethod?: string;
  installmentCount?: number;
  rawTotal?: number;
  discountTotal?: number;
  termFee?: number;
  finalTotal?: number;
};

const statusVariant: Record<string, "default" | "success" | "warning" | "danger"> = {
  pending: "warning",
  pending_approval: "warning",
  waiting_payment: "warning",
  approved: "default",
  shipped: "default",
  delivered: "success",
  cancelled: "danger",
};

const statusText: Record<string, string> = {
  pending: "Beklemede",
  pending_approval: "Onay Bekliyor",
  waiting_payment: "Ödeme Bekliyor",
  approved: "Onaylandı",
  shipped: "Kargoda",
  delivered: "Teslim Edildi",
  cancelled: "İptal Edildi",
};

function parseMetadata(value?: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function getCatalogImage(value?: string | null) {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && typeof parsed[0] === "string") {
      return parsed[0] || "";
    }
    return "";
  } catch {
    return "";
  }
}

function getFileKind(fileType?: string, fileName?: string) {
  const name = (fileName || "").toLowerCase();
  const type = (fileType || "").toLowerCase();
  if (type.includes("image") || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name)) return "image";
  return "pdf";
}

function parseDigitalMetadata(value?: string | null) {
  const metadata = parseMetadata(value);
  return parseDigitalDeliverySnapshot((metadata as { digitalDelivery?: unknown }).digitalDelivery);
}

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<DetailOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState("");

  const loadOrder = () => {
    if (!id) return;
    fetch(`/api/admin/orders/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrder(d.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const metadata = useMemo(() => parseMetadata(order?.metadataJson) as OrderMetadata, [order?.metadataJson]);
  const paymentInfo = order ? getOrderPaymentInfo(order) : { method: "", label: "", locked: false };
  const platform = String(metadata.platform || order?.marketplace || "").trim();
  const shippingCost = Number(metadata.shippingCost || 0) || 0;
  const installmentCount = Number(metadata.installmentCount || 1) || 1;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-gray-200" />
        <div className="h-40 rounded-xl bg-gray-100" />
        <div className="h-96 rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-600">Sipariş bulunamadı.</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push("/admin/orders")}>Siparişlere dön</Button>
      </div>
    );
  }

  const invoice = order.invoices?.[0] || null;
  const canShowHistory = order.statusHistory && order.statusHistory.length > 0;
  const digitalItems = order.digitalDeliveries || [];

  const runGrantAction = async (grantId: string, action: "resend" | "activate" | "revoke" | "restore") => {
    setActioningId(`${grantId}:${action}`);
    const res = await fetch(`/api/admin/digital-access/${grantId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!data.success) {
      toast.error(data.error || "İşlem başarısız");
      setActioningId("");
      return;
    }
    toast.success(
      action === "resend"
        ? "Teslimat bildirimi yeniden gönderildi"
        : action === "revoke"
          ? "Erişim kapatıldı"
          : "Erişim açıldı",
    );
    loadOrder();
    setActioningId("");
  };

  const openSecureLink = async (grantId: string) => {
    setActioningId(`${grantId}:open`);
    const res = await fetch(`/api/digital-access/${grantId}/token`, { method: "POST" });
    const data = await res.json();
    if (!data.success) {
      toast.error(data.error || "Güvenli link açılamadı");
      setActioningId("");
      return;
    }
    window.open(data.data.url, "_blank", "noopener,noreferrer");
    setActioningId("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft size={16} /> Siparişlere dön
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sipariş Detayı</h1>
            <p className="text-sm text-gray-500 mt-1 font-mono">#{order.id}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant[order.status] || "default"}>{statusText[order.status] || order.status}</Badge>
            {paymentInfo.method && <Badge variant="default">{paymentInfo.label}</Badge>}
            {platform && <Badge variant="default">{platform}</Badge>}
            {order.marketplace && <Badge variant="default">{order.marketplace}</Badge>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigator.clipboard?.writeText(order.id)}
            className="gap-2"
          >
            <Copy size={16} /> Kopyala
          </Button>
          <Button variant="outline" onClick={() => router.push(`/admin/orders?tab=operasyon`)} className="gap-2">
            <Truck size={16} /> Operasyon
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="Toplam" value={formatPrice(order.total)} />
        <StatCard icon={Package} label="Ürün Sayısı" value={String(order.items.length)} />
        <StatCard icon={Calendar} label="Oluşturulma" value={formatDate(order.createdAt)} />
        <StatCard icon={Truck} label="Kargo" value={order.trackingNumber ? `${order.carrier || "Kargo"} • ${order.trackingNumber}` : "Girilmeyen"} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="font-semibold text-gray-900">Sipariş Kalemi</h2>
              <span className="text-xs text-gray-500">{order.items.length} satır</span>
            </div>
            <div className="divide-y divide-gray-100">
              {order.items.map((item) => {
                const productName = item.product?.name || item.productCatalogItem?.name || "Ürün";
                const image = item.product?.image || getCatalogImage(item.productCatalogItem?.imagesJson) || "/placeholder.svg";
                const digitalDelivery = parseDigitalMetadata(item.metadataJson);
                return (
                  <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                    <img src={image || "/placeholder.svg"} alt={productName} className="h-16 w-16 rounded-lg object-cover bg-gray-100" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{productName}</p>
                      <p className="text-xs text-gray-500 mt-1">Adet: {item.quantity} • Birim: {formatPrice(item.price)}</p>
                      {digitalDelivery ? (
                        <p className="mt-1 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                          {digitalModeLabel(digitalDelivery.mode)}
                        </p>
                      ) : null}
                    </div>
                    <p className="font-bold text-gray-900">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {digitalItems.length > 0 ? (
            <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-indigo-950">
                <FileText size={16} /> Dijital Teslimatlar
              </h2>
              <div className="space-y-3">
                {digitalItems.map((delivery) => {
                  const busyBase = `${delivery.id}:`;
                  return (
                    <div key={delivery.id} className="rounded-2xl border border-indigo-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{delivery.productName}</p>
                          <p className="mt-1 text-xs text-indigo-700">{delivery.modeLabel}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${delivery.canAccess ? "bg-emerald-100 text-emerald-700" : delivery.status === "revoked" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                          {delivery.statusLabel}
                        </span>
                      </div>
                      {delivery.accessInstructions ? (
                        <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{delivery.accessInstructions}</p>
                      ) : null}
                      {delivery.licenseValue ? (
                        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Lisans / Erişim İçeriği</p>
                          <p className="whitespace-pre-wrap break-words font-mono text-sm text-gray-900">{delivery.licenseValue}</p>
                          {delivery.licenseSource ? (
                            <p className="mt-2 text-xs text-gray-500">Kaynak: {delivery.licenseSource}</p>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {delivery.assetUrl && delivery.canAccess ? (
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => openSecureLink(delivery.id)}
                            disabled={actioningId === `${delivery.id}:open`}
                          >
                            {delivery.mode === "external_access" ? <Link2 size={14} /> : <ExternalLink size={14} />}
                            {actioningId === `${delivery.id}:open`
                              ? "Hazırlanıyor..."
                              : delivery.assetName || (delivery.mode === "external_access" ? "Erişimi Aç" : "Dosyayı Aç")}
                          </Button>
                        ) : null}
                        {delivery.downloadLimit ? (
                          <span className="text-xs text-gray-500">İndirme: {delivery.downloadCount}/{delivery.downloadLimit}</span>
                        ) : null}
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => runGrantAction(delivery.id, "resend")}
                          disabled={actioningId === `${delivery.id}:resend`}
                        >
                          <Send size={14} /> {actioningId === `${delivery.id}:resend` ? "Gönderiliyor..." : "Yeniden Gönder"}
                        </Button>
                        {delivery.status === "revoked" ? (
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => runGrantAction(delivery.id, "restore")}
                            disabled={actioningId === `${delivery.id}:restore`}
                          >
                            <Unlock size={14} /> Yeniden Aç
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => runGrantAction(delivery.id, delivery.canAccess ? "revoke" : "activate")}
                            disabled={actioningId === `${delivery.id}:${delivery.canAccess ? "revoke" : "activate"}`}
                          >
                            {delivery.canAccess ? <Lock size={14} /> : <Unlock size={14} />}
                            {delivery.canAccess ? "Erişimi Kapat" : "Teslimatı Aç"}
                          </Button>
                        )}
                      </div>
                      {delivery.lastAccessedAt ? (
                        <p className="mt-3 text-xs text-gray-500">Son erişim: {formatDate(delivery.lastAccessedAt)}</p>
                      ) : null}
                      {delivery.logs.length > 0 ? (
                        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Son Loglar</p>
                          <div className="space-y-1 text-xs text-gray-600">
                            {delivery.logs.map((log) => (
                              <div key={log.id} className="flex flex-wrap items-center justify-between gap-2">
                                <span>{log.note || log.eventType}</span>
                                <span>{formatDate(log.createdAt)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Sipariş Geçmişi</h2>
            {canShowHistory ? (
              <div className="space-y-4">
                {order.statusHistory!.map((h, i) => (
                  <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`mt-1 h-3 w-3 rounded-full ${
                        h.status === "delivered" ? "bg-green-500" :
                        h.status === "cancelled" ? "bg-red-500" :
                        h.status === "shipped" ? "bg-blue-500" :
                        "bg-amber-500"
                      }`} />
                      {i < order.statusHistory!.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
                    </div>
                    <div className="pb-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariant[h.status] || "default"}>{statusText[h.status] || h.status}</Badge>
                        <span className="text-xs text-gray-500">{h.changedBy}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-700">{h.note}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(h.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Geçmiş kaydı yok.</p>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><User size={16} /> Bayi / Kullanıcı</h2>
            <div className="space-y-3 text-sm">
              <InfoRow label="Bayi" value={order.dealer ? `${order.dealer.company} (${order.dealer.group})` : "Yok"} />
              <InfoRow label="İlgili kişi" value={order.dealer?.name || order.user?.name || "Yok"} />
              <InfoRow label="E-posta" value={order.dealer?.email || order.user?.email || "Yok"} />
              <InfoRow label="Telefon" value={order.dealer?.phone || "Yok"} />
              <InfoRow label="Sipariş No" value={order.orderNumber || "Oluşmadı"} />
              <InfoRow label="Vade" value={order.paymentTermDays ? `${order.paymentTermDays} gün • %${order.paymentTermRate}` : "Yok"} />
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><MapPin size={16} /> Adres ve Not</h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Adres</p>
                <p className="whitespace-pre-wrap text-gray-700">{order.address || "Adres yok"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Not</p>
                <p className="whitespace-pre-wrap text-gray-700">{order.notes || "Not yok"}</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Paperclip size={16} /> Ekler</h2>
            {order.attachments?.length ? (
              <div className="space-y-2">
                {order.attachments.map((att) => {
                  const kind = getFileKind(att.fileType, att.fileName);
                  return (
                    <a
                      key={att.id}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 transition-colors"
                    >
                      {kind === "image" ? (
                        <img src={att.fileUrl} alt={att.fileName} className="h-10 w-10 rounded object-cover bg-gray-100" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-amber-50">
                          <FileText size={16} className="text-amber-500" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{att.fileName}</p>
                        <p className="text-xs text-gray-500">{kind === "image" ? "Görsel" : "PDF / Belge"}</p>
                      </div>
                      <ExternalLink size={14} className="text-gray-400" />
                    </a>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Ek dosya yok.</p>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Wallet size={16} /> Ödeme</h2>
            <div className="space-y-3 text-sm">
              <InfoRow label="Yöntem" value={paymentInfo.label || "Belirsiz"} />
              <InfoRow label="Durum" value={order.status === "waiting_payment" ? "Ödeme bekleniyor" : "Tamamlandı / işleniyor"} />
              <InfoRow label="Taksit" value={String(installmentCount)} />
              <InfoRow label="Ödeme sonu" value={order.paymentDeadlineAt ? formatDate(order.paymentDeadlineAt) : "Yok"} />
              <InfoRow label="Kargo ücreti" value={shippingCost > 0 ? formatPrice(shippingCost) : "0"} />
            </div>

            {order.payments?.length ? (
              <div className="mt-4 space-y-2">
                {order.payments.map((p) => (
                  <div key={p.id} className="rounded-lg border border-gray-200 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.type}</p>
                        <p className="text-xs text-gray-500">{p.note || "Ödeme kaydı"}</p>
                      </div>
                      <p className="font-semibold text-gray-900">{formatPrice(p.amount)}</p>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                      <span>{p.status}</span>
                      <span>{formatDate(p.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">Ödeme kaydı yok.</p>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Building2 size={16} /> Sipariş Meta</h2>
            <div className="space-y-3 text-sm">
              <InfoRow label="Platform" value={metadata.platform || order.marketplace || "Yok"} />
              <InfoRow label="Firma" value={metadata.company || "Yok"} />
              <InfoRow label="Vergi / TCKN" value={metadata.taxId || "Yok"} />
              <InfoRow label="Fatura" value={metadata.invoiceAddress || "Yok"} />
              <InfoRow label="Teslimat" value={metadata.deliveryAddress || "Yok"} />
              <InfoRow label="Adres aynı mı" value={metadata.sameAddress ? "Evet" : "Hayır"} />
              <InfoRow label="Ödeme yöntemi" value={paymentInfo.label || "Belirsiz"} />
              <InfoRow label="Taksit" value={String(metadata.installmentCount || installmentCount || 1)} />
              <InfoRow label="Kupon" value={metadata.couponId ? `${metadata.couponId} • -${formatPrice(metadata.couponDiscount || 0)}` : "Yok"} />
              <InfoRow label="Kampanya" value={metadata.campaignLabel ? `${metadata.campaignLabel} • -${formatPrice(metadata.campaignDiscount || 0)}` : "Yok"} />
              <InfoRow label="Kargo" value={metadata.campaignFreeShip ? "Bedava" : formatPrice(metadata.shippingCost || shippingCost)} />
              <InfoRow label="Ara toplam" value={formatPrice(metadata.rawTotal || 0)} />
              <InfoRow label="Toplam indirim" value={formatPrice(metadata.discountTotal || order.discount || 0)} />
              <InfoRow label="Vade farkı" value={metadata.termFee ? formatPrice(metadata.termFee) : "Yok"} />
              <InfoRow label="Nihai toplam" value={formatPrice(metadata.finalTotal || order.total)} />
            </div>

            {order.metadataJson && (
              <details className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">Ham metadata</summary>
                <pre className="mt-3 overflow-auto text-xs text-gray-600 whitespace-pre-wrap break-words">{order.metadataJson}</pre>
              </details>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><FileText size={16} /> Faturalar</h2>
            {invoice ? (
              <div className="space-y-2">
                {order.invoices!.map((inv) =>
                  inv.pdfUrl ? (
                    <a
                      key={inv.id}
                      href={inv.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{inv.number}</p>
                        <p className="text-xs text-gray-500">{inv.paymentStatus} • {inv.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatPrice(inv.total)}</p>
                        <p className="text-xs text-gray-500">{formatDate(inv.createdAt)}</p>
                      </div>
                    </a>
                  ) : (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{inv.number}</p>
                        <p className="text-xs text-gray-500">{inv.paymentStatus} • {inv.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatPrice(inv.total)}</p>
                        <p className="text-xs text-gray-500">{formatDate(inv.createdAt)}</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Fatura kaydı yok.</p>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Truck size={16} /> Kargo ve Operasyon</h2>
            <div className="space-y-3 text-sm">
              <InfoRow label="Kargo firması" value={order.carrier || "Yok"} />
              <InfoRow label="Takip no" value={order.trackingNumber || "Yok"} />
              <InfoRow label="Backorder" value={order.hasBackorder ? "Var" : "Yok"} />
              <InfoRow label="Kaynak" value={order.sourceType || "Bilinmiyor"} />
              <InfoRow label="Oluşturulma" value={formatDate(order.createdAt)} />
              <InfoRow label="Güncelleme" value={formatDate(order.updatedAt)} />
            </div>

            {order.warehouseStatus ? (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={order.warehouseStatus.reserved ? "success" : "warning"}>
                    {order.warehouseStatus.reserved ? "Rezerve" : "Rezerv yok"}
                  </Badge>
                  {order.warehouseStatus.hasWarnings && <Badge variant="danger">Uyarı</Badge>}
                </div>
                {order.warehouseStatus.warnings.length > 0 && (
                  <ul className="space-y-1 text-xs text-amber-700">
                    {order.warehouseStatus.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                  </ul>
                )}
                <div className="mt-3 space-y-2">
                  {order.warehouseStatus.items.map((item) => (
                    <div key={item.orderItemId} className="flex items-center justify-between text-xs border-t border-gray-200 pt-2">
                      <span className="text-gray-700">{item.productName || "Ürün"}</span>
                      <span className="text-gray-500">
                        {item.unmatched ? "Eşleşmedi" : item.insufficient ? "Yetersiz stok" : item.reserved ? "Rezerve" : "Bekliyor"}
                        {item.availableStock != null ? ` • ${item.availableStock}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-gray-500">Stok durumu okunamadı.</div>
            )}
          </section>

          {order.status === "pending_approval" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              Bu sipariş henüz onay bekliyor. Ürün, adres ve kargo ekleri burada detaylı izlenebilir.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: ComponentType<{ size?: number; className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-gray-500 mb-2">
        <Icon size={16} />
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold text-gray-900 break-words">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
      <span className="text-right text-gray-900 break-words">{value}</span>
    </div>
  );
}
