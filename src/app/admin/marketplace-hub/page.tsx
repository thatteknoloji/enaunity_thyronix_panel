"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, Plug, ShoppingCart, Package, FileText, Webhook,
  ClipboardList, BarChart3, Store,
} from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { readSafeJson } from "@/lib/http/safe-json";
import { UI, statusLabel } from "@/lib/ui/turkish-labels";

type Tab = "connections" | "orders" | "products" | "sync-logs" | "webhooks" | "pick-list" | "reports";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const d = await readSafeJson<{ success?: boolean; data?: T; error?: string }>(r, "Marketplace Hub");
  if (!r.ok || !d.success) throw new Error(d.error || `HTTP ${r.status}`);
  return d.data as T;
}

const PLATFORMS = ["TRENDYOL", "HEPSIBURADA", "N11", "AMAZON", "PAZARAMA", "CICEKSEPETI"];

function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: string }) {
  const colors: Record<string, string> = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[tone] || colors.gray}`}>{children}</span>;
}

export default function MarketplaceHubPage() {
  const [tab, setTab] = useState<Tab>("connections");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [pickList, setPickList] = useState<any[]>([]);
  const [reports, setReports] = useState<any>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [dealers, setDealers] = useState<any[]>([]);
  const [form, setForm] = useState({ dealerId: "", platform: "TRENDYOL", sellerId: "", storeId: "", apiKey: "", apiSecret: "" });

  const load = useCallback(async (t: Tab) => {
    setLoading(true);
    setError(null);
    try {
      if (t === "connections") setConnections(await api("/api/marketplace-hub"));
      if (t === "orders") setOrders(await api("/api/marketplace-hub?type=orders"));
      if (t === "sync-logs") setSyncLogs(await api("/api/marketplace-hub?type=sync-logs"));
      if (t === "webhooks") setWebhooks(await api("/api/marketplace-hub?type=webhooks"));
      if (t === "pick-list") setPickList(await api("/api/marketplace-hub?type=pick-list"));
      if (t === "reports") setReports(await api("/api/marketplace-hub?type=reports"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);
  useEffect(() => {
    fetch("/api/admin/dealers").then((r) => r.json()).then((d) => { if (d.success) setDealers(d.data || []); });
  }, []);

  const syncAll = async () => {
    await api("/api/marketplace-hub", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync" }) });
    load(tab);
  };

  const createConn = async () => {
    await api("/api/marketplace-hub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...form }),
    });
    setForm({ dealerId: "", platform: "TRENDYOL", sellerId: "", storeId: "", apiKey: "", apiSecret: "" });
    load("connections");
  };

  const bulkPack = async () => {
    if (selected.length === 0) return;
    await api("/api/marketplace-hub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pack", orderIds: selected }),
    });
    setSelected([]);
    load("pick-list");
  };

  const tabs: { id: Tab; label: string; icon: typeof Store }[] = [
    { id: "connections", label: UI.connections, icon: Plug },
    { id: "orders", label: UI.orders, icon: ShoppingCart },
    { id: "products", label: UI.products, icon: Package },
    { id: "sync-logs", label: UI.syncLogs, icon: FileText },
    { id: "webhooks", label: UI.webhooks, icon: Webhook },
    { id: "pick-list", label: UI.pickPack, icon: ClipboardList },
    { id: "reports", label: UI.reports, icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={toAdminUrl("/admin")} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="text-lg font-bold">{UI.marketplaceHub}</h1>
            <p className="text-xs text-gray-500">Pazaryeri senkronizasyonu ve otomatik operasyon</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={syncAll} className="px-3 py-1.5 text-xs bg-ena-primary text-white rounded-lg">Senkronize Et</button>
          <button onClick={() => load(tab)} className="text-xs text-gray-500 flex items-center gap-1"><RefreshCw size={14} /></button>
        </div>
      </div>

      <div className="flex">
        <aside className="w-52 border-r bg-white min-h-[calc(100vh-65px)] p-2 space-y-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${tab === t.id ? "bg-ena-primary/10 text-ena-primary font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </aside>

        <main className="flex-1 p-6">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
          {loading ? <p className="text-sm text-gray-500">Yükleniyor...</p> : (
            <>
              {tab === "connections" && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border p-4 grid md:grid-cols-3 gap-3">
                    <select className="border rounded-lg px-3 py-2 text-sm" value={form.dealerId} onChange={(e) => setForm({ ...form, dealerId: e.target.value })}>
                      <option value="">Bayi seç</option>
                      {dealers.map((d) => <option key={d.id} value={d.id}>{d.company || d.name}</option>)}
                    </select>
                    <select className="border rounded-lg px-3 py-2 text-sm" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                      {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Satıcı / Tedarikçi ID" value={form.sellerId} onChange={(e) => setForm({ ...form, sellerId: e.target.value })} />
                    <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Mağaza ID" value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })} />
                    <input className="border rounded-lg px-3 py-2 text-sm" placeholder="API Anahtarı" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
                    <input className="border rounded-lg px-3 py-2 text-sm" placeholder="API Gizli Anahtarı" value={form.apiSecret} onChange={(e) => setForm({ ...form, apiSecret: e.target.value })} />
                    <button onClick={createConn} className="md:col-span-3 px-4 py-2 bg-ena-primary text-white text-sm rounded-lg w-fit">Bağlantı Ekle</button>
                  </div>
                  <div className="bg-white rounded-xl border divide-y">
                    {connections.map((c) => (
                      <div key={c.id} className="p-4 flex justify-between">
                        <div>
                          <div className="font-medium">{c.platform} — {c.dealer?.company}</div>
                          <div className="text-xs text-gray-500">Satıcı: {c.sellerId} · Mağaza: {c.storeId} · {c._count?.orders || 0} sipariş</div>
                        </div>
                        <Badge tone={c.connectionStatus === "CONNECTED" ? "green" : c.connectionStatus === "ERROR" ? "red" : "amber"}>{statusLabel(c.connectionStatus)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "orders" && (
                <div className="bg-white rounded-xl border divide-y">
                  {orders.map((o) => (
                    <div key={o.id} className="p-4 flex justify-between text-sm">
                      <span>{o.platformOrderId} — {o.connection?.dealer?.name}</span>
                      <Badge>{statusLabel(o.status)}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {tab === "products" && (
                <p className="text-sm text-gray-500">Ürün eşleme ENA ana ürünleri ve Hazır Ürün Deposu üzerinden yapılır. Thyronix ürünleri otomatik eşleşmez; sadece admin ayrıca ENA&apos;ya manuel import ederse ENA kataloğu içinde kullanılabilir.</p>
              )}

              {tab === "sync-logs" && (
                <div className="bg-white rounded-xl border divide-y">
                  {syncLogs.map((l) => (
                    <div key={l.id} className="p-4 flex justify-between text-sm">
                      <div>
                        <div className="font-medium">{l.marketplace}</div>
                        <div className="text-xs text-gray-500">{new Date(l.startedAt).toLocaleString("tr-TR")} — Yeni: {l.newOrders} · Güncellenen: {l.updatedOrders} · Hata: {l.errorCount}</div>
                      </div>
                      <Badge tone={l.status === "COMPLETED" ? "green" : "red"}>{statusLabel(l.status)}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {tab === "webhooks" && (
                <div className="bg-white rounded-xl border divide-y">
                  {webhooks.map((w) => (
                    <div key={w.id} className="p-4 flex justify-between text-sm">
                      <span>{w.marketplace} — {w.eventType}</span>
                      <Badge tone={w.status === "PROCESSED" ? "green" : "amber"}>{statusLabel(w.status)}</Badge>
                    </div>
                  ))}
                  {webhooks.length === 0 && <p className="p-4 text-sm text-gray-500">Bildirim kaydı yok.</p>}
                </div>
              )}

              {tab === "pick-list" && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <button onClick={bulkPack} disabled={selected.length === 0} className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-50">Toplu Paketlendi ({selected.length})</button>
                  </div>
                  <div className="bg-white rounded-xl border divide-y">
                    {pickList.map((o) => (
                      <div key={o.id} className="p-4 flex items-start gap-3">
                        <input type="checkbox" checked={selected.includes(o.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, o.id] : selected.filter((id) => id !== o.id))} />
                        <div className="flex-1">
                          <div className="font-medium">{o.orderNumber} — {o.dealer?.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{o.items?.map((i: any) => `${i.name} x${i.quantity}`).join(", ")}</div>
                        </div>
                        <Badge tone="blue">{statusLabel(o.status)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "reports" && reports && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Sipariş", value: reports.totalOrders },
                    { label: "Ciro", value: `₺${reports.revenue?.toFixed(0)}` },
                    { label: "Maliyet", value: `₺${reports.cost?.toFixed(0)}` },
                    { label: "Kar", value: `₺${reports.profit?.toFixed(0)}` },
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl border p-4">
                      <div className="text-xs text-gray-500">{s.label}</div>
                      <div className="text-xl font-bold mt-1">{s.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
