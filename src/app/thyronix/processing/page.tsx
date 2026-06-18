"use client";

import { useState } from "react";
import { GitBranch, Tag, Layers, ShieldBan, AlertTriangle, Copy } from "lucide-react";
import RulesPage from "../rules/page";
import BrandMappingPage from "../brand-mapping/page";
import CategoryMappingPage from "../category-mapping/page";
import ExclusionsPage from "../exclusions/page";
import IssuesPage from "../issues/page";

const tabs = [
  { id: "rules", label: "Kurallar", icon: GitBranch },
  { id: "brand", label: "Özel Marka", icon: Tag },
  { id: "category", label: "Kategori Eşleştirme", icon: Layers },
  { id: "exclusions", label: "Hariç Tutmalar", icon: ShieldBan },
  { id: "issues", label: "Sorunlar", icon: AlertTriangle },
  { id: "duplicates", label: "Kopya Ürünler", icon: Copy },
];

export default function ProcessingCenterPage() {
  const [activeTab, setActiveTab] = useState("rules");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nexa-text">İşleme Merkezi</h1>
        <p className="text-sm text-nexa-text-secondary mt-1">Ürün verilerini işleyin, kuralları uygulayın ve eşleştirmeleri yönetin</p>
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
        {activeTab === "rules" && <RulesPage />}
        {activeTab === "brand" && <BrandMappingPage />}
        {activeTab === "category" && <CategoryMappingPage />}
        {activeTab === "exclusions" && <ExclusionsPage />}
        {activeTab === "issues" && <IssuesPage />}
        {activeTab === "duplicates" && (
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-12 text-center">
            <Copy size={48} className="mx-auto text-nexa-text-secondary/30 mb-4" />
            <h3 className="text-lg font-semibold text-nexa-text mb-2">Kopya Ürün Tespiti</h3>
            <p className="text-sm text-nexa-text-secondary">
              Bu özellik yakında aktif olacak. Kopya ürünleri otomatik olarak tespit edecek ve birleştirebileceksiniz.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
