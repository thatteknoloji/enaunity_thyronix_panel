"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, LayoutDashboard, ShoppingCart, Warehouse, Truck,
  DollarSign, FileText, BarChart3, Package,
} from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";
import { getCostBreakdown } from "@/lib/fulfillment/breakdown";
import { UI, statusLabel } from "@/lib/ui/turkish-labels";

type Tab = "dashboard" | "orders" | "warehouse" | "shipments" | "costs" | "accounts" | "statements" | "reports";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const d = await r.json();
  if (!r.ok || !d.success) throw new Error(d.error || `HTTP ${r.status}`);
  return d.data;
}

function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: string }) {
  const colors: Record<string, string> = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[tone] || colors.gray}`}>{children}</span>;
}

function fmt(n: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
}

export default function AdminFulfillmentPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [warehouse, setWarehouse] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [reportPeriod, setReportPeriod] = useState("monthly");

  const load = useCallback(async (t: Tab) => {
    setLoading(true);
    setError(null);
    try {
      if (t === "dashboard") setDashboard(await api("/api/fulfillment/dashboard"));
      if (t === "orders" || t === "costs") setOrders(await api("/api/fulfillment/orders"));
      if (t === "shipments") setShipments(await api("/api/fulfillment/shipments"));
      if (t === "accounts") setAccounts(await api("/api/fulfillment/accounts"));
      if (t === "statements") setStatements(await api("/api/fulfillment/statements"));
      if (t === "warehouse") setWarehouse(await api("/api/fulfillment/dashboard?type=warehouse"));
      if (t === "reports") setReport(await api(`/api/fulfillment/dashboard?type=reports&period=${reportPeriod}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [reportPeriod]);

  useEffect(() => { load(tab); }, [tab, load]);

  const openOrder = async (id: string) => {
    const order = await api(`/api/fulfillment/orders?id=${id}`);
    setSelectedOrder(order);
  };

  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: "dashboard", label: UI.overview, icon: LayoutDashboard },
    { id: "orders", label: UI.orders, icon: ShoppingCart },
    { id: "warehouse", label: UI.warehouse, icon: Warehouse },
    { id: "shipments", label: UI.shipments, icon: Truck },
    { id: "costs", label: UI.costs, icon: DollarSign },
    { id: "accounts", label: UI.dealerAccounts, icon: DollarSign },
    { id: "statements", label: UI.statements, icon: FileText },
    { id: "reports", label: UI.reports, icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={toAdminUrl("/admin")} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{UI.fulfillment}</h1>
            <p className="text-xs text-gray-500">Sipariş, depo, kargo ve cari hesap yönetimi</p>
          </div>
        </div>
        <button onClick={() => load(tab)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
          <RefreshCw size={14} /> Yenile
        </button>
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
              {tab === "dashboard" && dashboard && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Sipariş", value: dashboard.orderCount },
                      { label: "Kargo", value: dashboard.shipmentCount },
                      { label: "Cari Hesap", value: dashboard.accountCount },
                      { label: "Bugün Ciro", value: fmt(dashboard.todayReport?.revenue || 0) },
                    ].map((s) => (
                      <div key={s.label} className="bg-white rounded-xl border p-4">
                        <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                        <div className="text-2xl font-bold">{s.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-xl border p-4">
                    <h3 className="font-semibold text-sm mb-3">Son Siparişler</h3>
                    {dashboard.recentOrders?.map((o: any) => (
                      <div key={o.id} className="flex justify-between py-2 border-b last:border-0 text-sm cursor-pointer hover:bg-gray-50" onClick={() => openOrder(o.id)}>
                        <span>{o.orderNumber} — {o.dealer?.name}</span>
                        <Badge tone={o.status === "DELIVERED" ? "green" : "blue"}>{statusLabel(o.status)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "orders" && (
                <div className="bg-white rounded-xl border divide-y">
                  {orders.map((o) => (
                    <div key={o.id} className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50" onClick={() => openOrder(o.id)}>
                      <div>
                        <div className="font-medium">{o.orderNumber}</div>
                        <div className="text-xs text-gray-500">{o.dealer?.name} · {o.marketplace || "Manuel"} · {fmt(o.totalAmount)}</div>
                      </div>
                      <Badge tone={o.status === "SHIPPED" ? "green" : "gray"}>{statusLabel(o.status)}</Badge>
                    </div>
                  ))}
                  {orders.length === 0 && <p className="p-4 text-sm text-gray-500">Henüz sipariş yok.</p>}
                </div>
              )}

              {tab === "warehouse" && (
                <div className="bg-white rounded-xl border divide-y">
                  {warehouse.map((m: any) => (
                    <div key={m.id} className="p-4 flex justify-between text-sm">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {m.sku || m.catalogItem?.name || m.product?.name || "—"}
                          {m.legacy && <Badge tone="amber">Eski</Badge>}
                          {m.engine === "core" && <Badge tone="green">Çekirdek</Badge>}
                        </div>
                        <div className="text-xs text-gray-500">
                          {m.location || "MAIN"} · {m.movementType} · {m.quantity} adet
                          {m.orderNumber ? ` · ${m.orderNumber}` : ""}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {m.engine === "core" ? "Çekirdek stok hareketi" : `Stok: ${m.stock} / Rez: ${m.reservedStock}`}
                      </span>
                    </div>
                  ))}
                  {warehouse.length === 0 && <p className="p-4 text-sm text-gray-500">Henüz hareket yok.</p>}
                </div>
              )}

              {tab === "shipments" && (
                <div className="bg-white rounded-xl border divide-y">
                  {shipments.map((s: any) => (
                    <div key={s.id} className="p-4 flex justify-between">
                      <div>
                        <div className="font-medium">{s.trackingNumber || "—"}</div>
                        <div className="text-xs text-gray-500">{s.cargoCompany} · {s.order?.orderNumber} · {s.order?.dealer?.name}</div>
                      </div>
                      <Badge>{statusLabel(s.status)}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {tab === "costs" && (
                <div className="bg-white rounded-xl border divide-y">
                  {orders.map((o) => {
                    const b = getCostBreakdown(o.costItems || []);
                    return (
                      <div key={o.id} className="p-4 cursor-pointer hover:bg-gray-50" onClick={() => openOrder(o.id)}>
                        <div className="font-medium">{o.orderNumber}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Satış: {fmt(o.totalAmount)} · Maliyet: {fmt(b.total)} · Kar: {fmt(o.totalProfit)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === "accounts" && (
                <div className="bg-white rounded-xl border divide-y">
                  {accounts.map((a: any) => (
                    <div key={a.id} className="p-4 flex justify-between">
                      <div>
                        <div className="font-medium">{a.dealer?.name || a.dealerId}</div>
                        <div className="text-xs text-gray-500">Limit: {fmt(a.creditLimit)} · Kullanılabilir: {fmt(a.availableLimit)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{fmt(a.currentBalance)}</div>
                        <Badge tone={a.riskLevel === "HIGH" ? "red" : a.riskLevel === "MEDIUM" ? "amber" : "green"}>{statusLabel(a.riskLevel)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "statements" && (
                <div className="bg-white rounded-xl border divide-y">
                  {statements.map((s: any) => (
                    <div key={s.id} className="p-4 flex justify-between text-sm">
                      <span>{s.account?.dealer?.name} — {s.periodMonth}/{s.periodYear}</span>
                      <span>Borç: {fmt(s.totalDebit)} · Alacak: {fmt(s.totalCredit)} · Bakiye: {fmt(s.closingBalance)}</span>
                    </div>
                  ))}
                </div>
              )}

              {tab === "reports" && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    {["daily", "weekly", "monthly"].map((p) => (
                      <button key={p} onClick={() => { setReportPeriod(p); setTab("reports"); }}
                        className={`px-3 py-1.5 text-xs rounded-lg border ${reportPeriod === p ? "bg-ena-primary text-white border-ena-primary" : ""}`}>
                        {p === "daily" ? "Günlük" : p === "weekly" ? "Haftalık" : "Aylık"}
                      </button>
                    ))}
                  </div>
                  {report && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { label: "Sipariş", value: report.orderCount },
                        { label: "Ciro", value: fmt(report.revenue) },
                        { label: "Maliyet", value: fmt(report.cost) },
                        { label: "Kar", value: fmt(report.profit) },
                        { label: "Kargo", value: fmt(report.shipping) },
                        { label: "İade", value: report.returns },
                      ].map((s) => (
                        <div key={s.label} className="bg-white rounded-xl border p-4">
                          <div className="text-xs text-gray-500">{s.label}</div>
                          <div className="text-xl font-bold mt-1">{s.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg">{selectedOrder.orderNumber}</h3>
            <p className="text-sm text-gray-500">{selectedOrder.customerName} · {selectedOrder.marketplace}</p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>Satış Tutarı</span><span>{fmt(selectedOrder.totalAmount)}</span></div>
              {(() => {
                const b = getCostBreakdown(selectedOrder.costItems || []);
                return (
                  <>
                    <div className="flex justify-between"><span>Ürün Maliyeti</span><span>{fmt(b.productCost)}</span></div>
                    <div className="flex justify-between"><span>Kargo</span><span>{fmt(b.shippingCost)}</span></div>
                    <div className="flex justify-between"><span>Paketleme</span><span>{fmt(b.packagingCost)}</span></div>
                    <div className="flex justify-between"><span>Ek Hizmet</span><span>{fmt(b.serviceCost)}</span></div>
                    <div className="flex justify-between font-semibold border-t pt-2"><span>Toplam Maliyet</span><span>{fmt(b.total)}</span></div>
                    <div className="flex justify-between text-emerald-600 font-semibold"><span>Tahmini Kar</span><span>{fmt(selectedOrder.totalProfit)}</span></div>
                  </>
                );
              })()}
            </div>
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-gray-500 mb-2">ÜRÜNLER</h4>
              {selectedOrder.items?.map((i: any) => (
                <div key={i.id} className="text-xs py-1 border-b">{i.name} x{i.quantity} — {fmt(i.salePrice)}</div>
              ))}
            </div>
            <button onClick={() => setSelectedOrder(null)} className="mt-4 text-sm text-gray-500">Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
}
