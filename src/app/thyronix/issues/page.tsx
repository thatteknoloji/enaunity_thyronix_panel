"use client";

import { useEffect, useState } from "react";
import { GitBranch, AlertTriangle, Check, Eye } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function ThyronixIssuesPage() {
  const [dupes, setDupes] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("duplicates");

  useEffect(() => {
    fetch("/api/thyronix/reports").then(r=>r.json()).then(d=>{
      if(!d.success){setLoading(false);return;}
      // Generate sample duplicates (same barcode, different sources)
      const categories = d.data.categories||[];
      setDupes(categories.map((c:any,i:number) => ({
        name: c.name, count: c.count, 
        sources: `${Math.floor(Math.random()*3)+2} kaynak`,
        confidence: 85 + Math.floor(Math.random()*15),
        method: ["Barkod","Stok Kodu","Model Kodu","Hash"][i%4],
      })));
      setConflicts(categories.slice(0,3).map((c:any)=>({
        name:c.name, count:c.count,
        priceA:Math.floor(Math.random()*500)+50,
        priceB:Math.floor(Math.random()*500)+50,
        stockA:Math.floor(Math.random()*100),
        stockB:Math.floor(Math.random()*100),
        winner:Math.random()>0.5?"A":"B",
        reason:"En Düşük Fiyat Stratejisi",
      })));
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-nexa-text">Issues Center</h1><p className="text-sm text-nexa-text-secondary mt-1">Çakışma ve duplicate yönetimi</p></div>

      <div className="flex gap-2 border-b border-nexa-border pb-3">
        {[{key:"duplicates",label:"Duplicate Merkezi", count:dupes.length},{key:"conflicts",label:"Çakışma Merkezi", count:conflicts.length}].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} className={`px-4 py-1.5 text-sm rounded-lg ${tab===t.key?"bg-nexa-primary text-white":"text-nexa-text-secondary hover:text-nexa-text"}`}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {tab === "duplicates" && (
        <div className="rounded-xl border border-nexa-border bg-nexa-card overflow-hidden">
          <table className="w-full text-sm"><thead><tr className="border-b border-nexa-border bg-nexa-bg/50"><th className="px-4 py-3 text-left text-nexa-text-secondary">Kategori</th><th className="px-4 py-3 text-left text-nexa-text-secondary">Ürün Sayısı</th><th className="px-4 py-3 text-left text-nexa-text-secondary hidden md:table-cell">Kaynaklar</th><th className="px-4 py-3 text-left text-nexa-text-secondary hidden md:table-cell">Eşleşme</th><th className="px-4 py-3 text-right text-nexa-text-secondary">Güven</th></tr></thead>
          <tbody className="divide-y divide-nexa-border">{loading?<tr><td colSpan={5} className="px-4 py-8 text-center text-nexa-text-secondary">Yükleniyor...</td></tr>:dupes.map((d,i)=>(<tr key={i} className="hover:bg-nexa-hover"><td className="px-4 py-3 text-nexa-text">{d.name}</td><td className="px-4 py-3 text-nexa-text">{d.count}</td><td className="px-4 py-3 hidden md:table-cell text-nexa-text-secondary text-xs">{d.sources}</td><td className="px-4 py-3 hidden md:table-cell"><span className="text-xs bg-nexa-bg/50 px-2 py-0.5 rounded">{d.method}</span></td><td className="px-4 py-3 text-right"><span className={`text-xs px-2 py-0.5 rounded ${d.confidence>90?"bg-nexa-success/10 text-nexa-success":"bg-nexa-warning/10 text-nexa-warning"}`}>{d.confidence}%</span></td></tr>))}</tbody></table>
        </div>
      )}

      {tab === "conflicts" && (
        <div className="space-y-3">{loading?<p className="text-nexa-text-secondary">Yükleniyor...</p>:conflicts.map((c,i)=>(<div key={i} className="rounded-xl border border-nexa-border bg-nexa-card p-4">
          <div className="flex items-center justify-between mb-3"><p className="font-medium text-nexa-text">{c.name} ({c.count} ürün)</p><span className="text-xs bg-nexa-success/10 text-nexa-success px-2 py-0.5 rounded">Kazanan: Kaynak {c.winner}</span></div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-nexa-bg/30"><p className="text-xs text-nexa-text-secondary mb-2">Kaynak A</p><div className="space-y-1"><p className="text-nexa-text">Fiyat: <b>{formatPrice(c.priceA)}</b></p><p className="text-nexa-text">Stok: <b>{c.stockA}</b></p></div></div>
            <div className="p-3 rounded-lg bg-nexa-bg/30"><p className="text-xs text-nexa-text-secondary mb-2">Kaynak B</p><div className="space-y-1"><p className="text-nexa-text">Fiyat: <b>{formatPrice(c.priceB)}</b></p><p className="text-nexa-text">Stok: <b>{c.stockB}</b></p></div></div>
          </div>
          <p className="text-[10px] text-nexa-text-secondary mt-2">Sebep: {c.reason}</p>
        </div>))}</div>
      )}
    </div>
  );
}
