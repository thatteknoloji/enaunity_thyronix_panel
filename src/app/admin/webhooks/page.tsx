"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Plus, Webhook, Activity, CheckCircle, XCircle, Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const EVENT_OPTIONS = [
  { value: "order.created", label: "Sipariş Oluşturuldu" },
  { value: "order.updated", label: "Sipariş Güncellendi" },
  { value: "order.status_changed", label: "Sipariş Durumu Değişti" },
  { value: "product.updated", label: "Ürün Güncellendi" },
  { value: "product.stock_changed", label: "Stok Değişti" },
  { value: "dealer.created", label: "Bayi Oluşturuldu" },
  { value: "dealer.updated", label: "Bayi Güncellendi" },
  { value: "dealer.balance_changed", label: "Bakiye Değişti" },
];

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string;
  secret: string;
  active: boolean;
  lastCall: string | null;
  lastStatus: number | null;
  failCount: number;
  createdAt: string;
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", events: [] as string[], secret: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/webhooks").then(r => r.json()).then(d => {
      if (d.success) setWebhooks(d.data);
    }).finally(() => setLoading(false));
  }, []);

  const toggleEvent = (event: string) => {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  };

  const handleSave = async () => {
    if (!form.name || !form.url || form.events.length === 0) {
      toast.error("Gerekli alanları doldurun");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (d.success) {
      toast.success("Webhook eklendi");
      setWebhooks(prev => [d.data, ...prev]);
      setShowModal(false);
      setForm({ name: "", url: "", events: [], secret: "" });
    } else {
      toast.error(d.error);
    }
    setSaving(false);
  };

  const toggleActive = async (webhook: WebhookEndpoint) => {
    const res = await fetch(`/api/admin/webhooks/${webhook.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !webhook.active }),
    });
    const d = await res.json();
    if (d.success) {
      setWebhooks(prev => prev.map(w => w.id === webhook.id ? { ...w, active: !w.active } : w));
      toast.success(webhook.active ? "Webhook devre dışı" : "Webhook aktif");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Webhook silinsin mi?")) return;
    const res = await fetch(`/api/admin/webhooks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setWebhooks(prev => prev.filter(w => w.id !== id));
      toast.success("Webhook silindi");
    }
  };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-gray-100"/><div className="h-64 rounded bg-gray-100"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webhook Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-0.5">ERP ve harici sistem entegrasyonları için webhook uç noktaları</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2"><Plus size={16} /> Yeni Webhook</Button>
      </div>

      {webhooks.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white">
          <Webhook size={48} className="mx-auto text-gray-200" />
          <p className="mt-3 text-gray-500">Henüz webhook tanımlanmamış</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(wh => {
            const events = JSON.parse(wh.events || "[]");
            return (
              <div key={wh.id} className="rounded-xl border border-gray-200 bg-white p-5 hover:border-gray-300 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{wh.name}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${wh.active ? "bg-emerald-100 text-emerald-700" : "bg-ena-primary/10 text-ena-primary"}`}>
                        {wh.active ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        {wh.active ? "Aktif" : "Pasif"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-mono mt-1 truncate">{wh.url}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {events.map((e: string) => (
                        <span key={e} className="px-2 py-0.5 rounded bg-gray-100 text-[10px] text-gray-500">{EVENT_OPTIONS.find(o => o.value === e)?.label || e}</span>
                      ))}
                    </div>
                    {wh.lastCall && (
                      <p className="text-[10px] text-gray-400 mt-2">
                        Son çağrı: {new Date(wh.lastCall).toLocaleString("tr-TR")} · Durum: {wh.lastStatus || "Başarısız"} · Hata: {wh.failCount}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Button variant="outline" size="sm" onClick={() => toggleActive(wh)} className="border-gray-200 text-gray-500">
                      {wh.active ? "Devre Dışı" : "Aktifleştir"}
                    </Button>
                    <button onClick={() => handleDelete(wh.id)} className="p-2 rounded-lg text-gray-400 hover:text-ena-primary hover:bg-ena-primary/5 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Yeni Webhook Ekle" size="md">
        <div className="space-y-4">
          <Input label="Webhook Adı" placeholder="Örn: ERP Sipariş Senkronizasyonu" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} />
          <Input label="Hedef URL" placeholder="https://erp.sirket.com/webhook" value={form.url} onChange={(e) => setForm(prev => ({ ...prev, url: e.target.value }))} />
          <Input label="Gizli Anahtar (opsiyonel)" placeholder="HMAC imzası için gizli anahtar" value={form.secret} onChange={(e) => setForm(prev => ({ ...prev, secret: e.target.value }))} type="password" />

          <div>
            <p className="text-sm font-medium text-gray-900 mb-2">Olaylar</p>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input type="checkbox" checked={form.events.includes(opt.value)} onChange={() => toggleEvent(opt.value)} className="rounded border-gray-300" />
                  <span className="text-xs text-gray-600">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)} className="border-gray-200 text-gray-500">İptal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
