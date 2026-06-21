"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Store } from "lucide-react";
import { ModuleMarketplaceCard } from "@/components/modules/ModuleMarketplaceCard";
import type { MarketplaceCard } from "@/lib/modules/marketplace";

export default function DealerModulesPage() {
  const [modules, setModules] = useState<MarketplaceCard[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dealer/modules")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setModules(d.data.modules || []);
          setActiveCount((d.data.activeModules || []).length);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-ena-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Modül Pazarı</h1>
        <p className="text-sm text-ena-light mt-1">
          Premium modüllerinizi yönetin. Aktif lisanslı {activeCount} modülünüz var.
        </p>
      </div>

      {activeCount > 0 && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-300">
          Lisanslı modülleriniz sol menüde <strong>Modüllerim</strong> altında görünür.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {modules.map((m) => (
          <ModuleMarketplaceCard key={m.moduleKey} module={m} />
        ))}
      </div>

      <p className="text-xs text-ena-light/60">
        Tüm lisans detayları için{" "}
        <Link href="/products" className="text-cyan-400 hover:underline inline-flex items-center gap-1">
          <Store size={12} /> Modül Merkezi
        </Link>
      </p>
    </div>
  );
}
