"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GitBranch, Tag, Layers, ShieldBan, AlertTriangle } from "lucide-react";
import RulesPage from "../rules/page";
import BrandMappingPage from "../brand-mapping/page";
import CategoryMappingPage from "../category-mapping/page";
import ExclusionsPage from "../exclusions/page";
import IssuesPage from "../issues/page";
import DuplicateProductsPanel from "@/components/thyronix/DuplicateProductsPanel";

const tabs = [
  { id: "rules", label: "Kurallar", icon: GitBranch },
  { id: "brand", label: "Özel Marka", icon: Tag },
  { id: "category", label: "Kategori Eşleştirme", icon: Layers },
  { id: "exclusions", label: "Hariç Tutmalar", icon: ShieldBan },
  { id: "issues", label: "Sorunlar", icon: AlertTriangle },
  { id: "duplicates", label: "Kopya Ürünler", icon: AlertTriangle },
];

export default function ProcessingCenterPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("rules");
  const duplicateField = (searchParams.get("field") || "all") as "all" | "barcode" | "stockCode" | "modelCode" | "externalId";

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (requestedTab && tabs.some((tab) => tab.id === requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [searchParams]);

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
        {activeTab === "duplicates" && <DuplicateProductsPanel initialField={duplicateField} />}
      </div>
    </div>
  );
}
