"use client";

import { useState } from "react";
import { Brain, Sparkles, Clock, Settings, BarChart3 } from "lucide-react";
import AiSettingsPage from "./ai-settings-content";
import AiToolsPage from "../ai-tools/page";
import AiJobsPage from "../ai-jobs/page";

const tabs = [
  { id: "tools", label: "Araçlar", icon: Sparkles },
  { id: "suggestions", label: "Öneriler", icon: Brain },
  { id: "jobs", label: "Görevler", icon: Clock },
  { id: "providers", label: "Sağlayıcılar", icon: Settings },
  { id: "usage", label: "Kullanım", icon: BarChart3 },
];

export default function ThyronixAiCenterPage() {
  const [activeTab, setActiveTab] = useState("tools");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nexa-text flex items-center gap-2">
          <Brain size={24} className="text-nexa-primary" />
          THYRONIX AI
        </h1>
        <p className="text-sm text-nexa-text-secondary mt-1">Yapay zeka destekli ürün optimizasyonu ve otomasyon</p>
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
        {activeTab === "tools" && <AiToolsPage />}
        {activeTab === "suggestions" && (
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-12 text-center">
            <Brain size={48} className="mx-auto text-nexa-text-secondary/30 mb-4" />
            <h3 className="text-lg font-semibold text-nexa-text mb-2">AI Önerileri</h3>
            <p className="text-sm text-nexa-text-secondary mb-4">
              Ürünleriniz için AI tarafından oluşturulan önerileri görüntüleyin ve uygulayın.
            </p>
            <p className="text-xs text-nexa-text-secondary/60">
              Öneriler, ürün detay sayfasındaki AI sekmesinden oluşturulabilir.
            </p>
          </div>
        )}
        {activeTab === "jobs" && <AiJobsPage />}
        {activeTab === "providers" && <AiSettingsPage />}
        {activeTab === "usage" && (
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-12 text-center">
            <BarChart3 size={48} className="mx-auto text-nexa-text-secondary/30 mb-4" />
            <h3 className="text-lg font-semibold text-nexa-text mb-2">AI Kullanım İstatistikleri</h3>
            <p className="text-sm text-nexa-text-secondary">
              Token kullanımı, maliyet analizi ve provider bazlı istatistikleri görüntüleyin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
