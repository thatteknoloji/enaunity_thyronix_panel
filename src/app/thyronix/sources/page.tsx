"use client";

import { useEffect, useState } from "react";
import { Link2, FileText, Table, Globe, Settings, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import SourcesContent from "./sources-content";

const tabs = [
  { id: "general", label: "Genel", icon: Settings },
  { id: "xml", label: "XML", icon: FileText },
  { id: "excel", label: "Excel", icon: Table },
  { id: "csv", label: "CSV", icon: Table },
  { id: "api", label: "API", icon: Globe },
];

export default function SourcesPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [sources, setSources] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/thyronix/reports").then(r=>r.json()).then(d=>{if(d.success)setSources(d.data?.sources?.list||[])});
  }, []);

  const active = sources.filter((s:any)=>s.status==="active").length;
  const total = sources.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nexa-text">Kaynaklar</h1>
        <p className="text-sm text-nexa-text-secondary mt-1">Ürün kaynaklarını yönetin ve senkronizasyonu kontrol edin</p>
      </div>

      {/* ── Source Health ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-nexa-card border border-nexa-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-nexa-success/10 flex items-center justify-center"><CheckCircle2 size={18} className="text-nexa-success"/></div>
          <div><p className="text-lg font-bold text-nexa-text">{active}</p><p className="text-[11px] text-nexa-text-secondary">Aktif Kaynak</p></div>
        </div>
        <div className="rounded-xl bg-nexa-card border border-nexa-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-nexa-warning/10 flex items-center justify-center"><AlertTriangle size={18} className="text-nexa-warning"/></div>
          <div><p className="text-lg font-bold text-nexa-text">{total-active}</p><p className="text-[11px] text-nexa-text-secondary">Pasif Kaynak</p></div>
        </div>
        <div className="rounded-xl bg-nexa-card border border-nexa-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-nexa-primary/10 flex items-center justify-center"><Link2 size={18} className="text-nexa-primary"/></div>
          <div><p className="text-lg font-bold text-nexa-text">{sources.reduce((sum:number,s:any)=>sum+(s.productCount||0),0).toLocaleString("tr-TR")}</p><p className="text-[11px] text-nexa-text-secondary">Toplam Ürün</p></div>
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
        {activeTab === "general" && <SourcesContent />}
        {activeTab === "xml" && (
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-12 text-center">
            <FileText size={48} className="mx-auto text-nexa-text-secondary/30 mb-4" />
            <h3 className="text-lg font-semibold text-nexa-text mb-2">XML Kaynakları</h3>
            <p className="text-sm text-nexa-text-secondary mb-4">
              XML feed'leri ekleyin, alan eşleştirmelerini yapılandırın ve senkronizasyonu başlatın.
            </p>
            <p className="text-xs text-nexa-text-secondary/60">
              Kaynak eklemek için "Genel" sekmesindeki "Yeni Kaynak" butonunu kullanın.
            </p>
          </div>
        )}
        {activeTab === "excel" && (
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-12 text-center">
            <Table size={48} className="mx-auto text-nexa-text-secondary/30 mb-4" />
            <h3 className="text-lg font-semibold text-nexa-text mb-2">Excel Kaynakları</h3>
            <p className="text-sm text-nexa-text-secondary">
              Excel dosyalarından ürün verilerini içe aktarın.
            </p>
          </div>
        )}
        {activeTab === "csv" && (
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-12 text-center">
            <Table size={48} className="mx-auto text-nexa-text-secondary/30 mb-4" />
            <h3 className="text-lg font-semibold text-nexa-text mb-2">CSV Kaynakları</h3>
            <p className="text-sm text-nexa-text-secondary">
              CSV dosyalarından ürün verilerini içe aktarın.
            </p>
          </div>
        )}
        {activeTab === "api" && (
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-12 text-center">
            <Globe size={48} className="mx-auto text-nexa-text-secondary/30 mb-4" />
            <h3 className="text-lg font-semibold text-nexa-text mb-2">API Kaynakları</h3>
            <p className="text-sm text-nexa-text-secondary">
              REST API'ler üzerinden ürün verilerini senkronize edin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
