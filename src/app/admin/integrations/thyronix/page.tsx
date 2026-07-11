"use client";

import { useEffect, useState } from "react";
import { Activity, Link2, Users, Shield, Loader2, Clock } from "lucide-react";

type IntegrationStats = {
  connectionStatus: string;
  linkedUserCount: number;
  licensedDealerCount: number;
  pendingLicenseCount: number;
  totalSessionRecords: number;
  lastLogins: Array<{
    id: string;
    dealerId: string;
    lastLoginAt: string;
    enaUser: { id: string; email: string; name: string } | null;
    thyronixUser: { id: string; email: string; username: string } | null;
  }>;
  links: Array<{
    id: string;
    status: string;
    externalEmail: string;
    updatedAt: string;
    enaUser: { id: string; email: string; name: string; dealerId: string | null };
    externalUser: { id: string; email: string; username: string };
  }>;
};

import { AdminModuleAccessPanel } from "@/components/admin/AdminModuleAccessPanel";

const statusLabels: Record<string, string> = {
  connected: "Bağlı",
  awaiting_links: "Bağlantı Bekleniyor",
};

export default function AdminThyronixIntegrationPage() {
  const [stats, setStats] = useState<IntegrationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/integrations/thyronix")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats(d.data);
        else setError(d.error || "Veri yüklenemedi");
        setLoading(false);
      })
      .catch(() => {
        setError("Bağlantı hatası");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-ena-primary" size={32} />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error || "Veri bulunamadı"}
      </div>
    );
  }

  const cards = [
    {
      label: "Bağlantı Durumu",
      value: statusLabels[stats.connectionStatus] || stats.connectionStatus,
      icon: Activity,
      color: stats.connectionStatus === "connected" ? "text-green-600" : "text-amber-600",
    },
    {
      label: "Bağlı Kullanıcı",
      value: stats.linkedUserCount,
      icon: Link2,
      color: "text-blue-600",
    },
    {
      label: "Lisanslı Bayi",
      value: stats.licensedDealerCount,
      icon: Shield,
      color: "text-purple-600",
    },
    {
      label: "Bekleyen Lisans",
      value: stats.pendingLicenseCount,
      icon: Clock,
      color: "text-amber-600",
    },
    {
      label: "Oturum Kaydı",
      value: stats.totalSessionRecords,
      icon: Users,
      color: "text-indigo-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">THYRONIX Entegrasyonu</h1>
        <p className="text-sm text-gray-500 mt-1">
          ENA lisans köprüsü ve THYRONIX hesap bağlantıları. THYRONIX bağımsız ürün olarak kendi girişini kullanır.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
            <div className="flex items-center gap-3 mb-2">
              <card.icon size={20} className={card.color} />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Son Girişler</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 dark:border-gray-700">
                  <th className="px-5 py-3 font-medium">ENA Kullanıcı</th>
                  <th className="px-5 py-3 font-medium">THYRONIX</th>
                  <th className="px-5 py-3 font-medium">Son Giriş</th>
                </tr>
              </thead>
              <tbody>
                {stats.lastLogins.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-gray-400">Henüz oturum kaydı yok</td>
                  </tr>
                ) : (
                  stats.lastLogins.map((s) => (
                    <tr key={s.id} className="border-b border-gray-50 dark:border-gray-700/50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{s.enaUser?.name || "—"}</div>
                        <div className="text-xs text-gray-500">{s.enaUser?.email}</div>
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                        {s.thyronixUser?.email || s.thyronixUser?.username || "—"}
                      </td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(s.lastLoginAt).toLocaleString("tr-TR")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Hesap Bağlantıları</h2>
          </div>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-gray-800">
                <tr className="text-left text-gray-500 border-b border-gray-100 dark:border-gray-700">
                  <th className="px-5 py-3 font-medium">ENA</th>
                  <th className="px-5 py-3 font-medium">THYRONIX</th>
                  <th className="px-5 py-3 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {stats.links.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-gray-400">Bağlantı yok</td>
                  </tr>
                ) : (
                  stats.links.map((link) => (
                    <tr key={link.id} className="border-b border-gray-50 dark:border-gray-700/50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{link.enaUser?.name}</div>
                        <div className="text-xs text-gray-500">{link.enaUser?.email}</div>
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{link.externalEmail}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          link.status === "LINKED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {link.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AdminModuleAccessPanel moduleKey="THYRONIX" />
    </div>
  );
}
