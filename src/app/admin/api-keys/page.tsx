"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Key, ArrowLeft, Copy, Check, ExternalLink, Clock, ToggleLeft, ToggleRight } from "lucide-react";
import toast from "react-hot-toast";

interface ApiKey { id: string; name: string; key: string; active: boolean; rateLimit: number; lastUsed: string | null; dealer?: { company: string; name: string } | null; createdAt: string; }

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [dealers, setDealers] = useState<{ id: string; company: string }[]>([]);
  const [form, setForm] = useState({ dealerId: "", name: "", rateLimit: "60" });

  const fetchKeys = () => {
    fetch("/api/admin/api-keys").then(r => r.json()).then(d => setKeys(d.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchKeys();
    fetch("/api/admin/dealers").then(r => r.json()).then(d => setDealers(d.data || []));
  }, []);

  const handleCreate = async () => {
    const res = await fetch("/api/admin/api-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dealerId: form.dealerId, name: form.name, rateLimit: parseInt(form.rateLimit) }) });
    if (res.ok) { toast.success("API anahtarı oluşturuldu"); fetchKeys(); setShowForm(false); setForm({ dealerId: "", name: "", rateLimit: "60" }); }
    else toast.error("Hata");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu anahtarı silmek istediğine emin misin?")) return;
    await fetch("/api/admin/api-keys", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchKeys(); toast.success("Silindi");
  };

  const toggleActive = async (k: ApiKey) => {
    await fetch("/api/admin/api-keys", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: k.id, active: !k.active }) });
    fetchKeys(); toast.success(k.active ? "Devre dışı" : "Aktif");
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div><h1 className="text-3xl font-bold text-gray-900">API Anahtarları</h1><p className="mt-1 text-sm text-gray-500">Bayi API entegrasyonları için anahtar yönetimi</p></div>
        <div className="ml-auto"><Button size="sm" onClick={() => setShowForm(!showForm)}><Plus size={16} className="mr-1" /> Yeni Anahtar</Button></div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Bayi</label>
              <select className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm focus:outline-none" value={form.dealerId} onChange={e => setForm({...form, dealerId: e.target.value})}>
                <option value="">Genel (bayi bağımsız)</option>
                {dealers.map(d => <option key={d.id} value={d.id}>{d.company}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Anahtar Adı</label>
              <input className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm focus:outline-none" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="örn: Mobil Uygulama" />
            </div>
            <div><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Rate Limit (istek/dk)</label>
              <input type="number" className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm focus:outline-none" value={form.rateLimit} onChange={e => setForm({...form, rateLimit: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={handleCreate}>Oluştur</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>İptal</Button>
          </div>
        </div>
      )}

      {loading ? <p className="text-gray-400 text-center py-12">Yükleniyor...</p> : keys.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white"><Key size={40} className="mx-auto text-gray-300" /><p className="mt-3 text-gray-500">Henüz API anahtarı yok</p></div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ad</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bayi</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Anahtar</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Durum</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Rate Limit</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Son Kullanım</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">İşlem</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {keys.map(k => (
                <tr key={k.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{k.name || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{k.dealer?.company || "Genel"}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{k.key.slice(0, 16)}...</code>
                    <button onClick={() => { navigator.clipboard.writeText(k.key); toast.success("Kopyalandı"); }} className="ml-2 text-gray-400 hover:text-gray-600"><Copy size={12} /></button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive(k)} className="mx-auto">
                      {k.active ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} className="text-gray-300" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">{k.rateLimit}/dk</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-400">
                    {k.lastUsed ? new Date(k.lastUsed).toLocaleDateString("tr-TR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(k.id)} className="text-ena-primary"><Trash2 size={14} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dökümantasyon */}
      <div className="mt-10 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">API Kullanım Kılavuzu</h2>
        <div className="prose prose-sm max-w-none text-gray-600 space-y-3">
          <p>API'ye erişmek için tüm isteklerde <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">X-API-Key</code> header'ı ile anahtarınızı göndermelisiniz.</p>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Örnek İstek</p>
            <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap">curl -H "X-API-Key: ena_abc123..." \
  https://sizin-domain.com/api/dealer/orders</pre>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Rate Limiting</p>
            <p>Her anahtar için dakikalık istek limiti tanımlanmıştır. Limit aşıldığında <strong>429 Too Many Requests</strong> döner ve <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">Retry-After</code> header'ında bekleme süresi belirtilir.</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Endpoint'ler</p>
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-200"><th className="text-left py-1 font-semibold text-gray-600">Endpoint</th><th className="text-left py-1 font-semibold text-gray-600">Açıklama</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="py-1.5 font-mono">GET /api/dealer/products</td><td>Ürün listesi</td></tr>
                <tr><td className="py-1.5 font-mono">GET /api/dealer/orders</td><td>Sipariş listesi</td></tr>
                <tr><td className="py-1.5 font-mono">POST /api/orders</td><td>Sipariş oluşturma</td></tr>
                <tr><td className="py-1.5 font-mono">GET /api/dealer/balance</td><td>Bakiye sorgulama</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
