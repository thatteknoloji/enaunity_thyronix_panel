"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, ShoppingCart, Users, TrendingUp, DollarSign, ClipboardList, AlertTriangle, Star, Store, FileText, Plus, Zap, ChevronUp, ChevronDown, ArrowUpRight, Clock } from "lucide-react";
import { formatPrice } from "@/lib/utils";

const MONTHS = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
const now = new Date();
const CURRENT_MONTH = now.getMonth();
const TODAY = now.toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric"});

export default function AdminDashboard() {
  const [stats, setStats] = useState({ products:0,orders:0,users:0,revenue:0,applications:0,lowStock:0,pendingApprovals:0,pendingReturns:0,pendingReviews:0,lastMonthRevenue:0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string,number>>({});
  const [monthlyRevenue, setMonthlyRevenue] = useState<number[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topDealers, setTopDealers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountingHealth, setAccountingHealth] = useState<{ hasDivergence: boolean; divergenceCount: number } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/products").then(r=>r.json()),
      fetch("/api/admin/orders").then(r=>r.json()),
      fetch("/api/admin/users").then(r=>r.json()),
      fetch("/api/admin/partner-applications").then(r=>r.json()),
      fetch("/api/admin/returns").then(r=>r.json()),
      fetch("/api/admin/reviews").then(r=>r.json()),
      fetch("/api/admin/accounting/health").then(r=>r.json()).catch(() => null),
    ]).then(([products,orders,users,apps,returns,reviews,health]) => {
      const plist = products.data || [];
      const olist = orders.data || [];
      const totalRevenue = olist.reduce((s:number,o:any)=>s+o.total,0);
      const lowS = plist.filter((p:any)=>p.minStockLevel>0&&p.stock<=p.minStockLevel);
      const pendingApps = (apps.data||[]).filter((a:any)=>a.status==="pending").length;
      const pendingRets = (returns.data||[]).filter((r:any)=>r.status==="pending").length;
      const pendingRevs = (reviews.data||[]).filter((r:any)=>!r.approved).length;
      const pendingOrders = olist.filter((o:any)=>o.status==="pending_approval").length;

      // Last month revenue
      const lastMonth = CURRENT_MONTH===0?11:CURRENT_MONTH-1;
      const lastMonthRev = olist.filter((o:any)=>new Date(o.createdAt).getMonth()===lastMonth).reduce((s:number,o:any)=>s+o.total,0);

      setStats({products:plist.length,orders:olist.length,users:(users.data||[]).length,revenue:totalRevenue,applications:pendingApps,lowStock:lowS.length,pendingApprovals:pendingOrders,pendingReturns:pendingRets,pendingReviews:pendingRevs,lastMonthRevenue:lastMonthRev});
      setLowStockProducts(lowS);
      setRecentOrders(olist.slice(0,5));

      const counts:Record<string,number>={}; olist.forEach((o:any)=>{counts[o.status]=(counts[o.status]||0)+1}); setStatusCounts(counts);

      const monthly:number[]=new Array(12).fill(0); olist.forEach((o:any)=>{monthly[new Date(o.createdAt).getMonth()]+=o.total}); setMonthlyRevenue(monthly);

      const ps:Record<string,any>={}; olist.forEach((o:any)=>{(o.items||[]).forEach((it:any)=>{const k=it.productId; if(!ps[k])ps[k]={name:it.product?.name||"",qty:0,revenue:0}; ps[k].qty+=it.quantity; ps[k].revenue+=it.price*it.quantity})}); setTopProducts(Object.values(ps).sort((a:any,b:any)=>b.revenue-a.revenue).slice(0,5));

      const ds:Record<string,any>={}; olist.forEach((o:any)=>{if(o.dealer){const k=o.dealer.id; if(!ds[k])ds[k]={name:o.dealer.company||o.dealer.name||"",revenue:0,orders:0}; ds[k].revenue+=o.total; ds[k].orders+=1}});       setTopDealers(Object.values(ds).sort((a:any,b:any)=>b.revenue-a.revenue).slice(0,5));

      if (health?.success) {
        setAccountingHealth({ hasDivergence: health.data.hasDivergence, divergenceCount: health.data.divergenceCount });
      }

      setLoading(false);
    });
  },[]);

  const maxMonthly = Math.max(...monthlyRevenue,1);
  const revChange = stats.lastMonthRevenue>0?(((stats.revenue-stats.lastMonthRevenue)/stats.lastMonthRevenue)*100).toFixed(1):"0";
  const revUp = parseFloat(revChange)>=0;
  const totalStatus = Object.values(statusCounts).reduce((a,b)=>a+b,0)||1;

  const statCards = [
    {label:"Toplam Gelir",value:`₺${stats.revenue.toLocaleString("tr-TR")}`,icon:DollarSign,gradient:"from-emerald-500 to-teal-400",bg: "bg-emerald-50",change:revChange,up:revUp,href:"/admin/orders"},
    {label:"Siparişler",value:stats.orders,icon:ShoppingCart,gradient:"from-blue-500 to-cyan-400",bg:"bg-blue-50",meta:`${stats.pendingApprovals} onay bekliyor`,href:"/admin/orders"},
    {label:"Ürünler",value:stats.products,icon:Package,gradient:"from-violet-500 to-purple-400",bg:"bg-violet-50",meta:`${stats.lowStock} kritik stok`,href:"/admin/products"},
    {label:"Bayi Başvuruları",value:stats.applications,icon:Store,gradient:"from-amber-500 to-orange-400",bg:"bg-amber-50",meta:"bekleyen",href:"/admin/partner-applications"},
  ];

  const quickActions = [
    {label:"Yeni Ürün",icon:Plus,href:"/admin/products/new",color:"bg-violet-600 hover:bg-violet-700"},
    {label:"Siparişler",icon:ShoppingCart,href:"/admin/orders",color:"bg-blue-600 hover:bg-blue-700"},
    {label:"Bayiler",icon:Store,href:"/admin/dealers",color:"bg-emerald-600 hover:bg-emerald-700"},
    {label:"Excel Export",icon:FileText,href:"/api/admin/export?type=products",color:"bg-amber-600 hover:bg-amber-700"},
  ];

  const pendingAlerts = [
    {label:"Onay Bekleyen Sipariş",count:stats.pendingApprovals,icon:Clock,color:"text-amber-600 bg-amber-50",href:"/admin/orders"},
    {label:"İade Talepleri",count:stats.pendingReturns,icon:AlertTriangle,color:"text-ena-primary bg-ena-primary/5",href:"/admin/returns"},
    {label:"Bekleyen Yorumlar",count:stats.pendingReviews,icon:Star,color:"text-blue-600 bg-blue-50",href:"/admin/reviews"},
  ].filter(a=>a.count>0);

  if(loading) return <div className="animate-pulse space-y-6"><div className="h-8 w-48 rounded bg-gray-200"/><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({length:4}).map((_,i)=><div key={i} className="h-32 rounded-xl bg-gray-200"/>)}</div></div>;

  return (
    <div>
      {/* Hero Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Genel Bakış</h1>
          <p className="mt-1 text-sm text-gray-500 flex items-center gap-1"><Zap size={14} className="text-amber-500"/> {TODAY}</p>
        </div>
      </div>

      {/* Pending Alerts */}
      {pendingAlerts.length>0&&(
        <div className="flex flex-wrap gap-2 mb-6">
          {pendingAlerts.map(a=>(<Link key={a.label} href={a.href} className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${a.color} transition-colors hover:scale-[1.02]`}><a.icon size={14}/>{a.label} <span className="font-bold ml-1">{a.count}</span></Link>))}
        </div>
      )}

      {accountingHealth?.hasDivergence && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Legacy balance ile DealerAccount arasında fark var</p>
            <p className="text-xs text-amber-800 mt-0.5">
              {accountingHealth.divergenceCount} bayide Dealer.balance ≠ DealerAccount.currentBalance.
              <Link href="/admin/dealer-transactions" className="underline ml-1">Cari hareketlerini incele</Link>
            </p>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(card=>{
          const Inner = (
            <div className="group relative rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-xl hover:border-gray-300 transition-all duration-300 cursor-pointer overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 opacity-5 group-hover:opacity-10 transition-opacity">
                <card.icon size={80} className={`bg-gradient-to-br ${card.gradient} bg-clip-text text-transparent`}/>
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className={`rounded-xl ${card.bg} p-2.5`}><card.icon size={20} className={`bg-gradient-to-br ${card.gradient} bg-clip-text text-transparent`}/></div>
                  {card.href&&<ArrowUpRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors"/>}
                </div>
                <p className="text-[28px] font-black text-gray-900 tracking-tight">{card.value}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-500">{card.label}</p>
                  {card.change&&<span className={`text-xs font-semibold flex items-center gap-0.5 ${card.up?"text-emerald-600":"text-ena-primary"}`}>{card.up?<ChevronUp size={12}/>:<ChevronDown size={12}/>}%{card.change}</span>}
                  {card.meta&&<span className="text-xs text-gray-400">· {card.meta}</span>}
                </div>
              </div>
            </div>
          );
          return card.href?<Link key={card.label} href={card.href}>{Inner}</Link>:<div key={card.label}>{Inner}</div>;
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3 mb-8">

        {/* Monthly Revenue — spans 2 cols */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-gray-900">Aylık Gelir</h2>
              <p className="text-xs text-gray-500 mt-0.5">Son 12 ay (₺)</p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">+%{revChange}</span>
          </div>
          <div className="flex items-end justify-between gap-1.5 h-40">
            {monthlyRevenue.map((val,i)=>{
              const h = Math.max((val/maxMonthly)*100,val>0?6:0);
              const isCurrent = i===CURRENT_MONTH;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <span className="text-[10px] font-medium text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">{val>0?`${(val/1000).toFixed(0)}K`:""}</span>
                  <div className={`w-full rounded-t transition-all duration-500 cursor-pointer ${isCurrent?"bg-gradient-to-t from-blue-600 to-blue-400":"bg-gradient-to-t from-gray-200 to-gray-300 hover:from-blue-300 hover:to-blue-200"}`}
                    style={{height:`${h}%`,minHeight:val>0?"4px":"0"}}/>
                  <span className={`text-[10px] font-semibold ${isCurrent?"text-blue-600":"text-gray-400"}`}>{MONTHS[i]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Status Donut */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-4">Sipariş Durumu</h2>
          <div className="space-y-3">
            {[{key:"pending_approval",label:"Onay Bekliyor",color:"bg-amber-400"},{key:"approved",label:"Onaylandı",color:"bg-blue-400"},{key:"pending",label:"Beklemede",color:"bg-yellow-400"},{key:"shipped",label:"Kargoda",color:"bg-purple-400"},{key:"delivered",label:"Teslim",color:"bg-emerald-400"},{key:"cancelled",label:"İptal",color:"bg-red-400"}].map(s=>{
              const count=statusCounts[s.key]||0;
              if(count===0)return null;
              const pct=(count/totalStatus)*100;
              return (
                <div key={s.key}>
                  <div className="flex items-center justify-between text-sm mb-1"><span className="text-gray-700">{s.label}</span><span className="font-medium text-gray-900">{count}</span></div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ${s.color}`} style={{width:`${pct}%`}}/></div>
                </div>
              );
            })}
            {totalStatus<=1&&<p className="text-xs text-gray-400 text-center py-4">Henüz veri yok</p>}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">En Çok Satan</h2>
            <TrendingUp size={16} className="text-emerald-500"/>
          </div>
          {topProducts.length===0?<p className="text-sm text-gray-400 text-center py-8">Henüz satış yok</p>:
          <div className="space-y-3">
            {topProducts.map((p,i)=>(<div key={i} className="flex items-center justify-between group"><div className="flex items-center gap-3 min-w-0"><span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:bg-gray-200 transition-colors">{i+1}</span><span className="text-sm text-gray-700 truncate">{p.name}</span></div><div className="text-right shrink-0"><span className="text-sm font-bold text-gray-900">{p.revenue.toLocaleString("tr-TR")} ₺</span><span className="text-[10px] text-gray-400 ml-2">{p.qty} adet</span></div></div>))}
          </div>}
        </div>

        {/* Top Dealers + Quick Actions */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">En İyi Bayiler</h2>
              <Store size={16} className="text-purple-500"/>
            </div>
            {topDealers.length===0?<p className="text-sm text-gray-400 text-center py-8">Henüz bayi siparişi yok</p>:
            <div className="space-y-3">
              {topDealers.map((d,i)=>(<div key={i} className="flex items-center justify-between group"><div className="flex items-center gap-3 min-w-0"><span className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600">{i+1}</span><span className="text-sm text-gray-700 truncate">{d.name}</span></div><div className="text-right shrink-0"><span className="text-sm font-bold text-gray-900">{d.revenue.toLocaleString("tr-TR")} ₺</span><span className="text-[10px] text-gray-400 ml-2">{d.orders} sip.</span></div></div>))}
            </div>}
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-4">Hızlı İşlemler</h2>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map(a=>{
                const inner = (<div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-white text-sm font-medium ${a.color} transition-all hover:shadow-lg justify-center`}><a.icon size={16}/>{a.label}</div>);
                return a.href.startsWith("/")?<Link key={a.label} href={a.href}>{inner}</Link>:<a key={a.label} href={a.href}>{inner}</a>;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
