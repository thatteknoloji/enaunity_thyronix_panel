"use client";

import { useEffect, useState } from "react";
import { Package, Brain, AlertTriangle, BarChart3, Clock } from "lucide-react";
import ProductsContent from "./products-content";

const tabs = [
  { id: "all", label: "Tüm Ürünler", icon: Package },
  { id: "ai", label: "AI Önerileri", icon: Brain },
  { id: "issues", label: "Sorunlu Ürünler", icon: AlertTriangle },
  { id: "quality", label: "Kalite Merkezi", icon: BarChart3 },
  { id: "history", label: "Ürün Geçmişi", icon: Clock },
];

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/thyronix/reports").then(r=>r.json()).then(d=>{if(d.success)setStats(d.data)});
  }, []);

  const s = stats || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nexa-text">Ürünler</h1>
        <p className="text-sm text-nexa-text-secondary mt-1">Ürün kataloğunuzu yönetin, AI önerilerini inceleyin ve kaliteyi takip edin</p>
      </div>

      {/* ── Insights ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-nexa-card border border-nexa-border p-4">
          <span className="text-[10px] uppercase tracking-wider text-nexa-text-secondary/60 font-semibold">Toplam Ürün</span>
          <p className="text-2xl font-bold text-nexa-text mt-1">{(s.products?.total||0).toLocaleString("tr-TR")}</p>
          <p className="text-[11px] text-nexa-success mt-1">{(s.products?.active||0).toLocaleString("tr-TR")} aktif</p>
        </div>
        <div className="rounded-xl bg-nexa-card border border-nexa-border p-4">
          <span className="text-[10px] uppercase tracking-wider text-nexa-text-secondary/60 font-semibold">AI Fırsatları</span>
          <p className="text-2xl font-bold text-nexa-text mt-1">{s.issues?.zeroPrice||0}</p>
          <p className="text-[11px] text-nexa-text-secondary mt-1">iyileştirilebilir ürün</p>
        </div>
        <div className="rounded-xl bg-nexa-card border border-nexa-border p-4">
          <span className="text-[10px] uppercase tracking-wider text-nexa-text-secondary/60 font-semibold">Eksik Veri</span>
          <p className="text-2xl font-bold text-nexa-text mt-1">{s.issues?.missingBarcode||0}</p>
          <p className="text-[11px] text-nexa-warning mt-1">barkodsuz ürün</p>
        </div>
        <div className="rounded-xl bg-nexa-card border border-nexa-border p-4">
          <span className="text-[10px] uppercase tracking-wider text-nexa-text-secondary/60 font-semibold">Stoksuz</span>
          <p className="text-2xl font-bold text-nexa-text mt-1">{s.issues?.zeroStock||0}</p>
          <p className="text-[11px] text-nexa-danger mt-1">stoksuz ürün</p>
        </div>
      </div>

      <div className="border-b border-nexa-border">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-nexa-primary text-nexa-primary"
                  : "border-transparent text-nexa-text-secondary hover:text-nexa-text hover:border-nexa-border"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[600px]">
        {activeTab === "all" && <ProductsContent />}
        {activeTab === "ai" && (
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4"><Brain size={28} className="text-violet-400"/></div>
            <h3 className="text-lg font-semibold text-nexa-text mb-2">AI Önerileri</h3>
            <p className="text-sm text-nexa-text-secondary max-w-sm mx-auto">Ürünleriniz için AI tarafından oluşturulan başlık, açıklama ve kategori önerileri.</p>
          </div>
        )}
        {activeTab === "issues" && (
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4"><AlertTriangle size={28} className="text-amber-400"/></div>
            <h3 className="text-lg font-semibold text-nexa-text mb-2">Sorunlu Ürünler</h3>
            <p className="text-sm text-nexa-text-secondary max-w-sm mx-auto">Eksik bilgisi olan, düşük kaliteli veya çakışan ürünleri görüntüleyin ve düzeltin.</p>
          </div>
        )}
        {activeTab === "quality" && (
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4"><BarChart3 size={28} className="text-emerald-400"/></div>
            <h3 className="text-lg font-semibold text-nexa-text mb-2">Kalite Merkezi</h3>
            <p className="text-sm text-nexa-text-secondary max-w-sm mx-auto">Ürün kalite skorlarını görüntüleyin ve iyileştirme önerilerini takip edin.</p>
          </div>
        )}
        {activeTab === "history" && (
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4"><Clock size={28} className="text-blue-400"/></div>
            <h3 className="text-lg font-semibold text-nexa-text mb-2">Ürün Geçmişi</h3>
            <p className="text-sm text-nexa-text-secondary max-w-sm mx-auto">Ürünlerde yapılan değişikliklerin zaman çizelgesini görüntüleyin.</p>
          </div>
        )}
      </div>
    </div>
  );
}
