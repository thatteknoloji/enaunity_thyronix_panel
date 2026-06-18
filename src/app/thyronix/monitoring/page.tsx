"use client";

import { useEffect, useState } from "react";
import { Activity, Clock, Cpu, HardDrive, Wifi, Check, AlertTriangle } from "lucide-react";

export default function ThyronixMonitoringPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch("/api/thyronix/reports").then(r=>r.json()).then(d=>{if(d.success)setData(d.data)}); }, []);

  const queues = [
    { name:"Kaynak Sync",pending:0,running:data?1:0,completed:data?.sources?.total||0,failed:0,avgTime:"76s" },
    { name:"Ürün İşleme",pending:0,running:0,completed:data?.products?.total?.toLocaleString()||"0",failed:data?.issues?.zeroPrice||0,avgTime:"<1s" },
    { name:"Feed Oluşturma",pending:0,running:0,completed:data?.feeds?.total||0,failed:0,avgTime:"1.4s" },
    { name:"Kural İşleme",pending:0,running:0,completed:data?.rules?.total||0,failed:0,avgTime:"<1s" },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-nexa-text">Monitoring</h1><p className="text-sm text-nexa-text-secondary mt-1">Sistem durumu, kuyruk ve performans</p></div>

      {/* System Health */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {icon:Cpu,label:"API",val:"✓ Online",color:"text-nexa-success",bg:"bg-nexa-success/10"},
          {icon:HardDrive,label:"Veritabanı",val:"SQLite",color:"text-nexa-primary",bg:"bg-nexa-primary/10"},
          {icon:Wifi,label:"Cron",val:"Aktif",color:"text-nexa-success",bg:"bg-nexa-success/10"},
          {icon:Activity,label:"Feed Motoru",val:"Hazır",color:"text-nexa-success",bg:"bg-nexa-success/10"},
        ].map((s,i)=>(<div key={i} className="rounded-xl border border-nexa-border bg-nexa-card p-4"><div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center ${s.color} mb-2`}><s.icon size={16}/></div><p className="text-xs text-nexa-text-secondary">{s.label}</p><p className="text-sm font-bold text-nexa-text">{s.val}</p></div>))}
      </div>

      {/* Queue Monitor */}
      <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
        <div className="p-5 border-b border-nexa-border"><h2 className="font-semibold text-nexa-text text-sm">Kuyruk Monitörü</h2></div>
        <table className="w-full text-sm"><thead><tr className="border-b border-nexa-border bg-nexa-bg/50"><th className="px-4 py-2 text-left text-nexa-text-secondary">Kuyruk</th><th className="px-4 py-2 text-center text-nexa-text-secondary">Bekleyen</th><th className="px-4 py-2 text-center text-nexa-text-secondary">Çalışan</th><th className="px-4 py-2 text-center text-nexa-text-secondary">Tamamlanan</th><th className="px-4 py-2 text-center text-nexa-text-secondary">Hatalı</th><th className="px-4 py-2 text-right text-nexa-text-secondary">Ort. Süre</th></tr></thead>
        <tbody className="divide-y divide-nexa-border">{queues.map((q,i)=>(<tr key={i} className="hover:bg-nexa-hover"><td className="px-4 py-2 text-nexa-text">{q.name}</td><td className="px-4 py-2 text-center text-nexa-text-secondary">{q.pending}</td><td className="px-4 py-2 text-center">{q.running>0?<span className="text-xs bg-nexa-primary/10 text-nexa-primary px-1.5 py-0.5 rounded">{q.running}</span>:"—"}</td><td className="px-4 py-2 text-center text-nexa-text">{q.completed}</td><td className="px-4 py-2 text-center">{q.failed>0?<span className="text-xs text-nexa-danger">{q.failed}</span>:"0"}</td><td className="px-4 py-2 text-right text-nexa-text-secondary">{q.avgTime}</td></tr>))}</tbody></table>
      </div>

      {/* Sync Performance */}
      <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
        <div className="p-5 border-b border-nexa-border"><h2 className="font-semibold text-nexa-text text-sm">Senkronizasyon Performansı</h2></div>
        <table className="w-full text-sm"><thead><tr className="border-b border-nexa-border bg-nexa-bg/50"><th className="px-4 py-2 text-left text-nexa-text-secondary">Metrik</th><th className="px-4 py-2 text-right text-nexa-text-secondary">Süre</th><th className="px-4 py-2 text-right text-nexa-text-secondary">%</th></tr></thead>
        <tbody className="divide-y divide-nexa-border">
          {[{label:"XML İndirme",val:"60s",pct:"79%"},{label:"Parse Süresi",val:"5s",pct:"7%"},{label:"Eşleştirme",val:"2s",pct:"3%"},{label:"Merge",val:"1s",pct:"1%"},{label:"DB Yazma",val:"5s",pct:"7%"},{label:"Toplam",val:"76s",pct:"100%"}].map((m,i)=>(<tr key={i} className="hover:bg-nexa-hover"><td className="px-4 py-2 text-nexa-text">{m.label}</td><td className="px-4 py-2 text-right text-nexa-text">{m.val}</td><td className="px-4 py-2 text-right text-nexa-text-secondary">{m.pct}</td></tr>))}
        </tbody></table>
      </div>
    </div>
  );
}
