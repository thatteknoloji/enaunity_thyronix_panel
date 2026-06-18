"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Plug, Plus } from "lucide-react";
import { statusLabel } from "@/lib/ui/turkish-labels";

const PLATFORMS = ["TRENDYOL", "HEPSIBURADA", "N11", "AMAZON", "PAZARAMA", "CICEKSEPETI"];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const d = await r.json();
  if (!r.ok || !d.success) throw new Error(d.error || `HTTP ${r.status}`);
  return d.data;
}

export default function DealerMarketplaceConnectionsPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ platform: "TRENDYOL", sellerId: "", storeId: "", apiKey: "", apiSecret: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setConnections(await api("/api/dealer/marketplace-hub"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    await api("/api/dealer/marketplace-hub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...form }),
    });
    setShowForm(false);
    load();
  };

  const sync = async (id: string) => {
    await api("/api/dealer/marketplace-hub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync", connectionId: id }),
    });
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dealer" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></Link>
          <h1 className="text-lg font-bold">Pazaryeri Bağlantıları</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-ena-primary text-white rounded-lg"><Plus size={14} /> Yeni</button>
      </div>
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
        {loading ? <p className="text-sm text-gray-500">Yükleniyor...</p> : connections.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border p-4 flex justify-between items-center">
            <div>
              <div className="font-medium flex items-center gap-2"><Plug size={14} /> {c.platform}</div>
              <div className="text-xs text-gray-500 mt-1">Satıcı: {c.sellerId} · Mağaza: {c.storeId}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100">{statusLabel(c.connectionStatus)}</span>
              <button onClick={() => sync(c.id)} className="text-xs px-2 py-1 border rounded-lg">Senkronize Et</button>
            </div>
          </div>
        ))}
        {showForm && (
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Supplier / Seller ID" value={form.sellerId} onChange={(e) => setForm({ ...form, sellerId: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Store ID" value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="API Key" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="API Secret" value={form.apiSecret} onChange={(e) => setForm({ ...form, apiSecret: e.target.value })} />
            <div className="flex gap-2">
              <button onClick={save} className="px-4 py-2 bg-ena-primary text-white text-sm rounded-lg">Kaydet</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500">İptal</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
