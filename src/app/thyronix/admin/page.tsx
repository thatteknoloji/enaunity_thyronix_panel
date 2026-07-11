"use client";

import { useState } from "react";
import { Settings, Users, Shield, FileText, Activity } from "lucide-react";
import SettingsPage from "../settings/settings-content";
import UsersPage from "../users/page";
import AuditPage from "../audit/page";
import MonitoringPage from "../monitoring/page";

const tabs = [
  { id: "settings", label: "Ayarlar", icon: Settings },
  { id: "users", label: "Kullanıcılar", icon: Users },
  { id: "licenses", label: "Lisanslar", icon: Shield },
  { id: "logs", label: "Loglar", icon: FileText },
  { id: "system", label: "Sistem Durumu", icon: Activity },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("settings");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nexa-text">Yönetim</h1>
        <p className="text-sm text-nexa-text-secondary mt-1">Sistem ayarları, kullanıcı yönetimi ve denetim</p>
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
        {activeTab === "settings" && <SettingsPage />}
        {activeTab === "users" && <UsersPage />}
        {activeTab === "licenses" && (
          <div className="rounded-xl border border-nexa-border bg-nexa-card p-12 text-center">
            <Shield size={48} className="mx-auto text-nexa-text-secondary/30 mb-4" />
            <h3 className="text-lg font-semibold text-nexa-text mb-2">Lisans Yönetimi</h3>
            <p className="text-sm text-nexa-text-secondary mb-4">
              THYRONIX modül lisanslarını görüntüleyin ve yönetin.
            </p>
            <div className="max-w-md mx-auto space-y-3 text-left">
              <div className="p-4 rounded-lg bg-nexa-success/5 border border-nexa-success/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-nexa-text">THYRONIX Core</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-nexa-success/10 text-nexa-success">Aktif</span>
                </div>
                <p className="text-xs text-nexa-text-secondary mt-1">Temel ürün yönetimi ve feed oluşturma</p>
              </div>
              <div className="p-4 rounded-lg bg-nexa-success/5 border border-nexa-success/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-nexa-text">THYRONIX AI</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-nexa-success/10 text-nexa-success">Aktif</span>
                </div>
                <p className="text-xs text-nexa-text-secondary mt-1">Yapay zeka destekli optimizasyon</p>
              </div>
            </div>
          </div>
        )}
        {activeTab === "logs" && <AuditPage />}
        {activeTab === "system" && <MonitoringPage />}
      </div>
    </div>
  );
}
