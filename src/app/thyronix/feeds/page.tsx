"use client";

import { useState } from "react";
import { Radio, Heart, FileDown, CheckCircle, Clock } from "lucide-react";
import FeedsPage from "./feeds-content";
import HealthPage from "../health/page";
import ImportExportPage from "../import-export/page";
import SyncPage from "../sync/page";
import LogsPage from "../logs/page";

const tabs = [
  { id: "feeds", label: "Feedler", icon: Radio },
  { id: "outputs", label: "Çıktılar", icon: FileDown },
  { id: "validation", label: "Doğrulama", icon: CheckCircle },
  { id: "health", label: "Sağlık", icon: Heart },
  { id: "history", label: "Geçmiş", icon: Clock },
];

export default function FeedCenterPage() {
  const [activeTab, setActiveTab] = useState("feeds");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nexa-text">Feed Merkezi</h1>
        <p className="text-sm text-nexa-text-secondary mt-1">Feedleri yönetin, doğrulayın ve yayınlayın</p>
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
        {activeTab === "feeds" && <FeedsPage />}
        {activeTab === "outputs" && <ImportExportPage />}
        {activeTab === "validation" && (
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-12 text-center">
            <CheckCircle size={48} className="mx-auto text-nexa-text-secondary/30 mb-4" />
            <h3 className="text-lg font-semibold text-nexa-text mb-2">Feed Doğrulama</h3>
            <p className="text-sm text-nexa-text-secondary">
              Feed çıktılarınızı otomatik olarak doğrulayın. Eksik alanları, hatalı formatları ve uyumsuzlukları tespit edin.
            </p>
          </div>
        )}
        {activeTab === "health" && <HealthPage />}
        {activeTab === "history" && (
          <div className="space-y-6">
            <SyncPage />
            <div className="mt-8">
              <LogsPage />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
