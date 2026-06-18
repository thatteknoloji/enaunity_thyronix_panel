"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDate } from "@/lib/utils";
import { ChevronLeft, Package, FileText, XCircle, CheckCircle, Clock, Truck, Ban } from "lucide-react";
import toast from "react-hot-toast";
import { useCartStore } from "@/lib/cart-store";

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

export default function DealerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    fetch(`/api/dealer/orders/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setOrder(d.data); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    if (!confirm("Sipariş iptal edilsin mi?")) return;
    const res = await fetch(`/api/dealer/orders/${id}`, { method: "PUT" });
    const d = await res.json();
    if (d.success) {
      toast.success("Sipariş iptal edildi");
      setOrder((prev: any) => ({ ...prev, status: "cancelled" }));
    } else {
      toast.error(d.error || "İptal başarısız");
    }
  };

  const handleReorder = async () => {
    let success = 0;
    for (const item of order.items) {
      try {
        await addItem(item.productId, item.quantity);
        success++;
      } catch { /* skip */ }
    }
    if (success > 0) {
      toast.success(`${success} ürün sepete eklendi`);
      router.push("/cart");
    }
  };

  const generatePdf = async () => {
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
      doc.text(item.product.name.substring(0, 40), 20, y);
      doc.text(String(item.quantity), 120, y);
      doc.text(formatPrice(item.price), 140, y);
      doc.text(formatPrice(item.price * item.quantity), pageWidth - 20, y, { align: "right" });
      y += 6;
      if (y > 270) { doc.addPage(); y = 20; }
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

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-ena-card/50" /><div className="h-64 rounded bg-ena-card/50" /></div>;
  if (!order) return <p className="text-ena-light/50">Sipariş bulunamadı.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dealer/orders" className="inline-flex items-center gap-1 text-sm text-ena-light/50 hover:text-ena-text mb-2">
            <ChevronLeft size={16} /> Siparişlerime Dön
          </Link>
          <h1 className="text-2xl font-bold text-ena-text">Sipariş Detayı</h1>
          <p className="text-sm text-ena-light/50 mt-1">#{order.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-2">
          {(order.status === "pending" || order.status === "pending_approval") && (
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

      {order.warehouseStatus && (
        <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-ena-text mb-3">Depo / Stok Durumu</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant={order.warehouseStatus.reserved ? "success" : "warning"}>
              {order.warehouseStatus.reserved ? "Rezerve edildi" : "Rezervasyon yok"}
            </Badge>
            {order.warehouseStatus.hasWarnings && (
              <Badge variant="danger">Stok uyarısı</Badge>
            )}
            {order.fulfillmentStatus && (
              <Badge variant="default">{order.fulfillmentStatus}</Badge>
            )}
          </div>
          {order.warehouseStatus.warnings?.length > 0 && (
            <ul className="text-xs text-amber-600 mb-3 space-y-1">
              {order.warehouseStatus.warnings.map((w: string, i: number) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          )}
          <div className="space-y-2">
            {order.warehouseStatus.items?.map((item: any) => (
              <div key={item.orderItemId} className="flex justify-between text-sm border-t border-ena-border pt-2">
                <span className="text-ena-text">{item.productName || "Ürün"}</span>
                <span className="text-ena-light/60">
                  {item.unmatched ? "Eşleşmedi" : item.insufficient ? "Yetersiz stok" : item.reserved ? "Rezerve" : "Bekliyor"}
                  {item.availableStock != null ? ` · Mevcut: ${item.availableStock}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {order.statusHistory && order.statusHistory.length > 0 && (
        <div className="rounded-xl border border-ena-border bg-ena-card/30 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-ena-text mb-4">Sipariş Geçmişi</h2>
          <div className="space-y-0">
            {order.statusHistory.map((h: any, i: number) => (
              <div key={h.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full ring-2 ${
                    h.status === "delivered" ? "bg-green-500 ring-green-200" :
                    h.status === "cancelled" ? "bg-ena-primary/50 ring-red-200" :
                    h.status === "shipped" ? "bg-blue-500 ring-blue-200" :
                    "bg-amber-500 ring-amber-200"
                  }`} />
                  {i < order.statusHistory.length - 1 && <div className="w-px flex-1 bg-ena-card/50 my-1" />}
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
      )}

      <div className="rounded-xl border border-ena-border bg-ena-card/30 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-ena-border">
          <h2 className="text-sm font-semibold text-ena-text">Sipariş İçeriği</h2>
        </div>
        <div className="divide-y divide-ena-border">
          {order.items.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between px-5 py-4 hover:bg-ena-card/40">
              <div className="flex items-center gap-3">
                <img src={item.product.image} alt="" className="h-12 w-12 rounded object-cover" />
                <div>
                  <p className="text-sm font-medium text-ena-text">{item.product.name}</p>
                  <p className="text-xs text-ena-light/50">{item.quantity} adet x {formatPrice(item.price)}</p>
                </div>
              </div>
              <p className="text-sm font-bold text-ena-text">{formatPrice(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 bg-ena-card/20 border-t border-ena-border">
          <div className="flex justify-between text-base">
            <span className="font-semibold text-ena-text">Genel Toplam</span>
            <span className="font-bold text-ena-text">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ena-text mb-2">Teslimat Adresi</h2>
        <p className="text-sm text-ena-light/70 whitespace-pre-wrap">{order.address}</p>
      </div>
    </div>
  );
}
