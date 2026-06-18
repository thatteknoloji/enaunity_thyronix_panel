"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Plus, Trash2, Store, Zap, MessageCircle, ArrowLeft, Eye,
  Package, Phone, MapPin, CreditCard, X, RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

const PLATFORMS: Record<string, { name: string; color: string }> = {
  trendyol: { name: "Trendyol", color: "bg-purple-100 text-purple-700" },
  hepsiburada: { name: "Hepsiburada", color: "bg-orange-100 text-orange-700" },
  n11: { name: "N11", color: "bg-blue-100 text-blue-700" },
};
const MATCH_LABELS: Record<string, string> = {
  product_name: "Ürün Adı", barcode: "Barkod", sku: "Model Kod", category: "Kategori",
};
const STATUS: Record<string, { l: string; c: string }> = {
  new: { l: "Yeni", c: "bg-blue-100 text-blue-700" },
  processing: { l: "İşleniyor", c: "bg-yellow-100 text-yellow-700" },
  completed: { l: "Tamamlandı", c: "bg-green-100 text-green-700" },
  pending_payment: { l: "Bakiye Bekliyor", c: "bg-ena-primary/10 text-ena-primary" },
  awaiting_status: { l: "Statü Bekliyor", c: "bg-purple-100 text-purple-700" },
};

export default function DealerIntegrationsPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [dealerInfo, setDealerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [telegramId, setTelegramId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [form, setForm] = useState({
    platform: "trendyol", sellerId: "", apiKey: "", apiSecret: "", matchMethod: "product_name",
  });

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/dealer/marketplace");
    const d = await res.json();
    if (d.success) {
      setConnections(d.data.connections || []);
      setOrders(d.data.orders || []);
      setDealerInfo(d.data.dealer);
      if (d.data.dealer) setTelegramId(d.data.dealer.telegramChatId || "");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.sellerId || !form.apiKey) return toast.error("Seller ID ve API Key zorunlu");
    setSaving(true);
    const res = await fetch("/api/dealer/marketplace", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: editing ? "update" : "create", ...form, id: editing }),
    });
    const d = await res.json();
    if (d.success) { toast.success(editing ? "Güncellendi" : "Mağaza bağlandı!"); load(); setShowForm(false); setEditing(null); }
    else toast.error(d.error || "Hata");
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu bağlantıyı silmek istediğinize emin misiniz?")) return;
    await fetch("/api/dealer/marketplace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    load();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await fetch("/api/dealer/marketplace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", id, active: !active }) });
    load();
  };

  const handleSaveTelegram = async () => {
    await fetch("/api/dealer/marketplace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "saveTelegram", telegramChatId: telegramId }) });
    toast.success("Telegram ID kaydedildi");
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dealer" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Pazar Yeri Entegrasyonlarım</h1>
          <p className="mt-1 text-sm text-gray-500">Mağazalarınızı bağlayın, siparişler otomatik gelsin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-gray-500 uppercase mb-1">Bakiyem</p>
          <p className="text-3xl font-black text-gray-900">₺{dealerInfo?.balance?.toFixed(2) || "0.00"}</p>
          <p className="text-xs text-gray-400 mt-1">Otomatik işlem için yeterli bakiye gerekir</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-gray-500 uppercase mb-1">Bağlı Mağaza</p>
          <p className="text-3xl font-black text-gray-900">{connections.filter(c => c.active).length}</p>
          <p className="text-xs text-gray-400 mt-1">Aktif / {connections.length} toplam</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-gray-500 uppercase mb-1">Toplam Sipariş</p>
          <p className="text-3xl font-black text-gray-900">{orders.length}</p>
          <p className="text-xs text-gray-400 mt-1">Son 7 gün</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
        <p className="text-xs text-gray-500 uppercase mb-1 flex items-center gap-1"><MessageCircle size={12} /> Telegram Bildirim</p>
        <div className="flex gap-2 mt-2">
          <input className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono" placeholder="Telegram Chat ID" value={telegramId} onChange={e => setTelegramId(e.target.value)} />
          <Button size="sm" onClick={handleSaveTelegram}>Kaydet</Button>
        </div>
        <p className="text-[10px] text-gray-400 mt-2"><a href="https://t.me/userinfobot" target="_blank" className="text-blue-600 hover:underline">@userinfobot</a> ile Chat ID al → <a href="https://t.me/enaunitybot" target="_blank" className="text-blue-600 hover:underline">@enaunitybot</a>'a /start yaz</p>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{editing ? "Mağaza Düzenle" : "Yeni Mağaza Bağla"}</h2>
            <button onClick={() => { setShowForm(false); setEditing(null); }}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Platform</label>
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                {Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Seller ID (Mağaza No)</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" placeholder="Trendyol: 542093" value={form.sellerId} onChange={e => setForm({ ...form, sellerId: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">API Key</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono" placeholder="Entegrasyon API anahtarı" value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">API Secret</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono" value={form.apiSecret} onChange={e => setForm({ ...form, apiSecret: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Ürün Eşleştirme</label>
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" value={form.matchMethod} onChange={e => setForm({ ...form, matchMethod: e.target.value })}>
                <option value="product_name">Ürün Adına Göre</option>
                <option value="barcode">Barkoda Göre</option>
                <option value="sku">Model Koda Göre (SKU)</option>
                <option value="category">Kategoriye Göre</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2"><Button onClick={handleSave} disabled={saving}>{saving ? "Kaydediliyor..." : editing ? "Güncelle" : "Mağazayı Bağla"}</Button><Button variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}>İptal</Button></div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Store size={16} /> Bağlı Mağazalarım ({connections.length})</h2>
        <Button size="sm" onClick={() => { setEditing(null); setForm({ platform: "trendyol", sellerId: "", apiKey: "", apiSecret: "", matchMethod: "product_name" }); setShowForm(true); }}>
          <Plus size={16} className="mr-1" />Mağaza Bağla
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {connections.map(c => {
          const p = PLATFORMS[c.platform] || { name: c.platform, color: "bg-gray-100 text-gray-600" };
          return (
            <div key={c.id} className={`rounded-xl border p-4 ${c.active ? "bg-white shadow-sm" : "bg-gray-50 opacity-60"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.color}`}>{p.name}</span>
                <button onClick={() => handleToggle(c.id, c.active)} className={c.active ? "text-green-600" : "text-gray-400"} title={c.active ? "Aktif" : "Pasif"}>
                  <Zap size={14} className={!c.active ? "opacity-30" : ""} />
                </button>
              </div>
              <p className="text-xs text-gray-400 font-mono">Mağaza No: {c.sellerId}</p>
              <p className="text-xs text-gray-400">Eşleşme: {MATCH_LABELS[c.matchMethod] || c.matchMethod}</p>
              {c.lastSyncAt && <p className="text-[10px] text-gray-300 mt-1">Son çekim: {new Date(c.lastSyncAt).toLocaleString("tr-TR")}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setEditing(c.id); setForm({ platform: c.platform, sellerId: c.sellerId, apiKey: c.apiKey, apiSecret: c.apiSecret || "", matchMethod: c.matchMethod || "product_name" }); setShowForm(true); }} className="text-xs text-blue-600 hover:text-blue-700">Düzenle</button>
                <button onClick={() => handleDelete(c.id)} className="text-xs text-ena-primary hover:text-ena-primary ml-auto"><Trash2 size={12} /></button>
              </div>
            </div>
          );
        })}
        {connections.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 border border-dashed border-gray-200 rounded-xl">
            <Store size={32} className="mx-auto text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">Henüz mağaza bağlamadınız</p>
            <p className="text-xs text-gray-400 mt-1">Trendyol, Hepsiburada veya N11 mağazanızı bağlayın</p>
          </div>
        )}
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Package size={16} /> Siparişlerim ({orders.length})</h2>
      {orders.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl bg-white"><Package size={32} className="mx-auto text-gray-300" /><p className="mt-2 text-sm text-gray-500">Mağaza bağladıktan sonra siparişleriniz burada görünecek</p></div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sipariş No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Müşteri</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Tutar</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durum</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-16">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map(o => {
                const s = STATUS[o.status] || { l: o.status, c: "bg-gray-100" };
                const p = PLATFORMS[o.platform] || { name: o.platform };
                return (
                  <tr key={o.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.color || "bg-gray-100"}`}>{p.name}</span></td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">{o.platformOrderId}</td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-900">{o.customerName || "—"}</td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-900 text-right">₺{o.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.c}`}>{s.l}</span></td>
                    <td className="px-4 py-3 text-center"><button onClick={() => setSelectedOrder(o)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Eye size={16} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-10 bg-black/50 backdrop-blur-sm overflow-y-auto" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS[selectedOrder.status]?.c}`}>{STATUS[selectedOrder.status]?.l}</span>
                <h3 className="text-lg font-bold text-gray-900 mt-1">#{selectedOrder.platformOrderId}</h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-blue-50">
                  <p className="text-[10px] text-blue-500 uppercase font-semibold">Müşteri</p>
                  <p className="text-sm font-bold">{selectedOrder.customerName}</p>
                  {selectedOrder.customerCity && <p className="text-xs text-gray-600"><MapPin size={10} className="inline" /> {selectedOrder.customerCity}</p>}
                  {selectedOrder.customerPhone && <p className="text-xs text-gray-600"><Phone size={10} className="inline" /> {selectedOrder.customerPhone}</p>}
                </div>
                <div className="p-3 rounded-lg bg-green-50">
                  <p className="text-[10px] text-green-500 uppercase font-semibold">Tutar</p>
                  <p className="text-xl font-black">₺{selectedOrder.totalAmount.toFixed(2)}</p>
                </div>
              </div>
              {selectedOrder.items?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Kalemler</p>
                  {selectedOrder.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 mb-2">
                      <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.productImage ? <img src={item.productImage} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /> : <Package size={18} className="text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{item.productName}</p>
                        <div className="flex gap-3 text-[10px] text-gray-500 mt-0.5">
                          <span>{item.quantity} adet</span>
                          <span>× ₺{item.unitPrice?.toFixed(2)}</span>
                          <span className="font-semibold text-gray-700">₺{item.total?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
