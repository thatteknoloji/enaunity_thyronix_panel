"use client";

import { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import type { ProductionJobDto } from "@/lib/production-center/types";

type DealerOrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  marketplace: string;
  createdAt: string;
  dealer: { id: string; name: string };
  items: { id: string; name: string; quantity: number; sku: string }[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (job: ProductionJobDto) => void;
};

export function CreateFromDealerOrderDialog({ open, onClose, onCreated }: Props) {
  const [orders, setOrders] = useState<DealerOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/production/jobs?dealerOrders=1");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setOrders(json.data.dealerOrders ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Siparişler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  if (open && !orders.length && !loading) {
    void loadOrders();
  }

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  const create = async () => {
    if (!selectedOrderId) {
      toast.error("Bayi siparişi seçin");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/production/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealerOrderId: selectedOrderId,
          dealerOrderItemId: selectedItemId || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      onCreated(json.data);
      toast.success(`Üretim işi oluşturuldu: ${json.data.jobNumber}`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Oluşturulamadı");
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Kapat" />
      <div className="relative w-full max-w-lg rounded-xl border border-ena-border bg-ena-dark shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ena-text">Bayi Siparişinden Üretim İşi</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-white/5">
            <X className="h-5 w-5 text-ena-text-muted" />
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-ena-text-muted py-8 text-center">Siparişler yükleniyor…</p>
        ) : (
          <>
            <label className="block text-xs space-y-1">
              <span className="text-ena-text-muted">Bayi Siparişi</span>
              <select
                value={selectedOrderId}
                onChange={(e) => {
                  setSelectedOrderId(e.target.value);
                  setSelectedItemId("");
                }}
                className="w-full rounded-lg border border-ena-border bg-white/5 px-3 py-2 text-sm"
              >
                <option value="">Seçin</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} — {o.dealer.name} — {o.customerName || "Müşteri"}
                  </option>
                ))}
              </select>
            </label>
            {selectedOrder && selectedOrder.items.length > 1 && (
              <label className="block text-xs space-y-1">
                <span className="text-ena-text-muted">Kalem</span>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full rounded-lg border border-ena-border bg-white/5 px-3 py-2 text-sm"
                >
                  <option value="">İlk kalem</option>
                  {selectedOrder.items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ×{i.quantity} {i.sku && `(${i.sku})`}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        )}
        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-ena-border px-4 py-2 text-sm text-ena-text-muted hover:bg-white/5"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={() => void create()}
            disabled={creating || !selectedOrderId}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {creating ? "Oluşturuluyor…" : "Üretim İşi Oluştur"}
          </button>
        </div>
      </div>
    </div>
  );
}

type ManualProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (job: ProductionJobDto) => void;
};

export function CreateManualJobDialog({ open, onClose, onCreated }: ManualProps) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    productType: "",
    variant: "",
    widthCm: "",
    heightCm: "",
    quantity: "1",
    priority: "NORMAL",
    notes: "",
  });

  const create = async () => {
    if (!form.productType.trim()) {
      toast.error("Ürün tipi zorunlu");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/production/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderSource: "MANUAL",
          customerName: form.customerName,
          productType: form.productType,
          variant: form.variant,
          widthCm: Number(form.widthCm) || 0,
          heightCm: Number(form.heightCm) || 0,
          quantity: Number(form.quantity) || 1,
          priority: form.priority,
          notes: form.notes,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      onCreated(json.data);
      toast.success(`Üretim işi: ${json.data.jobNumber}`);
      onClose();
      setForm({
        customerName: "",
        productType: "",
        variant: "",
        widthCm: "",
        heightCm: "",
        quantity: "1",
        priority: "NORMAL",
        notes: "",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Oluşturulamadı");
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Kapat" />
      <div className="relative w-full max-w-md rounded-xl border border-ena-border bg-ena-dark shadow-2xl p-5 space-y-3">
        <h2 className="text-lg font-bold text-ena-text">Manuel Üretim İşi</h2>
        {(
          [
            ["customerName", "Müşteri", "text"],
            ["productType", "Ürün tipi *", "text"],
            ["variant", "Varyant", "text"],
            ["widthCm", "Genişlik (cm)", "number"],
            ["heightCm", "Yükseklik (cm)", "number"],
            ["quantity", "Adet", "number"],
          ] as const
        ).map(([key, label, type]) => (
          <label key={key} className="block text-xs space-y-1">
            <span className="text-ena-text-muted">{label}</span>
            <input
              type={type}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="w-full rounded-lg border border-ena-border bg-white/5 px-3 py-2 text-sm"
            />
          </label>
        ))}
        <label className="block text-xs space-y-1">
          <span className="text-ena-text-muted">Öncelik</span>
          <select
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            className="w-full rounded-lg border border-ena-border bg-white/5 px-3 py-2 text-sm"
          >
            <option value="LOW">Düşük</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Yüksek</option>
            <option value="URGENT">Acil</option>
          </select>
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Notlar"
          rows={2}
          className="w-full rounded-lg border border-ena-border bg-white/5 px-3 py-2 text-sm"
        />
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-ena-border px-4 py-2 text-sm">
            İptal
          </button>
          <button
            type="button"
            onClick={() => void create()}
            disabled={creating}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Oluştur
          </button>
        </div>
      </div>
    </div>
  );
}
