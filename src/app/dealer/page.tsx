"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, TrendingUp, TrendingDown, Clock, AlertTriangle, Wallet, RotateCcw, Bell, ChevronUp, ChevronDown, ArrowUpRight, CreditCard, Truck, BarChart3, Star, Heart, FileText, Zap, Sparkles, ArrowRight } from "lucide-react";
import { BarChart, DonutChart } from "@/components/Charts";
import type { MarketplaceCard } from "@/lib/modules/marketplace";

const statusVariant: Record<string, "default"|"success"|"warning"|"danger"> = {
  pending_approval:"warning", approved:"default", pending:"warning", shipped:"default", delivered:"success", cancelled:"danger",
};
const statusText: Record<string, string> = {
  pending_approval:"Onay Bekliyor", approved:"Onaylandı", pending:"Beklemede", shipped:"Kargoda", delivered:"Teslim", cancelled:"İptal",
};

export default function DealerDashboard() {
  const [data, setData] = useState<any>(null);
  const [activeModules, setActiveModules] = useState<MarketplaceCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dealer/dashboard").then((r) => r.json()),
      fetch("/api/dealer/modules").then((r) => r.json()),
    ]).then(([dash, mods]) => {
      if (dash.success) setData(dash.data);
      if (mods.success) setActiveModules(mods.data.activeModules || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse space-y-6"><div className="h-8 w-48 rounded bg-ena-card/50"/><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({length:4}).map((_,i)=><div key={i} className="h-28 rounded-xl bg-ena-card/30"/>)}</div></div>;
  if (!data) return <p className="text-ena-light/50 p-8">Veri yüklenemedi</p>;

  const { dealer, stats, charts, recentOrders, topProducts, recentTransactions, notifications } = data;
  const revChange = stats.lastMonthTotal > 0 ? ((stats.thisMonthTotal - stats.lastMonthTotal) / stats.lastMonthTotal * 100).toFixed(1) : "0";
  const revUp = parseFloat(revChange) >= 0;

  const statCards = [
    { label:"Bu Ay Ciro", value:formatPrice(stats.thisMonthTotal), icon:TrendingUp, change:revChange, up:revUp, color:"text-emerald-400", bg:"bg-emerald-500/10", href:"/dealer/orders" },
    { label:"Bakiye", value:formatPrice(dealer.balance), icon:Wallet, meta:`Kredi: ${dealer.creditLimit > 0 ? formatPrice(dealer.creditLimit) : "—"}`, color:dealer.balance < 0 ? "text-ena-primary" : "text-emerald-400", bg:dealer.balance < 0 ? "bg-ena-primary/50/10" : "bg-emerald-500/10", href:"/dealer/balance" },
    { label:"Toplam Sipariş", value:stats.totalOrders, icon:ShoppingCart, meta:`${stats.pendingApprovals} onay bekliyor`, color:"text-blue-400", bg:"bg-blue-500/10", href:"/dealer/orders" },
    { label:"İndirim Oranı", value:`%${dealer.discountRate}`, icon:Star, meta:dealer.group?.toUpperCase(), color:"text-purple-400", bg:"bg-purple-500/10", href:"/dealer/profile" },
  ];

  const pendingAlerts = [
    { label:"Onay Bekleyen Sipariş", count:stats.pendingApprovals, icon:Clock, color:"bg-amber-500/20 text-amber-300", href:"/dealer/orders" },
    { label:"Bekleyen Teklif", count:stats.pendingQuotes, icon:AlertTriangle, color:"bg-blue-500/20 text-blue-300", href:"/dealer/quotes" },
    { label:"İade Talebi", count:stats.pendingReturns, icon:RotateCcw, color:"bg-ena-primary/50/20 text-red-300", href:"/dealer/returns" },
  ].filter(a => a.count > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ena-text">Hoş Geldin, {dealer.name}</h1>
          <p className="text-sm text-ena-light/70 mt-0.5">{dealer.company} · {dealer.group?.toUpperCase()} Bayi</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dealer/wishlist"><Button variant="outline" size="sm" className="gap-1.5 border-ena-border text-ena-light"><Heart size={15}/> Favorilerim</Button></Link>
          <Link href="/dealer/quick-order"><Button variant="outline" size="sm" className="gap-1.5 border-ena-border text-ena-light"><Zap size={15}/> Hızlı Sipariş</Button></Link>
          <Link href="/catalog"><Button size="sm" className="gap-1.5 shadow-sm"><ShoppingCart size={15}/> Yeni Sipariş</Button></Link>
        </div>
      </div>

      {/* Pending alerts */}
      {pendingAlerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pendingAlerts.map(a => (
            <Link key={a.label} href={a.href} className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${a.color} transition-colors hover:scale-[1.02]`}>
              <a.icon size={14}/> {a.count} {a.label}
            </Link>
          ))}
          {notifications?.length > 0 && (
            <Link href="/dealer/notifications" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-ena-card/50 text-ena-light hover:bg-ena-card">
              <Bell size={14}/> {notifications.length} yeni bildirim
            </Link>
          )}
        </div>
      )}

      {/* Active Modules */}
      <div className="rounded-2xl border border-ena-border bg-ena-card/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-ena-text flex items-center gap-2">
            <Sparkles size={16} className="text-ena-primary" /> Aktif Modüllerim
          </h3>
          <Link href="/dealer/modules" className="text-xs text-ena-primary hover:underline">
            Ek modülleri keşfet
          </Link>
        </div>
        {activeModules.length === 0 ? (
          <p className="text-sm text-ena-light/60">
            Henüz aktif modülünüz yok.{" "}
            <Link href="/dealer/modules" className="text-ena-primary hover:underline">
              Modül Pazarı
            </Link>
            &apos;ndan keşfedin.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {activeModules.map((m) => (
              <Link
                key={m.moduleKey}
                href={m.ctaHref}
                className="group flex items-center justify-between rounded-xl border border-ena-border bg-ena-card/40 px-4 py-3 hover:border-ena-primary/30 hover:bg-ena-card/60 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-ena-text">{m.label}</p>
                  <p className="text-xs text-ena-light/50">{m.planName || m.planKey || "Aktif"}</p>
                </div>
                <ArrowRight size={14} className="text-ena-light/30 group-hover:text-ena-primary" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Inner = (
            <div className="group relative rounded-2xl border border-ena-border bg-ena-card/30 p-5 hover:shadow-xl hover:border-ena-border/50 hover:bg-ena-card/50 transition-all duration-300 cursor-pointer overflow-hidden">
              <div className={`absolute top-0 right-0 w-16 h-16 opacity-5 group-hover:opacity-10 transition-opacity ${card.color}`}>
                <card.icon size={64} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className={`rounded-xl ${card.bg} p-2`}><card.icon size={18} className={card.color}/></div>
                  <ArrowUpRight size={14} className="text-ena-light/20 group-hover:text-ena-light/50"/>
                </div>
                <p className="text-[22px] font-black text-ena-text tracking-tight">{card.value}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-ena-light/70">{card.label}</p>
                  {card.change && <span className={`text-xs font-semibold flex items-center gap-0.5 ${card.up ? "text-emerald-400" : "text-ena-primary"}`}>{card.up ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}%{card.change}</span>}
                  {card.meta && <span className="text-xs text-ena-light/40">· {card.meta}</span>}
                </div>
              </div>
            </div>
          );
          return card.href ? <Link key={card.label} href={card.href}>{Inner}</Link> : <div key={card.label}>{Inner}</div>;
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="rounded-2xl border border-ena-border bg-ena-card/30 p-6">
          <h3 className="text-sm font-semibold text-ena-text mb-4">Aylık Ciro (Son 6 Ay)</h3>
          <div className="h-64">
            <BarChart
              data={charts?.monthlyData || []}
              labels={charts?.monthLabels || []}
              color="#e50914"
              height={256}
            />
          </div>
        </div>

        {/* Category Distribution */}
        <div className="rounded-2xl border border-ena-border bg-ena-card/30 p-6">
          <h3 className="text-sm font-semibold text-ena-text mb-4">Kategori Dağılımı</h3>
          <div className="h-64">
            <DonutChart
              data={charts?.categoryData || {}}
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-ena-border bg-ena-card/30 p-6">
        <h3 className="text-sm font-semibold text-ena-text mb-4">Hızlı İşlemler</h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/dealer/quick-order"><Button variant="outline" size="sm" className="border-ena-border text-ena-light"><Zap size={15} className="mr-1.5"/> Hızlı Sipariş</Button></Link>
          <Link href="/catalog"><Button variant="outline" size="sm" className="border-ena-border text-ena-light"><ShoppingCart size={15} className="mr-1.5"/> Ürün Kataloğu</Button></Link>
          <Link href="/dealer/orders"><Button variant="outline" size="sm" className="border-ena-border text-ena-light"><Package size={15} className="mr-1.5"/> Siparişlerim</Button></Link>
          <Link href="/dealer/quotes"><Button variant="outline" size="sm" className="border-ena-border text-ena-light"><FileText size={15} className="mr-1.5"/> Teklif Al</Button></Link>
          <Link href="/dealer/balance"><Button variant="outline" size="sm" className="border-ena-border text-ena-light"><Wallet size={15} className="mr-1.5"/> Bakiye</Button></Link>
        </div>
      </div>

      {/* Recent Orders & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="rounded-2xl border border-ena-border bg-ena-card/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-ena-text">Son Siparişler</h3>
            <Link href="/dealer/orders" className="text-xs text-ena-primary hover:text-ena-primary transition-colors">Tümünü Gör</Link>
          </div>
          <div className="space-y-3">
            {recentOrders?.slice(0, 5).map((o: any) => (
              <Link key={o.id} href={`/dealer/orders/${o.id}`} className="flex items-center justify-between py-2 hover:bg-ena-card/20 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-ena-card flex items-center justify-center">
                    <Package size={14} className="text-ena-light/70"/>
                  </div>
                  <div>
                    <p className="text-sm text-ena-text font-medium">#{o.orderNo}</p>
                    <p className="text-xs text-ena-light/50">{formatDate(o.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-ena-text">{formatPrice(o.total)}</p>
                  <Badge variant={statusVariant[o.status] || "default"} className="text-[10px]">{statusText[o.status] || o.status}</Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="rounded-2xl border border-ena-border bg-ena-card/30 p-6">
          <h3 className="text-sm font-semibold text-ena-text mb-4">En Çok Satan Ürünler</h3>
          <div className="space-y-3">
            {topProducts?.slice(0, 5).map((p: any, i: number) => (
              <div key={p.id || i} className="flex items-center gap-3 py-2">
                <span className="text-xs font-bold text-ena-light/30 w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ena-text truncate">{p.name}</p>
                  <p className="text-xs text-ena-light/50">{p.sold || 0} adet satıldı</p>
                </div>
                <p className="text-sm font-semibold text-ena-text">{formatPrice(p.revenue || 0)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      {recentTransactions?.length > 0 && (
        <div className="rounded-2xl border border-ena-border bg-ena-card/30 p-6">
          <h3 className="text-sm font-semibold text-ena-text mb-4">Son İşlemler</h3>
          <div className="space-y-2">
            {recentTransactions.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-ena-card/20 transition-colors">
                <div className="flex items-center gap-3">
                  {t.type === "order_debit" ? <TrendingDown size={14} className="text-ena-primary"/> : <TrendingUp size={14} className="text-emerald-400"/>}
                  <div>
                    <p className="text-sm text-ena-text">{t.note || t.type}</p>
                    <p className="text-xs text-ena-light/50">{formatDate(t.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${t.type === "order_debit" ? "text-ena-primary" : "text-emerald-400"}`}>
                    {t.type === "order_debit" ? "-" : "+"}{formatPrice(t.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
