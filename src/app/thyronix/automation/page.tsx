"use client";

import { useEffect, useState } from "react";
import { Workflow, RefreshCw, Bell, RotateCcw, Clock } from "lucide-react";
import toast from "react-hot-toast";
import type { ThyronixAutomationSettings } from "@/lib/thyronix/commercial";
import { DEFAULT_AUTOMATION } from "@/lib/thyronix/commercial";

export default function AutomationPage() {
  const [settings, setSettings] = useState<ThyronixAutomationSettings>(DEFAULT_AUTOMATION);
  const [planKey, setPlanKey] = useState("starter");
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/thyronix/workspace")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSettings({ ...DEFAULT_AUTOMATION, ...d.data.automation });
          setPlanKey(d.data.planKey);
          setAutomationEnabled(d.data.limits?.automationEnabled ?? false);
        }
      });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/thyronix/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation: settings }),
      });
      const d = await res.json();
      if (d.success) toast.success("Otomasyon ayarları kaydedildi");
      else toast.error(d.error || "Hata");
    } finally {
      setSaving(false);
    }
  };

  if (!automationEnabled) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-nexa-text">Otomasyon Merkezi</h1>
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-10 text-center">
          <Workflow size={40} className="mx-auto text-nexa-primary/40 mb-3" />
          <p className="text-nexa-text font-medium">Otomasyon {planKey} paketinde kullanılamaz</p>
          <p className="text-sm text-nexa-text-secondary mt-2">Professional veya Enterprise plana yükseltin.</p>
          <a href="/thyronix/pricing" className="inline-block mt-4 text-sm text-nexa-primary hover:underline">Paketleri Gör</a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nexa-text">Otomasyon Merkezi</h1>
        <p className="text-sm text-nexa-text-secondary mt-1">Sync, feed üretimi ve bildirimleri otomatikleştirin</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-nexa-border bg-nexa-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-nexa-primary"><RefreshCw size={18} /><h3 className="font-semibold text-nexa-text">Otomatik Sync</h3></div>
          <label className="flex items-center gap-2 text-sm text-nexa-text">
            <input type="checkbox" checked={settings.autoSync} onChange={(e) => setSettings({ ...settings, autoSync: e.target.checked })} />
            Kaynakları otomatik senkronize et
          </label>
          <label className="block text-sm text-nexa-text-secondary">
            Aralık (dakika)
            <input type="number" min={15} className="mt-1 w-full rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2" value={settings.syncIntervalMinutes} onChange={(e) => setSettings({ ...settings, syncIntervalMinutes: parseInt(e.target.value) || 60 })} />
          </label>
        </div>

        <div className="rounded-xl border border-nexa-border bg-nexa-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-nexa-primary"><Clock size={18} /><h3 className="font-semibold text-nexa-text">Feed Üretimi</h3></div>
          <label className="flex items-center gap-2 text-sm text-nexa-text">
            <input type="checkbox" checked={settings.autoGenerateFeed} onChange={(e) => setSettings({ ...settings, autoGenerateFeed: e.target.checked })} />
            Feedleri otomatik üret
          </label>
          <label className="block text-sm text-nexa-text-secondary">
            Aralık (saat)
            <input type="number" min={1} className="mt-1 w-full rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2" value={settings.feedIntervalHours} onChange={(e) => setSettings({ ...settings, feedIntervalHours: parseInt(e.target.value) || 6 })} />
          </label>
        </div>

        <div className="rounded-xl border border-nexa-border bg-nexa-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-nexa-primary"><Bell size={18} /><h3 className="font-semibold text-nexa-text">Bildirimler</h3></div>
          <label className="flex items-center gap-2 text-sm text-nexa-text">
            <input type="checkbox" checked={settings.notifications} onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })} />
            E-posta bildirimleri
          </label>
          <label className="flex items-center gap-2 text-sm text-nexa-text">
            <input type="checkbox" checked={settings.notifyOnError} onChange={(e) => setSettings({ ...settings, notifyOnError: e.target.checked })} />
            Hata durumunda uyar
          </label>
        </div>

        <div className="rounded-xl border border-nexa-border bg-nexa-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-nexa-primary"><RotateCcw size={18} /><h3 className="font-semibold text-nexa-text">Retry Politikası</h3></div>
          <select className="w-full rounded-lg border border-nexa-border bg-nexa-bg px-3 py-2 text-sm" value={settings.retryPolicy} onChange={(e) => setSettings({ ...settings, retryPolicy: e.target.value as ThyronixAutomationSettings["retryPolicy"] })}>
            <option value="none">Yeniden deneme yok</option>
            <option value="3x">3 deneme</option>
            <option value="5x">5 deneme</option>
          </select>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-xl bg-nexa-primary text-white text-sm font-semibold disabled:opacity-50">
        {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
      </button>
    </div>
  );
}
