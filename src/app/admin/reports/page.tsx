"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  TrendingUp, TrendingDown, ShoppingCart, DollarSign, Package, Users,
  Percent, AlertTriangle, Banknote, Wallet, Building2, UserPlus, Clock, Download, Search,
} from "lucide-react";

interface ReportData {
  summary: {
    totalRevenue: number; prevRevenue: number; revenueChange: number;
    totalOrders: number; prevOrders: number; orderChange: number;
    totalDiscount: number; totalPayments: number; pendingBalance: number;
  };
  salesChart: { date: string; revenue: number; orders: number }[];
  ordersByStatus: { status: string; count: number }[];
  topProducts: { name: string; image: string; quantity: number; revenue: number }[];
  topDealers: { name: string; company: string; total: number; orders: number }[];
  stockSummary: { lowStock: number; outOfStock: number; totalStock: number; totalProducts: number };
  dealerSummary: { total: number; positiveBalance: number; negativeBalance: number };
  newRegistrations: { dealers: number; users: number };
}

interface AgingDealer {
  dealerId: string; dealerName: string; company: string;
  balance: number; creditLimit: number; totalOutstanding: number;
  buckets: { "0-30": number; "31-60": number; "61-90": number; "90+": number };
}

interface MarginProduct {
  productId: string; productName: string; category: string; sku: string;
  image: string; price: number; costPrice: number; margin: number;
  marginPercent: number; stock: number;
}

interface RepPerformance {
  repId: string; repName: string; repEmail: string; dealerCount: number;
  dealers: { id: string; name: string; company: string; orderCount: number; revenue: number }[];
  totalOrders: number; totalRevenue: number; avgOrderValue: number;
  pendingOrders: number; shippedOrders: number;
}

const STATUS_MAP: Record<string, string> = {
  pending_approval: "Onay Bekliyor", approved: "Onaylandı", shipped: "Kargoda",
  delivered: "Teslim Edildi", cancelled: "İptal", pending: "Beklemede",
};

const TABS = [
  { key: "dashboard", label: "Genel Bakış", icon: TrendingUp },
  { key: "detailed", label: "Detaylı Rapor", icon: Search },
  { key: "aging", label: "Alacak Yaşlandırma", icon: Clock },
  { key: "margin", label: "Marj Analizi", icon: Percent },
  { key: "rep", label: "Temsilci Performans", icon: Users },
  { key: "operasyon", label: "Operasyon P&L", icon: DollarSign },
];

function formatTL(n: number) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
}

function formatNum(n: number) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 0 });
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-gray-500">Yükleniyor…</div>}>
      <ReportsContent />
    </Suspense>
  );
}

function ReportsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "operasyon" ? "operasyon" : "dashboard";
  const [tab, setTab] = useState(initialTab);
  const [data, setData] = useState<ReportData | null>(null);
  const [aging, setAging] = useState<{ dealers: AgingDealer[]; totals: any } | null>(null);
  const [margin, setMargin] = useState<{ products: MarginProduct[]; categories: any[]; summary: any } | null>(null);
  const [repData, setRepData] = useState<RepPerformance[]>([]);
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);

  // Detailed report state
  const [detailStart, setDetailStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
  });
  const [detailEnd, setDetailEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [detailCategory, setDetailCategory] = useState("");
  const [detailProduct, setDetailProduct] = useState("");
  const [detailOrders, setDetailOrders] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [operasyonReport, setOperasyonReport] = useState<any>(null);
  const [operasyonPeriod, setOperasyonPeriod] = useState("monthly");

  const fetchReports = useCallback(async () => {
    if (tab !== "dashboard") return;
    setLoading(true);
    const res = await fetch(`/api/admin/reports?period=${period}`);
    const d = await res.json();
    setData(d.data);
    setLoading(false);
  }, [period, tab]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  useEffect(() => {
    if (tab === "aging") {
      setLoading(true);
      fetch("/api/admin/reports/aging").then(r => r.json()).then(d => { if (d.success) setAging(d.data); setLoading(false); });
    } else if (tab === "margin") {
      setLoading(true);
      fetch("/api/admin/reports/margin").then(r => r.json()).then(d => { if (d.success) setMargin(d.data); setLoading(false); });
    } else if (tab === "rep") {
      setLoading(true);
      fetch("/api/admin/reports/rep-performance").then(r => r.json()).then(d => { if (d.success) setRepData(d.data); setLoading(false); });
    } else if (tab === "detailed") {
      fetch("/api/admin/products/categories").then(r => r.json()).then(d => { if (d.success) setCategories(d.data); });
      fetch("/api/admin/products").then(r => r.json()).then(d => { if (d.success) setProducts(d.data || []); });
    } else if (tab === "operasyon") {
      setLoading(true);
      fetch(`/api/fulfillment/dashboard?type=reports&period=${operasyonPeriod}`)
        .then((r) => r.json())
        .then((d) => { if (d.success) setOperasyonReport(d.data); setLoading(false); });
    }
  }, [tab, operasyonPeriod]);

  const fetchDetailed = useCallback(async () => {
    setDetailLoading(true);
    const params = new URLSearchParams({ start: detailStart, end: detailEnd });
    if (detailCategory) params.set("category", detailCategory);
    if (detailProduct) params.set("productId", detailProduct);
    const res = await fetch(`/api/admin/reports/detailed?${params}`);
    const d = await res.json();
    if (d.success) setDetailOrders(d.data);
    setDetailLoading(false);
  }, [detailStart, detailEnd, detailCategory, detailProduct]);

  const exportDetailedCSV = () => {
    const headers = ["Sipariş No", "Tarih", "Bayi", "Durum", "Ürün", "Adet", "Birim Fiyat", "Toplam", "İskonto", "Net"];
    const rows = detailOrders.map((o: any) => [
      o.id.slice(0, 8),
      new Date(o.createdAt).toLocaleDateString("tr-TR"),
      o.dealerName || "-",
      o.status,
      o.items?.map((i: any) => i.productName).join(" / ") || "-",
      String(o.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0),
      "",
      String(o.total),
      String(o.discount || 0),
      String(o.total - (o.discount || 0)),
    ]);
    downloadCSV(`detayli-satis-raporu-${detailStart}-${detailEnd}.csv`, headers, rows);
  };

  const exportAgingCSV = () => {
    if (!aging) return;
    const headers = ["Bayi", "Şirket", "Bakiye", "Limit", "0-30 Gün", "31-60 Gün", "61-90 Gün", "90+ Gün", "Toplam"];
    const rows = aging.dealers.map(d => [
      d.dealerName, d.company, String(d.balance), String(d.creditLimit),
      String(d.buckets["0-30"]), String(d.buckets["31-60"]), String(d.buckets["61-90"]), String(d.buckets["90+"]),
      String(d.totalOutstanding),
    ]);
    downloadCSV("alacak-yaslandirma.csv", headers, rows);
  };

  const exportMarginCSV = () => {
    if (!margin) return;
    const headers = ["Ürün", "Kategori", "SKU", "Satış Fiyatı", "Maliyet", "Marj", "Marj %", "Stok"];
    const rows = margin.products.map(p => [
      p.productName, p.category, p.sku, String(p.price), String(p.costPrice),
      String(p.margin), String(p.marginPercent), String(p.stock),
    ]);
    downloadCSV("marj-analizi.csv", headers, rows);
  };

  const exportRepCSV = () => {
    const headers = ["Temsilci", "E-posta", "Bayi Sayısı", "Toplam Sipariş", "Toplam Ciro", "Ort. Sipariş", "Bekleyen", "Sevk Edilen"];
    const rows = repData.map(r => [
      r.repName, r.repEmail, String(r.dealerCount), String(r.totalOrders),
      String(r.totalRevenue), String(r.avgOrderValue), String(r.pendingOrders), String(r.shippedOrders),
    ]);
    downloadCSV("temsilci-performans.csv", headers, rows);
  };

  const exportDashboardCSV = () => {
    if (!data) return;
    // Sales chart
    const headers = ["Tarih", "Gelir", "Sipariş"];
    const rows = data.salesChart.map(d => [d.date, String(d.revenue), String(d.orders)]);
    downloadCSV("satis-trendi.csv", headers, rows);
  };

  const maxRevenue = data?.salesChart ? Math.max(...data.salesChart.map(d => d.revenue), 1) : 1;

  const renderDashboard = () => !data ? null : (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase">Toplam Gelir</p>
            <div className="p-1.5 rounded-lg bg-emerald-100"><TrendingUp size={16} className="text-emerald-600" /></div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatTL(data.summary.totalRevenue)}</p>
          <div className="flex items-center gap-1 mt-1">
            {data.summary.revenueChange >= 0 ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-ena-primary" />}
            <span className={`text-xs font-medium ${data.summary.revenueChange >= 0 ? "text-emerald-600" : "text-ena-primary"}`}>%{Math.abs(data.summary.revenueChange)}</span>
            <span className="text-xs text-gray-400">önceki dönem</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase">Siparişler</p>
            <div className="p-1.5 rounded-lg bg-blue-100"><ShoppingCart size={16} className="text-blue-600" /></div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.summary.totalOrders}</p>
          <div className="flex items-center gap-1 mt-1">
            {data.summary.orderChange >= 0 ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-ena-primary" />}
            <span className={`text-xs font-medium ${data.summary.orderChange >= 0 ? "text-emerald-600" : "text-ena-primary"}`}>%{Math.abs(data.summary.orderChange)}</span>
            <span className="text-xs text-gray-400">önceki dönem</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase">Tahsilat</p>
            <div className="p-1.5 rounded-lg bg-purple-100"><Banknote size={16} className="text-purple-600" /></div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatTL(data.summary.totalPayments)}</p>
          <p className="text-xs text-gray-400 mt-1">Bekleyen: {formatTL(data.summary.pendingBalance)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase">İskonto</p>
            <div className="p-1.5 rounded-lg bg-amber-100"><Percent size={16} className="text-amber-600" /></div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatTL(data.summary.totalDiscount)}</p>
          <p className="text-xs text-gray-400 mt-1">Toplam sipariş iskontosu</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Satış Trendi</h3>
          <div className="flex items-end gap-1 h-48">
            {data.salesChart.map((d) => {
              const h = maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="w-full bg-emerald-100 rounded-t relative" style={{ height: `${Math.max(h, 1)}%` }}>
                    <div className="absolute bottom-0 w-full bg-emerald-500 rounded-t transition-all hover:bg-emerald-600 cursor-pointer" style={{ height: `${h}%` }}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded hidden group-hover:block whitespace-nowrap">
                        {d.revenue.toLocaleString("tr-TR", { minimumFractionDigits: 0 })} ₺
                      </div>
                    </div>
                  </div>
                  {data.salesChart.length <= 31 && <span className="text-[8px] text-gray-400 -rotate-45 origin-left truncate w-8">{d.date.slice(5)}</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Sipariş Durumları</h3>
          <div className="space-y-3">
            {data.ordersByStatus.map((o) => {
              const total = data.ordersByStatus.reduce((s, x) => s + x.count, 0);
              const pct = total > 0 ? (o.count / total) * 100 : 0;
              const colors: Record<string, string> = {
                pending_approval: "bg-amber-500", approved: "bg-blue-500", shipped: "bg-purple-500",
                delivered: "bg-emerald-500", cancelled: "bg-ena-primary/50", pending: "bg-gray-400",
              };
              return (
                <div key={o.status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{STATUS_MAP[o.status] || o.status}</span>
                    <span className="font-medium text-gray-900">{o.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${colors[o.status] || "bg-gray-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">En Çok Satan Ürünler</h3>
          <div className="space-y-3">
            {data.topProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-5">{i + 1}.</span>
                <div className="h-8 w-8 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                  <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.quantity} adet</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatNum(p.revenue)} ₺</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">En Çok Sipariş Veren Bayiler</h3>
          <div className="space-y-3">
            {data.topDealers.map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-5">{i + 1}.</span>
                <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0"><Building2 size={16} className="text-amber-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{d.company}</p>
                  <p className="text-xs text-gray-500">{d.orders} sipariş</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatNum(d.total)} ₺</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3"><div className="p-2 rounded-lg bg-ena-primary/10"><Package size={18} className="text-ena-primary" /></div><h3 className="font-semibold text-gray-900">Stok Durumu</h3></div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Toplam Ürün</span><span className="font-medium">{data.stockSummary.totalProducts}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Toplam Stok</span><span className="font-medium">{data.stockSummary.totalStock}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Düşük Stok</span><span className="font-medium text-amber-600">{data.stockSummary.lowStock}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Stokta Yok</span><span className="font-medium text-ena-primary">{data.stockSummary.outOfStock}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3"><div className="p-2 rounded-lg bg-blue-100"><Users size={18} className="text-blue-600" /></div><h3 className="font-semibold text-gray-900">Bayi Özeti</h3></div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Toplam Bayi</span><span className="font-medium">{data.dealerSummary.total}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Pozitif Bakiye</span><span className="font-medium text-emerald-600">{data.dealerSummary.positiveBalance}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Negatif Bakiye</span><span className="font-medium text-ena-primary">{data.dealerSummary.negativeBalance}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Bekleyen Tahsilat</span><span className="font-medium text-amber-600">{formatNum(data.summary.pendingBalance)} ₺</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3"><div className="p-2 rounded-lg bg-purple-100"><UserPlus size={18} className="text-purple-600" /></div><h3 className="font-semibold text-gray-900">Yeni Kayıtlar</h3></div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Yeni Bayi</span><span className="font-medium">{data.newRegistrations.dealers}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Yeni Kullanıcı</span><span className="font-medium">{data.newRegistrations.users}</span></div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100"><p className="text-xs text-gray-400">Seçilen dönemdeki yeni kayıtlar</p></div>
        </div>
      </div>
    </div>
  );

  const renderAging = () => !aging ? null : (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(aging.totals).filter(([k]) => k !== "totalOutstanding").map(([bucket, total]) => {
          const pct = aging.totals.totalOutstanding > 0 ? (total as number) / aging.totals.totalOutstanding * 100 : 0;
          const colors: Record<string, string> = { "0-30": "bg-emerald-500", "31-60": "bg-amber-500", "61-90": "bg-orange-500", "90+": "bg-ena-primary/50" };
          return (
            <div key={bucket} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">{bucket} Gün</p>
              <p className="text-lg font-bold text-gray-900">{formatTL(total as number)}</p>
              <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                <div className={`h-full rounded-full ${colors[bucket] || "bg-gray-500"}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">%{pct.toFixed(1)}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Bayi Bazında Alacak Yaşlandırma</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Bayi</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Bakiye</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Limit</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">0-30 Gün</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">31-60 Gün</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">61-90 Gün</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">90+ Gün</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Toplam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {aging.dealers.map(d => (
                <tr key={d.dealerId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{d.dealerName}</p>
                    <p className="text-xs text-gray-500">{d.company}</p>
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${d.balance < 0 ? "text-ena-primary" : "text-emerald-600"}`}>{formatTL(d.balance)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatTL(d.creditLimit)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${d.buckets["0-30"] > 0 ? "text-emerald-600" : "text-gray-400"}`}>{d.buckets["0-30"] > 0 ? formatTL(d.buckets["0-30"]) : "-"}</td>
                  <td className={`px-4 py-3 text-right font-medium ${d.buckets["31-60"] > 0 ? "text-amber-600" : "text-gray-400"}`}>{d.buckets["31-60"] > 0 ? formatTL(d.buckets["31-60"]) : "-"}</td>
                  <td className={`px-4 py-3 text-right font-medium ${d.buckets["61-90"] > 0 ? "text-orange-600" : "text-gray-400"}`}>{d.buckets["61-90"] > 0 ? formatTL(d.buckets["61-90"]) : "-"}</td>
                  <td className={`px-4 py-3 text-right font-medium ${d.buckets["90+"] > 0 ? "text-ena-primary" : "text-gray-400"}`}>{d.buckets["90+"] > 0 ? formatTL(d.buckets["90+"]) : "-"}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{formatTL(d.totalOutstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderMargin = () => !margin ? null : (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">Ortalama Marj</p>
          <p className="text-2xl font-bold text-gray-900">%{margin.summary.avgMargin}</p>
          <p className="text-xs text-gray-400 mt-1">{margin.summary.totalProducts} ürün</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">En Yüksek Marj</p>
          <p className="text-lg font-bold text-gray-900">{margin.summary.highestMargin?.productName || "-"}</p>
          <p className="text-xs text-emerald-600 mt-1">%{margin.summary.highestMargin?.marginPercent || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">En Düşük Marj</p>
          <p className="text-lg font-bold text-gray-900">{margin.summary.lowestMargin?.productName || "-"}</p>
          <p className="text-xs text-ena-primary mt-1">%{margin.summary.lowestMargin?.marginPercent || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">Kategori Sayısı</p>
          <p className="text-2xl font-bold text-gray-900">{margin.categories.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Kategori Marjları</h3>
          <div className="space-y-3">
            {margin.categories.map(c => (
              <div key={c.category}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{c.category}</span>
                  <span className={`font-semibold ${c.avgMargin >= 30 ? "text-emerald-600" : c.avgMargin >= 15 ? "text-amber-600" : "text-ena-primary"}`}>%{c.avgMargin}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${c.avgMargin >= 30 ? "bg-emerald-500" : c.avgMargin >= 15 ? "bg-amber-500" : "bg-ena-primary/50"}`} style={{ width: `${Math.min(c.avgMargin, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">En Düşük Marjlı Ürünler</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {margin.products.slice(0, 20).map(p => (
              <div key={p.productId} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-gray-100 overflow-hidden shrink-0">
                  {p.image && p.image !== "/placeholder.svg" ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : <Package size={16} className="m-2 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.productName}</p>
                  <p className="text-xs text-gray-500">{p.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-ena-primary">%{p.marginPercent}</p>
                  <p className="text-xs text-gray-400">{formatTL(p.margin)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Ürün Marj Tablosu</h3>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Ürün</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Satış Fiyatı</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Maliyet</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Marj</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Marj %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {margin.products.map(p => (
                <tr key={p.productId} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <p className="font-medium text-gray-900 truncate max-w-xs">{p.productName}</p>
                    <p className="text-xs text-gray-500">{p.category}</p>
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">{formatTL(p.price)}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{p.costPrice > 0 ? formatTL(p.costPrice) : "-"}</td>
                  <td className={`px-4 py-2 text-right font-medium ${p.margin >= 0 ? "text-emerald-600" : "text-ena-primary"}`}>{formatTL(p.margin)}</td>
                  <td className={`px-4 py-2 text-right font-bold ${p.marginPercent >= 30 ? "text-emerald-600" : p.marginPercent >= 15 ? "text-amber-600" : "text-ena-primary"}`}>%{p.marginPercent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderRep = () => repData.length === 0 ? (
    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
      <Users size={40} className="mx-auto mb-3 text-gray-300" />
      <h2 className="text-lg font-semibold text-gray-700">Hiç temsilci ataması yapılmamış</h2>
      <p className="text-sm text-gray-500 mt-1">Önce bayilere temsilci ataması yapın.</p>
    </div>
  ) : (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">Toplam Temsilci</p>
          <p className="text-2xl font-bold text-gray-900">{repData.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">Toplam Sipariş</p>
          <p className="text-2xl font-bold text-gray-900">{repData.reduce((s, r) => s + r.totalOrders, 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">Toplam Ciro</p>
          <p className="text-2xl font-bold text-gray-900">{formatTL(repData.reduce((s, r) => s + r.totalRevenue, 0))}</p>
        </div>
      </div>

      <div className="space-y-4">
        {repData.map(rep => (
          <div key={rep.repId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
              <div>
                <span className="font-semibold text-gray-900">{rep.repName}</span>
                <span className="text-xs text-gray-500 ml-2">{rep.repEmail}</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span><strong>{rep.dealerCount}</strong> bayi</span>
                <span><strong>{rep.totalOrders}</strong> sipariş</span>
                <span className="font-semibold text-gray-900">{formatTL(rep.totalRevenue)}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-4 py-2 text-left font-semibold text-gray-600 text-xs">Bayi</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-600 text-xs">Sipariş</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-600 text-xs">Ciro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rep.dealers.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <p className="font-medium text-gray-900">{d.name}</p>
                        <p className="text-xs text-gray-500">{d.company}</p>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700">{d.orderCount}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">{formatTL(d.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-2 bg-gray-50 border-t border-gray-200 flex gap-4 text-xs text-gray-500">
              <span>Bekleyen: <strong className="text-amber-600">{rep.pendingOrders}</strong></span>
              <span>Ort. Sipariş: <strong>{formatTL(rep.avgOrderValue)}</strong></span>
              <span>Sevk Edilen: <strong className="text-emerald-600">{rep.shippedOrders}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDetailed = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Başlangıç</label>
            <input type="date" value={detailStart} onChange={e => setDetailStart(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Bitiş</label>
            <input type="date" value={detailEnd} onChange={e => setDetailEnd(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Kategori</label>
            <select value={detailCategory} onChange={e => { setDetailCategory(e.target.value); setDetailProduct(""); }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
              <option value="">Tüm Kategoriler</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ürün</label>
            <select value={detailProduct} onChange={e => setDetailProduct(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
              <option value="">Tüm Ürünler</option>
              {products.filter(p => !detailCategory || (p as any).category === detailCategory).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={fetchDetailed} disabled={detailLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50">
            <Search size={14} /> {detailLoading ? "Sorgulanıyor..." : "Sorgula"}
          </button>
        </div>
      </div>

      {detailOrders.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{detailOrders.length} sipariş bulundu</p>
            <button onClick={exportDetailedCSV} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 text-gray-700">
              <Download size={14} /> CSV İndir
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Sipariş No</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Tarih</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Bayi</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Durum</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Ürün Adet</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Toplam</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">İskonto</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detailOrders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{o.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(o.createdAt).toLocaleDateString("tr-TR")}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{o.dealerName || "-"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          o.status === "delivered" ? "bg-emerald-100 text-emerald-700" :
                          o.status === "shipped" ? "bg-blue-100 text-blue-700" :
                          o.status === "approved" ? "bg-amber-100 text-amber-700" :
                          o.status === "cancelled" ? "bg-ena-primary/10 text-ena-primary" :
                          "bg-gray-100 text-gray-700"
                        }`}>{STATUS_MAP[o.status] || o.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{o.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatTL(o.total)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{(o.discount || 0) > 0 ? formatTL(o.discount) : "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatTL(o.total - (o.discount || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {detailOrders.length === 0 && !detailLoading && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Search size={40} className="mx-auto mb-3 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-700">Sorgulama yapmadınız</h2>
          <p className="text-sm text-gray-500 mt-1">Tarih aralığı seçip "Sorgula"ya tıklayın.</p>
        </div>
      )}

      {detailLoading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin h-6 w-6 border-4 border-gray-300 border-t-gray-900 rounded-full" />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
        <div className="flex items-center gap-2">
          {tab === "dashboard" && (
            <>
              <select value={period} onChange={(e) => setPeriod(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                <option value="7d">Son 7 Gün</option>
                <option value="30d">Son 30 Gün</option>
                <option value="90d">Son 90 Gün</option>
                <option value="12m">Son 12 Ay</option>
              </select>
              <button onClick={exportDashboardCSV} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 text-gray-700">
                <Download size={14} /> CSV
              </button>
            </>
          )}
          {tab === "aging" && aging && (
            <button onClick={exportAgingCSV} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 text-gray-700">
              <Download size={14} /> CSV
            </button>
          )}
          {tab === "margin" && margin && (
            <button onClick={exportMarginCSV} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 text-gray-700">
              <Download size={14} /> CSV
            </button>
          )}
          {tab === "rep" && repData.length > 0 && (
            <button onClick={exportRepCSV} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 text-gray-700">
              <Download size={14} /> CSV
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-gray-900 rounded-full" />
        </div>
      ) : (
        <>
          {tab === "dashboard" && renderDashboard()}
          {tab === "detailed" && renderDetailed()}
          {tab === "aging" && renderAging()}
          {tab === "margin" && renderMargin()}
          {tab === "rep" && renderRep()}
          {tab === "operasyon" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {(["daily", "weekly", "monthly"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setOperasyonPeriod(p)}
                    className={`px-3 py-1.5 text-xs rounded-lg border ${operasyonPeriod === p ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600"}`}
                  >
                    {p === "daily" ? "Günlük" : p === "weekly" ? "Haftalık" : "Aylık"}
                  </button>
                ))}
              </div>
              {operasyonReport && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "Sipariş", value: operasyonReport.orderCount },
                    { label: "Ciro", value: formatTL(operasyonReport.revenue || 0) },
                    { label: "Maliyet", value: formatTL(operasyonReport.cost || 0) },
                    { label: "Kar", value: formatTL(operasyonReport.profit || 0) },
                    { label: "Kargo", value: formatTL(operasyonReport.shipping || 0) },
                    { label: "İade", value: operasyonReport.returns ?? 0 },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500">Operasyon siparişleri (pazaryeri / hazır ürün) — çekirdek + legacy birleşik rapor.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
