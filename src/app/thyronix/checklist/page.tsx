"use client";

import { useEffect, useState } from "react";
import { ListChecks, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const DEFAULT_ITEMS = [
  { id: "source", label: "En az bir kaynak ekleyin", href: "/thyronix/sources" },
  { id: "sync", label: "İlk senkronizasyonu çalıştırın", href: "/thyronix/sync" },
  { id: "feed", label: "İlk feedi oluşturun", href: "/thyronix/feeds" },
  { id: "publish", label: "Feedi yayınlayın", href: "/thyronix/feeds" },
  { id: "automation", label: "Otomasyon ayarlarını yapılandırın", href: "/thyronix/automation" },
  { id: "team", label: "Ekip üyesi ekleyin (isteğe bağlı)", href: "/thyronix/users" },
];

export default function ChecklistPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/thyronix/workspace")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data.checklist) setChecked(d.data.checklist as Record<string, boolean>);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    const res = await fetch("/api/thyronix/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklist: next }),
    });
    const d = await res.json();
    if (!d.success) toast.error("Kaydedilemedi");
  };

  const done = DEFAULT_ITEMS.filter((i) => checked[i.id]).length;
  const pct = Math.round((done / DEFAULT_ITEMS.length) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nexa-text flex items-center gap-2">
          <ListChecks size={24} className="text-nexa-primary" /> Kurulum Kontrol Listesi
        </h1>
        <p className="text-sm text-nexa-text-secondary mt-1">THYRONIX kurulumunuzu adım adım tamamlayın</p>
      </div>

      <div className="rounded-xl border border-nexa-border bg-nexa-card p-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-nexa-text-secondary">İlerleme</span>
          <span className="font-semibold text-nexa-text">{done}/{DEFAULT_ITEMS.length} ({pct}%)</span>
        </div>
        <div className="h-2 rounded-full bg-nexa-bg overflow-hidden">
          <div className="h-full bg-nexa-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse h-40 rounded-xl bg-nexa-card border border-nexa-border" />
      ) : (
        <div className="rounded-xl border border-nexa-border bg-nexa-card divide-y divide-nexa-border">
          {DEFAULT_ITEMS.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-4">
              <button onClick={() => toggle(item.id)} className="shrink-0">
                {checked[item.id] ? (
                  <CheckCircle2 size={22} className="text-nexa-success" />
                ) : (
                  <Circle size={22} className="text-nexa-text-secondary" />
                )}
              </button>
              <div className="flex-1">
                <p className={`text-sm ${checked[item.id] ? "text-nexa-text-secondary line-through" : "text-nexa-text font-medium"}`}>{item.label}</p>
              </div>
              <Link href={item.href} className="text-xs text-nexa-primary hover:underline">Git →</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
