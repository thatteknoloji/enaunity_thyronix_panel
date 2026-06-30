"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useCartStore } from "@/lib/cart-store";
import { formatDate, formatPrice } from "@/lib/utils";
import { getOrderPaymentInfo } from "@/lib/orders/payment-metadata";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendToProductionButton } from "@/components/production-center/SendToProductionButton";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Link2,
  Paperclip,
  PencilLine,
  Package,
  Truck,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  canUnlockDigitalDelivery,
  digitalModeLabel,
  parseDigitalDeliverySnapshot,
} from "@/lib/products/digital-delivery";

const statusVariant: Record<string, "default" | "success" | "warning" | "danger"> = {
  pending_approval: "warning",
  pending: "warning",
  shipped: "default",
  delivered: "success",
  cancelled: "danger",
};

const statusText: Record<string, string> = {
  pending_approval: "Onay Bekliyor",
  approved: "Onaylandı",
  pending: "Hazırlanıyor",
  shipped: "Kargoda",
  delivered: "Teslim Edildi",
  cancelled: "İptal Edildi",
};

type OrderAttachment = { id: string; fileName: string; fileUrl: string; fileType: string };
type OrderPayment = { id: string; amount: number; type: string; status: string; note: string; createdAt: string };
type OrderInvoice = { id: string; number: string; status: string; paymentStatus: string; total: number; pdfUrl: string; createdAt: string };

type OrderDetail = {
  id: string;
  orderNumber?: string;
  sourceType?: string;
  marketplace?: string;
  trackingNumber?: string;
  carrier?: string;
  status: string;
  total: number;
  discount: number;
  address: string;
  notes: string;
  metadataJson?: string | null;
  paymentDeadlineAt?: string | null;
  hasBackorder?: boolean;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    metadataJson?: string | null;
    product?: { name?: string | null; image?: string | null } | null;
    productCatalogItem?: { name?: string | null; imagesJson?: string | null } | null;
  }>;
  statusHistory?: Array<{ id: string; status: string; note: string; changedBy: string; createdAt: string }>;
  attachments?: OrderAttachment[];
  payments?: OrderPayment[];
  invoices?: OrderInvoice[];
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

function parseMetadata(value?: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function getFileKind(fileType?: string, fileName?: string) {
  const name = (fileName || "").toLowerCase();
  const type = (fileType || "").toLowerCase();
  if (type.includes("image") || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name)) return "image";
  return "pdf";
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-ena-light/50">{label}</span>
      <span className="text-right text-ena-text break-words">{value}</span>
    </div>
  );
}

function parseDigitalMetadata(value?: string | null) {
  const metadata = parseMetadata(value);
  return parseDigitalDeliverySnapshot((metadata as { digitalDelivery?: unknown }).digitalDelivery);
}

export default function DealerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [draftAddress, setDraftAddress] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [openingGrantId, setOpeningGrantId] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/dealer/orders/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setOrder(d.data);
          setDraftAddress(d.data.address || "");
          setDraftNotes(d.data.notes || "");
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const paymentInfo = order ? getOrderPaymentInfo(order) : { method: "", label: "", locked: false };
  const canEditOrder = !!order && ["pending", "pending_approval", "waiting_payment"].includes(order.status);
  const metadata = useMemo(() => parseMetadata(order?.metadataJson), [order?.metadataJson]);
  const digitalItems = useMemo(() => order?.digitalDeliveries || [], [order?.digitalDeliveries]);
  const invoice = order?.invoices?.[0] || null;

  const openSecureLink = async (grantId: string) => {
    setOpeningGrantId(grantId);
    const res = await fetch(`/api/digital-access/${grantId}/token`, { method: "POST" });
    const data = await res.json();
    if (!data.success) {
      toast.error(data.error || "Güvenli link açılamadı");
      setOpeningGrantId("");
      return;
    }
    window.open(data.data.url, "_blank", "noopener,noreferrer");
    setOpeningGrantId("");
  };

  const handleSave = async () => {
    if (!canEditOrder) return;
    setSaving(true);
    const res = await fetch(`/api/dealer/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", address: draftAddress, notes: draftNotes }),
    });
    const d = await res.json();
    if (d.success) {
      toast.success("Sipariş güncellendi");
      setOrder((prev) => (prev ? { ...prev, address: draftAddress, notes: draftNotes } : prev));
    } else {
      toast.error(d.error || "Güncelleme başarısız");
    }
    setSaving(false);
  };

  const handleCancel = async () => {
    if (!order || !confirm("Sipariş iptal edilsin mi?")) return;
    const res = await fetch(`/api/dealer/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    const d = await res.json();
    if (d.success) {
      toast.success("Sipariş iptal edildi");
      setOrder((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
    } else {
      toast.error(d.error || "İptal başarısız");
    }
  };

  const handleReorder = async () => {
    if (!order) return;
    let success = 0;
    for (const item of order.items) {
      const productId = (item as { productId?: string }).productId;
      if (!productId) continue;
      try {
        await addItem(productId, item.quantity);
        success++;
      } catch {
        /* ignore */
      }
    }
    if (success > 0) {
      toast.success(`${success} ürün sepete eklendi`);
      router.push("/cart");
    }
  };

  const copyOrderId = async () => {
    if (!order) return;
    await navigator.clipboard.writeText(order.id);
    toast.success("Sipariş no kopyalandı");
  };

  const generatePdf = async () => {
    if (!order) return;
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(18).setFont("helvetica", "bold");
    doc.text("ENA B4B", pageWidth / 2, y, { align: "center" });
    y += 8;
    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.text("FATURA", pageWidth / 2, y, { align: "center" });
    y += 12;

    doc.setFontSize(10).setFont("helvetica", "bold");
    doc.text(`Fatura No: INV-${order.id.slice(0, 8).toUpperCase()}`, 20, y);
    doc.text(`Tarih: ${formatDate(order.createdAt)}`, pageWidth - 20, y, { align: "right" });
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text(`Sipariş No: #${order.id.slice(0, 8)}`, 20, y);
    y += 10;

    doc.setDrawColor(200).line(20, y, pageWidth - 20, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text("Ürün", 20, y);
    doc.text("Adet", 120, y);
    doc.text("Birim Fiyat", 140, y);
    doc.text("Toplam", pageWidth - 20, y, { align: "right" });
    y += 4;
    doc.setDrawColor(200).line(20, y, pageWidth - 20, y);
    y += 6;
    doc.setFont("helvetica", "normal");

    for (const item of order.items) {
      doc.text((item.product?.name || item.productCatalogItem?.name || "Ürün").substring(0, 40), 20, y);
      doc.text(String(item.quantity), 120, y);
      doc.text(formatPrice(item.price), 140, y);
      doc.text(formatPrice(item.price * item.quantity), pageWidth - 20, y, { align: "right" });
      y += 6;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }

    y += 2;
    doc.setDrawColor(200).line(20, y, pageWidth - 20, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Genel Toplam", 20, y);
    doc.text(formatPrice(order.total), pageWidth - 20, y, { align: "right" });
    y += 10;

    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text("Bu belge ENA B4B sistemi tarafından otomatik oluşturulmuştur.", pageWidth / 2, y + 20, { align: "center" });

    doc.save(`INV-${order.id.slice(0, 8).toUpperCase()}.pdf`);
  };

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-ena-card/50" /><div className="h-64 rounded bg-ena-card/50" /></div>;
  }

  if (!order) {
    return <p className="text-ena-light/50">Sipariş bulunamadı.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href="/dealer/orders" className="inline-flex items-center gap-1 text-sm text-ena-light/50 hover:text-ena-text mb-2">
            <ArrowLeft size={16} /> Siparişlerime Dön
          </Link>
          <h1 className="text-2xl font-bold text-ena-text">Sipariş Detayı</h1>
          <p className="text-sm text-ena-light/50 mt-1">#{order.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SendToProductionButton coreOrderId={order.id} disabled={order.status === "cancelled"} />
          <Button variant="outline" onClick={copyOrderId} className="gap-2 border-ena-border text-ena-light">
            <Copy size={16} /> Kopyala
          </Button>
          {canEditOrder && (
            <Button variant="outline" onClick={handleCancel} className="gap-2 text-ena-primary border-red-200 hover:bg-ena-primary/5">
              <XCircle size={16} /> İptal Et
            </Button>
          )}
          <Button variant="outline" onClick={handleReorder} className="gap-2 border-ena-border text-ena-light">
            <Package size={16} /> Tekrar Sipariş Ver
          </Button>
          <Button onClick={generatePdf} className="gap-2">
            <FileText size={16} /> Fatura İndir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-ena-light/50 mb-1">Durum</p>
          <Badge variant={statusVariant[order.status] || "default"}>{statusText[order.status] || order.status}</Badge>
        </div>
        <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-ena-light/50 mb-1">Tarih</p>
          <p className="font-semibold text-ena-text">{formatDate(order.createdAt)}</p>
        </div>
        <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-ena-light/50 mb-1">Toplam</p>
          <p className="text-xl font-bold text-ena-text">{formatPrice(order.total)}</p>
          {order.discount > 0 && (
            <p className="mt-2 text-xs text-emerald-500">İndirim: -{formatPrice(order.discount)}</p>
          )}
          {paymentInfo.method && (
            <p className="mt-2 inline-flex rounded-full border border-ena-border bg-white px-2.5 py-1 text-[11px] font-medium text-ena-light/70">
              {paymentInfo.label}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-ena-light/50 mb-1">Kargo</p>
          {order.trackingNumber ? (
            <div>
              <p className="font-semibold text-ena-text">{order.carrier || "Kargo"}</p>
              <p className="text-sm text-blue-600 font-mono">{order.trackingNumber}</p>
            </div>
          ) : (
            <p className="text-sm text-ena-light/40">Henüz gönderilmedi</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="rounded-xl border border-ena-border bg-ena-card/30 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-ena-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ena-text">Sipariş İçeriği</h2>
              <span className="text-xs text-ena-light/50">{order.items.length} satır</span>
            </div>
            <div className="divide-y divide-ena-border">
              {order.items.map((item) => {
                const name = item.product?.name || item.productCatalogItem?.name || "Ürün";
                const image = item.product?.image || "/placeholder.svg";
                const digitalDelivery = parseDigitalMetadata(item.metadataJson);
                return (
                  <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-ena-card/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={image} alt={name} className="h-12 w-12 rounded object-cover shrink-0 bg-black/10" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ena-text truncate">{name}</p>
                        <p className="text-xs text-ena-light/50">{item.quantity} adet x {formatPrice(item.price)}</p>
                        {digitalDelivery ? (
                          <p className="mt-1 inline-flex rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-200">
                            {digitalModeLabel(digitalDelivery.mode)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-sm font-bold text-ena-text shrink-0">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-4 bg-ena-card/20 border-t border-ena-border flex justify-between text-base">
              <span className="font-semibold text-ena-text">Genel Toplam</span>
              <span className="font-bold text-ena-text">{formatPrice(order.total)}</span>
            </div>
          </div>

          {digitalItems.length > 0 ? (
            <div className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-indigo-100">
                <Download size={16} /> Dijital Teslimatlar
              </h2>
              <div className="space-y-3">
                {digitalItems.map((delivery) => {
                  return (
                    <div key={delivery.id} className="rounded-2xl border border-indigo-300/20 bg-black/10 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{delivery.productName}</p>
                          <p className="mt-1 text-xs text-indigo-100/80">{delivery.modeLabel}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${delivery.canAccess ? "bg-emerald-500/15 text-emerald-200" : delivery.status === "revoked" ? "bg-rose-500/15 text-rose-100" : "bg-amber-500/15 text-amber-100"}`}>
                          {delivery.statusLabel}
                        </span>
                      </div>
                      {delivery.accessInstructions ? (
                        <p className="mt-3 whitespace-pre-wrap text-sm text-indigo-100/85">{delivery.accessInstructions}</p>
                      ) : null}
                      {delivery.licenseValue ? (
                        <div className="mt-3 rounded-xl border border-indigo-300/20 bg-white/5 p-3">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-100/60">Lisans / Erişim İçeriği</p>
                          <p className="whitespace-pre-wrap break-words font-mono text-sm text-white">{delivery.licenseValue}</p>
                          {delivery.licenseSource ? (
                            <p className="mt-2 text-xs text-indigo-100/60">Kaynak: {delivery.licenseSource}</p>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {delivery.assetUrl && delivery.canAccess ? (
                          <Button
                            variant="outline"
                            className="gap-2 border-indigo-300/20 bg-white/10 text-white hover:bg-white/20"
                            onClick={() => openSecureLink(delivery.id)}
                            disabled={openingGrantId === delivery.id}
                          >
                            {delivery.mode === "external_access" ? <Link2 size={14} /> : <Download size={14} />}
                            {openingGrantId === delivery.id
                              ? "Hazırlanıyor..."
                              : delivery.assetName || (delivery.mode === "external_access" ? "Erişimi Aç" : "Dosyayı İndir")}
                          </Button>
                        ) : null}
                        {delivery.downloadLimit ? (
                          <span className="text-xs text-indigo-100/60">İndirme: {delivery.downloadCount}/{delivery.downloadLimit}</span>
                        ) : null}
                      </div>
                      {delivery.lastAccessedAt ? (
                        <p className="mt-3 text-xs text-indigo-100/60">Son erişim: {formatDate(delivery.lastAccessedAt)}</p>
                      ) : null}
                      {delivery.logs.length > 0 ? (
                        <div className="mt-3 rounded-xl border border-indigo-300/20 bg-white/5 p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-100/60">Son Hareketler</p>
                          <div className="space-y-1 text-xs text-indigo-100/70">
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
            </div>
          ) : null}

          {order.statusHistory && order.statusHistory.length > 0 && (() => {
            const history = order.statusHistory;
            return (
            <div className="rounded-xl border border-ena-border bg-ena-card/30 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-ena-text mb-4">Sipariş Geçmişi</h2>
              <div className="space-y-0">
                {history.map((h, i) => (
                  <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full ring-2 ${
                        h.status === "delivered" ? "bg-green-500 ring-green-200" :
                        h.status === "cancelled" ? "bg-ena-primary/50 ring-red-200" :
                        h.status === "shipped" ? "bg-blue-500 ring-blue-200" :
                        "bg-amber-500 ring-amber-200"
                      }`} />
                      {i < history.length - 1 && <div className="w-px flex-1 bg-ena-card/50 my-1" />}
                    </div>
                    <div className="pb-4 flex-1">
                      <p className="text-sm font-medium text-ena-text">{statusText[h.status] || h.status}</p>
                      <p className="text-xs text-ena-light/50">{h.note}</p>
                      <p className="text-xs text-ena-light/40">{formatDate(h.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            );
          })()}

          <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-ena-text mb-2">Teslimat Adresi</h2>
            {canEditOrder ? (
              <div className="space-y-3">
                <Input value={draftAddress} onChange={(e) => setDraftAddress(e.target.value)} label="Adres" />
                <div>
                  <label className="block text-sm font-medium text-ena-light mb-1">Sipariş Notu</label>
                  <textarea
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    rows={4}
                    className="w-full rounded border border-ena-border bg-ena-card/50 px-3 py-2.5 text-sm text-ena-text shadow-sm placeholder:text-ena-text-muted/50 focus:border-ena-text/40 focus:outline-none focus:ring-1 focus:ring-ena-border"
                    placeholder="Not ekleyin..."
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    <PencilLine size={16} /> {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                  </Button>
                  <span className="text-xs text-ena-light/50">Admin onayı gelmeden adres ve notu değiştirebilirsiniz.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-ena-light/70 whitespace-pre-wrap">{order.address}</p>
                <div className="rounded-lg border border-ena-border bg-white/60 p-3">
                  <p className="text-xs font-semibold uppercase text-ena-light/50 mb-1">Sipariş Notu</p>
                  <p className="text-sm text-ena-light/70 whitespace-pre-wrap">{order.notes || "Not eklenmemiş"}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-ena-text mb-3 flex items-center gap-2"><Building2 size={16} /> Sipariş Meta</h2>
            <div className="space-y-3 text-sm">
              <MetaRow label="Platform" value={String(metadata.platform || order.marketplace || "Yok")} />
              <MetaRow label="Sipariş No" value={String(order.orderNumber || order.id.slice(0, 8).toUpperCase())} />
              <MetaRow label="Kaynak" value={String(order.sourceType || "Bilinmiyor")} />
              <MetaRow label="Fatura" value={String(metadata.invoiceAddress || order.address || "Yok")} />
              <MetaRow label="Teslimat" value={String(metadata.deliveryAddress || order.address || "Yok")} />
              <MetaRow label="Ödeme yöntemi" value={paymentInfo.label || "Belirsiz"} />
              <MetaRow label="Vade" value={order.paymentDeadlineAt ? formatDate(order.paymentDeadlineAt) : "Yok"} />
              <MetaRow label="Backorder" value={order.hasBackorder ? "Var" : "Yok"} />
            </div>
          </div>

          <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-ena-text mb-3 flex items-center gap-2"><Wallet size={16} /> Ödeme</h2>
            <div className="space-y-3 text-sm">
              <MetaRow label="Yöntem" value={paymentInfo.label || "Belirsiz"} />
              <MetaRow label="Taksit" value={String(Number(metadata.installmentCount || 1) || 1)} />
              <MetaRow label="Kargo ücreti" value={metadata.shippingCost ? formatPrice(Number(metadata.shippingCost)) : "0"} />
              <MetaRow label="İndirim" value={formatPrice(order.discount || 0)} />
              <MetaRow label="Nihai toplam" value={formatPrice(order.total)} />
            </div>
            {order.payments?.length ? (
              <div className="mt-4 space-y-2">
                {order.payments.map((p) => (
                  <div key={p.id} className="rounded-lg border border-ena-border px-3 py-2 bg-black/10">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-ena-text">{p.type}</p>
                        <p className="text-xs text-ena-light/50">{p.note || "Ödeme kaydı"}</p>
                      </div>
                      <p className="font-semibold text-ena-text">{formatPrice(p.amount)}</p>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-ena-light/50">
                      <span>{p.status}</span>
                      <span>{formatDate(p.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-ena-light/50">Ödeme kaydı yok.</p>
            )}
          </div>

          <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-ena-text mb-3 flex items-center gap-2"><Paperclip size={16} /> Ekler</h2>
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
                      className="flex items-center gap-3 rounded-lg border border-ena-border px-3 py-2 hover:bg-ena-card/40 transition-colors"
                    >
                      {kind === "image" ? (
                        <img src={att.fileUrl} alt={att.fileName} className="h-10 w-10 rounded object-cover bg-black/10" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-amber-50">
                          <FileText size={16} className="text-amber-500" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ena-text truncate">{att.fileName}</p>
                        <p className="text-xs text-ena-light/50">{kind === "image" ? "Görsel" : "PDF / Belge"}</p>
                      </div>
                      <ExternalLink size={14} className="text-ena-light/40" />
                    </a>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-ena-light/50">Ek dosya yok.</p>
            )}
          </div>

          <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-ena-text mb-3 flex items-center gap-2"><Truck size={16} /> Kargo ve Operasyon</h2>
            <div className="space-y-3 text-sm">
              <MetaRow label="Kargo firması" value={order.carrier || "Yok"} />
              <MetaRow label="Takip no" value={order.trackingNumber || "Yok"} />
              <MetaRow label="Oluşturulma" value={formatDate(order.createdAt)} />
              <MetaRow label="Güncelleme" value={formatDate(order.updatedAt)} />
            </div>

            {order.warehouseStatus ? (
              <div className="mt-4 rounded-lg border border-ena-border bg-black/10 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={order.warehouseStatus.reserved ? "success" : "warning"}>
                    {order.warehouseStatus.reserved ? "Rezerve" : "Rezerv yok"}
                  </Badge>
                  {order.warehouseStatus.hasWarnings && <Badge variant="danger">Uyarı</Badge>}
                </div>
                {order.warehouseStatus.warnings.length > 0 && (
                  <ul className="space-y-1 text-xs text-amber-300">
                    {order.warehouseStatus.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                  </ul>
                )}
                <div className="mt-3 space-y-2">
                  {order.warehouseStatus.items.map((item) => (
                    <div key={item.orderItemId} className="flex items-center justify-between text-xs border-t border-ena-border pt-2">
                      <span className="text-ena-text">{item.productName || "Ürün"}</span>
                      <span className="text-ena-light/50">
                        {item.unmatched ? "Eşleşmedi" : item.insufficient ? "Yetersiz stok" : item.reserved ? "Rezerve" : "Bekliyor"}
                        {item.availableStock != null ? ` • ${item.availableStock}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-ena-light/50">Stok durumu okunamadı.</div>
            )}
          </div>

          {invoice ? (
            <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-ena-text mb-3 flex items-center gap-2"><Download size={16} /> Faturalar</h2>
              <div className="space-y-2">
                {order.invoices!.map((inv) => (
                  <a
                    key={inv.id}
                    href={inv.pdfUrl || "#"}
                    target={inv.pdfUrl ? "_blank" : undefined}
                    rel={inv.pdfUrl ? "noopener noreferrer" : undefined}
                    className="flex items-center justify-between rounded-lg border border-ena-border px-3 py-2 hover:bg-ena-card/40 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-ena-text">{inv.number}</p>
                      <p className="text-xs text-ena-light/50">{inv.paymentStatus} • {inv.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-ena-text">{formatPrice(inv.total)}</p>
                      <p className="text-xs text-ena-light/50">{formatDate(inv.createdAt)}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {!canEditOrder && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              Sipariş admin onayından sonra kilitlenir. Bu aşamada iptal, adres ve not değişikliği kapalıdır.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
