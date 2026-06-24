"use client";

import { useState } from "react";
import { Search, Package, Truck, CheckCircle, Clock, XCircle } from "lucide-react";

type OrderData = {
  id: string; status: string; totalAmount: number; itemsJson: string;
  customerName: string; shippingAddress: string; city: string; district: string;
  trackingCode: string; carrierName: string; notes: string;
  createdAt: string; storeName: string; storeSlug: string;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Sipariş Alındı",
  CONFIRMED: "Onaylandı",
  SHIPPED: "Kargoya Verildi",
  DELIVERED: "Teslim Edildi",
  CANCELLED: "İptal Edildi",
};

const STATUS_DESC: Record<string, string> = {
  PENDING: "Siparişiniz mağaza tarafından henüz onaylanmadı.",
  CONFIRMED: "Siparişiniz onaylandı, hazırlanıyor.",
  SHIPPED: "Siparişiniz kargoya verildi, yolda!",
  DELIVERED: "Siparişiniz teslim edildi. Bizi tercih ettiğiniz için teşekkürler.",
  CANCELLED: "Siparişiniz iptal edildi.",
};

const STATUS_ICONS: Record<string, typeof Package> = {
  PENDING: Clock, CONFIRMED: Package, SHIPPED: Truck, DELIVERED: CheckCircle, CANCELLED: XCircle,
};

const STATUS_STEPS = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"];

export default function SiparisTakipPage() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState("");

  const lookup = async () => {
    if (!orderId || !email) return;
    setLoading(true); setError(""); setOrder(null);
    try {
      const res = await fetch(`/api/public/order-lookup?id=${encodeURIComponent(orderId)}&email=${encodeURIComponent(email)}`);
      const d = await res.json();
      if (d.success) setOrder(d.data);
      else setError(d.error || "Sipariş bulunamadı");
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") lookup();
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Package size={48} className="mx-auto mb-3 text-orange-400" />
          <h1 className="text-2xl font-bold text-white">Sipariş Takip</h1>
          <p className="text-sm text-white/50 mt-1">Sipariş numaranız ve e-posta adresinizle durumu sorgulayın</p>
        </div>

        {!order && (
          <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 space-y-4">
            <input type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Sipariş numarası"
              className="w-full px-4 py-3 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="E-posta adresiniz"
              className="w-full px-4 py-3 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
            <button onClick={lookup} disabled={loading || !orderId || !email}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50">
              <Search size={16} />
              {loading ? "Sorgulanıyor..." : "Sorgula"}
            </button>
            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}
          </div>
        )}

        {order && (
          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-white/40">Sipariş No</p>
                  <p className="text-sm text-white font-mono">{order.id}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                  order.status === "CANCELLED" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                  order.status === "DELIVERED" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                  order.status === "SHIPPED" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                }`}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>
              <p className="text-xs text-white/40 mb-4">{order.storeName} &middot; {new Date(order.createdAt).toLocaleDateString("tr-TR")}</p>

              {(order.status === "SHIPPED" || order.status === "DELIVERED") && order.trackingCode && order.carrierName && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 mb-4">
                  <p className="flex items-center gap-1.5 text-purple-400 text-xs font-medium mb-1">
                    <Truck size={12} /> Kargo Takip
                  </p>
                  <p className="text-white text-sm">{order.carrierName} — {order.trackingCode}</p>
                </div>
              )}

              <div className="space-y-3">
                {STATUS_STEPS.map((step, idx) => {
                  const currentIdx = STATUS_STEPS.indexOf(order.status);
                  const completed = idx < currentIdx;
                  const active = idx === currentIdx;
                  const Icon = STATUS_ICONS[step] || Package;
                  return (
                    <div key={step} className={`flex items-start gap-3 ${!completed && !active && !(order.status === "CANCELLED" && idx === currentIdx) ? "opacity-30" : ""}`}>
                      <div className={`p-1.5 rounded-full ${
                        completed ? "bg-green-500/20 text-green-400" :
                        active ? "bg-orange-500/20 text-orange-400" :
                        "bg-white/10 text-white/40"
                      }`}>
                        <Icon size={14} />
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${
                          completed ? "text-green-400" : active ? "text-orange-400" : "text-white/40"
                        }`}>
                          {STATUS_LABELS[step]}
                        </p>
                        <p className="text-xs text-white/40">{STATUS_DESC[step]}</p>
                      </div>
                    </div>
                  );
                })}
                {order.status === "CANCELLED" && (
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-full bg-red-500/20 text-red-400">
                      <XCircle size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-400">{STATUS_LABELS.CANCELLED}</p>
                      <p className="text-xs text-white/40">{STATUS_DESC.CANCELLED}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 space-y-3">
              <h2 className="text-sm font-semibold text-white">Teslimat Bilgileri</h2>
              <p className="text-sm text-white/70">{order.customerName}</p>
              <p className="text-sm text-white/70">{order.shippingAddress}</p>
              {(order.city || order.district) && (
                <p className="text-sm text-white/70">{[order.district, order.city].filter(Boolean).join(" / ")}</p>
              )}
            </div>

            <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 space-y-2">
              <h2 className="text-sm font-semibold text-white">Ürünler</h2>
              {(() => {
                try {
                  const items = JSON.parse(order.itemsJson);
                  return items.map((i: { name?: string; quantity?: number; unitPrice?: number; lineTotal?: number }, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
                      <span className="text-white/70">{i.name || `Ürün #${idx + 1}`} x{i.quantity || 1}</span>
                      <span className="text-white font-medium">{i.lineTotal?.toFixed(2)} TL</span>
                    </div>
                  ));
                } catch {
                  return <p className="text-sm text-white/40">Ürün bilgisi yüklenemedi.</p>;
                }
              })()}
              <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                <span className="text-white font-semibold">Toplam</span>
                <span className="text-orange-400 font-bold">{order.totalAmount.toFixed(2)} TL</span>
              </div>
            </div>

            <button onClick={() => setOrder(null)}
              className="w-full py-3 text-sm text-white/50 hover:text-white transition-colors">
              ← Yeni Sorgulama
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
