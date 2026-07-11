"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Plug, Plus } from "lucide-react";
import { statusLabel } from "@/lib/ui/turkish-labels";
import {
  DealerField,
  DealerPanel,
  DealerSubPage,
  dealerInputClass,
  dealerSelectClass,
} from "@/components/dealer/DealerSubPage";
import { readSafeJson } from "@/lib/http/safe-json";

const PLATFORMS = ["TRENDYOL", "HEPSIBURADA", "N11", "AMAZON", "PAZARAMA", "CICEKSEPETI"];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const d = await readSafeJson<{ success?: boolean; data?: T; error?: string }>(r, "Pazaryeri bağlantıları");
  if (!r.ok || !d.success) throw new Error(d.error || `HTTP ${r.status}`);
  return d.data as T;
}

export default function DealerMarketplaceConnectionsPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ platform: "TRENDYOL", sellerId: "", storeId: "", apiKey: "", apiSecret: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConnections(await api("/api/dealer/marketplace-hub"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    try {
      await api("/api/dealer/marketplace-hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...form }),
      });
      setShowForm(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    }
  };

  const sync = async (id: string) => {
    try {
      await api("/api/dealer/marketplace-hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", connectionId: id }),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Senkronizasyon başarısız");
    }
  };

  return (
    <DealerSubPage
      title="Pazaryeri Bağlantıları"
      description="Trendyol, Hepsiburada ve diğer pazaryerlerine API bağlantısı"
      icon={Plug}
      maxWidth="lg"
      actions={
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-ena-primary text-white rounded-lg hover:bg-ena-primary/90"
        >
          <Plus size={14} /> Yeni
        </button>
      }
    >
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-lg mb-4">{error}</div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-20 rounded-xl bg-ena-card/40" />
          <div className="h-20 rounded-xl bg-ena-card/40" />
        </div>
      ) : connections.length === 0 && !showForm ? (
        <DealerPanel className="p-8 text-center">
          <Plug className="mx-auto mb-3 text-ena-light/40" size={32} />
          <p className="text-sm text-ena-light">Henüz pazaryeri bağlantısı yok.</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-4 text-sm text-ena-primary hover:underline"
          >
            İlk bağlantıyı ekle
          </button>
        </DealerPanel>
      ) : (
        <div className="space-y-3">
          {connections.map((c) => (
            <DealerPanel key={c.id} className="p-4 flex flex-wrap justify-between items-center gap-3">
              <div>
                <div className="font-medium text-white flex items-center gap-2">
                  <Plug size={14} className="text-ena-primary" /> {c.platform}
                </div>
                <div className="text-xs text-ena-light mt-1">
                  Satıcı: {c.sellerId || "—"} · Mağaza: {c.storeId || "—"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-ena-light">
                  {statusLabel(c.connectionStatus)}
                </span>
                <button
                  type="button"
                  onClick={() => sync(c.id)}
                  className="text-xs px-2 py-1 border border-white/10 rounded-lg text-ena-light hover:text-white hover:bg-white/5"
                >
                  Senkronize Et
                </button>
              </div>
            </DealerPanel>
          ))}
        </div>
      )}

      {showForm && (
        <DealerPanel className="p-4 space-y-3 mt-4">
          <DealerField label="Platform">
            <select
              className={dealerSelectClass}
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </DealerField>
          <input
            className={dealerInputClass}
            placeholder="Supplier / Seller ID"
            value={form.sellerId}
            onChange={(e) => setForm({ ...form, sellerId: e.target.value })}
          />
          <input
            className={dealerInputClass}
            placeholder="Store ID"
            value={form.storeId}
            onChange={(e) => setForm({ ...form, storeId: e.target.value })}
          />
          <input
            className={dealerInputClass}
            placeholder="API Key"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
          />
          <input
            className={dealerInputClass}
            placeholder="API Secret"
            value={form.apiSecret}
            onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
          />
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={save} className="px-4 py-2 bg-ena-primary text-white text-sm rounded-lg">
              Kaydet
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-ena-light">
              İptal
            </button>
          </div>
        </DealerPanel>
      )}
    </DealerSubPage>
  );
}
