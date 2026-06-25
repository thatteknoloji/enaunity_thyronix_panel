"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Package, Link2, Radio, GitBranch, Zap, TrendingUp, Clock,
  Play, ArrowRight, ArrowDown, RefreshCw, Brain, FileText,
  Download, Upload, CheckCircle2, AlertTriangle, Copy,
} from "lucide-react";

function AnimatedCounter({ value }: { value: number }) {
  const [n, setN] = useState(0); const ran = useRef(false);
  useEffect(() => { if(ran.current)return;ran.current=true;const s=performance.now();const t=(now:number)=>{const p=Math.min((now-s)/1400,1);setN(Math.round(value*(1-Math.pow(1-p,3))));if(p<1)requestAnimationFrame(t)};requestAnimationFrame(t);},[value]);
  return <>{n.toLocaleString("tr-TR")}</>;
}

export default function DashboardContent() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/thyronix/dashboard").then(r=>r.json()).then(d=>{if(d.success)setData(d.data)}).finally(()=>setLoading(false));
  },[]);

  if(loading) return <div className="animate-pulse space-y-4"><div className="h-48 rounded-2xl bg-nexa-card border border-nexa-border"/><div className="grid grid-cols-4 gap-3">{[0,1,2,3].map(i=><div key={i} className="h-24 rounded-xl bg-nexa-card border border-nexa-border"/>)}</div></div>;

  const d = data || {};
  const totalSources = d.activeSources||0;
  const totalProducts = d.totalProducts||0;
  const totalRules = d.rules?.length||0;
  const totalFeeds = (d.activeFeeds||0) + (d.feeds?.filter((f:any)=>f.status!=="active").length||0);
  const duplicateGroups = d.duplicates?.totalGroups || 0;
  const hasData = totalSources > 0;

  const flowSteps = [
    { icon: Link2, label: "Kaynaklar", desc: "XML, Excel, CSV, API'den veri topla", href: "/thyronix/sources", active: totalSources>0, count: totalSources },
    { icon: RefreshCw, label: "Dönüştür", desc: "Alan eşleştirme ve veri temizleme", href: "/thyronix/sources", active: totalSources>0, count: null },
    { icon: Brain, label: "AI", desc: "Başlık, açıklama, kategori optimizasyonu", href: "/thyronix/ai", active: false, count: null },
    { icon: GitBranch, label: "Kurallar", desc: "Fiyat, stok, marka, kategori kuralları", href: "/thyronix/processing", active: totalRules>0, count: totalRules },
    { icon: Upload, label: "Çıktılar", desc: "XML, CSV, Excel canlı feed", href: "/thyronix/feeds", active: totalFeeds>0, count: totalFeeds },
  ];

  const aiEnabled = d.aiUsage?.enabled ?? false;
  const quickActions = [
    { icon: Link2, label: "Kaynak Ekle", desc: "XML, Excel veya CSV kaynağı", href: "/thyronix/sources", color: "from-blue-500/10 to-blue-600/5 border-blue-500/20" },
    { icon: Radio, label: "Feed Oluştur", desc: "İlk canlı feedinizi yayınlayın", href: "/thyronix/feeds", color: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20" },
    ...(duplicateGroups > 0 ? [{ icon: Copy, label: "Kopya Gruplar", desc: `${duplicateGroups.toLocaleString("tr-TR")} duplicate grup çözüm bekliyor`, href: "/thyronix/processing?tab=duplicates", color: "from-amber-500/10 to-orange-600/5 border-amber-500/20" }] : []),
    ...(aiEnabled ? [{ icon: Brain, label: "AI Optimizasyonu", desc: "Ürünlerinizi AI ile iyileştirin", href: "/thyronix/ai", color: "from-violet-500/10 to-violet-600/5 border-violet-500/20" }] : []),
    { icon: Play, label: "Hızlı Başlangıç", desc: "15 dakikada ilk feedinizi oluşturun", href: "/thyronix/getting-started", color: "from-amber-500/10 to-amber-600/5 border-amber-500/20" },
  ];

  const timelines = (d.recentSyncs||[]).slice(0,8).map((l:any)=>({
    icon: l.type==="sync"?RefreshCw:l.type==="rule"?GitBranch:l.type==="ai"?Brain:l.type==="feed"?Radio:FileText,
    text: l.message||`${l.productCount||0} ürün`,
    time: (()=>{if(!l.createdAt)return"—";const d=Date.now()-new Date(l.createdAt).getTime();const m=Math.floor(d/60000);if(m<1)return"şimdi";if(m<60)return`${m} dk önce`;const h=Math.floor(m/60);if(h<24)return`${h} sa önce`;return`${Math.floor(h/24)} g önce`;})(),
    ok: l.status==="success",
  }));

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ═══ HERO ═══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-nexa-primary/5 via-nexa-card to-nexa-card border border-nexa-border p-8 md:p-10">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-bold text-nexa-text tracking-tight leading-tight">
            Bir kez tanımlayın.<br/>
            <span className="text-nexa-primary">THYRONIX</span> gerisini yönetsin.
          </h1>
          <p className="mt-4 text-nexa-text-secondary text-sm md:text-base max-w-lg leading-relaxed">
            Kaynaklarınızı ekleyin, kurallarınızı tanımlayın. THYRONIX ürün verilerinizi 
            sürekli toplar, dönüştürür, optimize eder ve canlı çıktı olarak güncel tutar. 
            Siz işinize odaklanın.
          </p>
          <div className="flex items-center gap-3 mt-6">
            {!hasData ? (
              <>
                <Link href="/thyronix/getting-started" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-nexa-primary text-white text-sm font-semibold hover:bg-blue-600 transition-colors shadow-lg shadow-nexa-primary/20">
                  Hızlı Başlangıç <ArrowRight size={15}/>
                </Link>
                <Link href="/thyronix/sources" className="px-5 py-2.5 rounded-xl bg-nexa-card border border-nexa-border text-nexa-text text-sm font-medium hover:bg-nexa-hover transition-colors">
                  Kaynak Ekle
                </Link>
              </>
            ) : (
              <Link href="/thyronix/feeds" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-nexa-primary text-white text-sm font-semibold hover:bg-blue-600 transition-colors shadow-lg shadow-nexa-primary/20">
                Feedleri Yönet <ArrowRight size={15}/>
              </Link>
            )}
          </div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-nexa-primary/5 to-transparent hidden lg:block"/>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-2">
          <div className="grid grid-cols-2 gap-2">
            {[{v:totalSources,l:"Kaynak"},{v:totalProducts,l:"Ürün"},{v:totalRules,l:"Kural"},{v:totalFeeds,l:"Çıktı"}].map(m=>(
              <div key={m.l} className="bg-nexa-card/80 backdrop-blur border border-nexa-border rounded-xl px-4 py-3 text-center min-w-[80px]">
                <div className="text-xl font-bold text-nexa-text tabular-nums"><AnimatedCounter value={m.v}/></div>
                <div className="text-[10px] text-nexa-text-secondary uppercase tracking-wider mt-0.5">{m.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ FLOW ═══ */}
      <div className="rounded-2xl bg-nexa-card border border-nexa-border p-6">
        <h2 className="text-sm font-semibold text-nexa-text-secondary uppercase tracking-wider mb-5">THYRONIX Nasıl Çalışır</h2>
        <div className="flex flex-wrap items-start gap-0">
          {flowSteps.map((step, i) => (
            <div key={step.label} className="flex items-start flex-1 min-w-0">
              <Link href={step.href} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-nexa-hover transition-colors text-center flex-1 group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  step.active ? "bg-nexa-primary/15 text-nexa-primary" : "bg-nexa-bg text-nexa-text-secondary/50"
                }`}>
                  <step.icon size={18}/>
                </div>
                <div>
                  <p className="text-xs font-semibold text-nexa-text">{step.label}</p>
                  {step.count !== null && <p className="text-[10px] text-nexa-text-secondary mt-0.5">{step.count} aktif</p>}
                </div>
              </Link>
              {i < flowSteps.length - 1 && (
                <div className="hidden sm:flex items-center pt-5 -ml-1 -mr-1">
                  <ArrowRight size={14} className="text-nexa-border"/>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className={`grid grid-cols-2 gap-3 ${quickActions.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {quickActions.map((a) => (
          <Link key={a.label} href={a.href}
            className={`rounded-2xl bg-gradient-to-br ${a.color} border p-5 text-left hover:scale-[1.02] transition-transform block`}>
            <div className="w-10 h-10 rounded-xl bg-nexa-bg/50 flex items-center justify-center mb-3"><a.icon size={18} className="text-nexa-text"/></div>
            <h3 className="text-sm font-semibold text-nexa-text mb-1">{a.label}</h3>
            <p className="text-xs text-nexa-text-secondary">{a.desc}</p>
          </Link>
        ))}
      </div>

      {/* ═══ ACTIVITY TIMELINE ═══ */}
      <div className="rounded-2xl bg-nexa-card border border-nexa-border p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-nexa-text-secondary uppercase tracking-wider">Son Aktivite</h2>
          <span className="flex items-center gap-1.5 text-[11px] text-nexa-success"><span className="w-1.5 h-1.5 rounded-full bg-nexa-success"/>Canlı</span>
        </div>
        {timelines.length===0 ? (
          <div className="text-center py-8 text-nexa-text-secondary text-sm">Henüz aktivite yok. Bir kaynak ekleyerek başlayın.</div>
        ) : (
          <div className="space-y-0.5">
            {timelines.map((t:any,i:number)=>(
              <div key={i} className="flex items-center gap-4 py-2.5 px-3 rounded-lg hover:bg-nexa-hover transition-colors group">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.ok?"bg-nexa-success/10 text-nexa-success":"bg-nexa-warning/10 text-nexa-warning"}`}>
                  <t.icon size={14}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-nexa-text truncate">{t.text}</p>
                  <p className="text-[11px] text-nexa-text-secondary">{t.source||"THYRONIX"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-nexa-text-secondary">{t.time}</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${t.ok?"bg-nexa-success":"bg-nexa-warning"}`}/>
                </div>
              </div>
            ))}
          </div>
        )}
        <Link href="/thyronix/logs" className="inline-flex items-center gap-1.5 mt-4 text-xs text-nexa-primary hover:underline">Tüm aktiviteyi gör <ArrowRight size={11}/></Link>
      </div>
    </div>
  );
}
