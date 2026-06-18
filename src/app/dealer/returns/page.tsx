"use client";

import { useEffect, useState } from "react";
import { formatPrice, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw, Package, Plus } from "lucide-react";
import toast from "react-hot-toast";

interface ReturnReq {
  id: string; reason: string; status: string; adminNote: string; createdAt: string;
  order?: { id: string; total: number } | null;
  items: Array<{ id: string; productId: string; quantity: number; price: number; product: { name: string; image: string } }>;
}

const statusVariant: Record<string, "default" | "success" | "danger" | "warning"> = {
  pending: "warning", approved: "success", rejected: "danger",
};
const statusText: Record<string, string> = {
  pending: "Onay Bekliyor", approved: "Onaylandı", rejected: "Reddedildi",
};

export default function DealerReturnsPage() {
  const [requests, setRequests] = useState<ReturnReq[]>([]);
  const [orders, setOrders] = useState<Array<{ id: string; total: number; items: Array<{ productId: string; product: { name: string }; quantity: number; price: number }> }>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ orderId: "", reason: "", items: [] as Array<{ productId: string; quantity: number; price: number }> });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = () => {
    Promise.all([
      fetch("/api/dealer/returns").then((r) => r.json()),
      fetch("/api/dealer/orders").then((r) => r.json()),
    ]).then(([r, o]) => {
      setRequests(r.data || []);
      setOrders((o.data || []).filter((ord: any) => ord.status === "delivered" || ord.status === "approved" || ord.status === "shipped"));
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async () => {
    if (!form.items.length) return toast.error("En az bir ürün seçin");
    setSubmitting(true);
    const res = await fetch("/api/dealer/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: form.orderId || null, reason: form.reason, items: form.items }),
    });
    if (res.ok) {
      toast.success("İade talebi oluşturuldu");
      fetchData();
      setShowForm(false);
      setForm({ orderId: "", reason: "", items: [] });
    } else {
      const d = await res.json();
      toast.error(d.error || "Hata");
    }
    setSubmitting(false);
  };

  const selectOrderItems = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    setForm({
      ...form, orderId,
      items: order.items.map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ena-text">İade Talepleri</h1>
          <p className="text-sm text-ena-light/50 mt-1">Toplam {requests.length} talep</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-1.5 shadow-sm">
          <Plus size={15} /> Yeni İade Talebi
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm mb-6">
          <h2 className="text-base font-semibold text-ena-text mb-4">Yeni İade Talebi</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ena-text mb-1">Sipariş</label>
              <select className="w-full rounded-lg border border-ena-border px-3 py-2.5 text-sm focus:border-ena-border focus:outline-none" value={form.orderId} onChange={(e) => selectOrderItems(e.target.value)}>
                <option value="">Sipariş seç (isteğe bağlı)</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>#{o.id.slice(0, 8)} — {formatPrice(o.total)}</option>
                ))}
              </select>
            </div>
            {form.items.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-ena-text">İade Edilecek Ürünler</p>
                {form.items.map((item, i) => {
                  const p = orders.find((o) => o.id === form.orderId)?.items.find((oi) => oi.productId === item.productId);
                  return (
                    <div key={i} className="flex items-center gap-3 p-2 rounded bg-ena-card/20 text-sm">
                      <Package size={14} className="text-ena-light/40" />
                      <span className="flex-1">{p?.product.name || item.productId}</span>
                      <input type="number" min={1} max={item.quantity} value={item.quantity}
                        onChange={(e) => {
                          const items = [...form.items];
                          items[i].quantity = parseInt(e.target.value) || 0;
                          setForm({ ...form, items });
                        }}
                        className="w-16 rounded border border-ena-border px-2 py-1 text-sm text-center" />
                      <span className="text-ena-light/40 text-xs">/ {item.quantity}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-ena-text mb-1">Sebep</label>
              <textarea className="w-full rounded-lg border border-ena-border px-3 py-2.5 text-sm focus:border-ena-border focus:outline-none" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="İade sebebini açıklayın..." />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Gönderiliyor..." : "Talebi Gönder"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setForm({ orderId: "", reason: "", items: [] }); }}>İptal</Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-ena-light/40 text-center py-12">Yükleniyor...</p>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-ena-border rounded-xl bg-ena-card/30">
          <RotateCcw size={40} className="mx-auto text-ena-light/30" />
          <p className="mt-3 text-ena-light/50">Henüz iade talebiniz yok</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="rounded-xl border border-ena-border bg-ena-card/30 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={statusVariant[req.status] || "default"}>{statusText[req.status] || req.status}</Badge>
                    <span className="text-xs text-ena-light/40">{formatDate(req.createdAt)}</span>
                    {req.order && <span className="text-xs text-ena-light/40 font-mono">#{req.order.id.slice(0, 8)}</span>}
                  </div>
                  <p className="text-sm text-ena-text">{req.reason || "Sebep belirtilmedi"}</p>
                  {req.adminNote && <p className="text-xs text-ena-light/50 mt-1">Admin notu: {req.adminNote}</p>}
                </div>
              </div>
              <div className="space-y-1">
                {req.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs text-ena-light/70 bg-ena-card/20 rounded px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <Package size={12} />
                      <span>{item.product.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>x{item.quantity}</span>
                      <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
