"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Truck } from "lucide-react";

async function api<T>(url: string): Promise<T> {
  const r = await fetch(url);
  const d = await r.json();
  if (!r.ok || !d.success) throw new Error(d.error || `HTTP ${r.status}`);
  return d.data;
}

function fmt(n: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
}

export default function DealerShipmentsPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setShipments(await api("/api/my/shipments"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dealer" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></Link>
          <h1 className="text-lg font-bold">Kargolarım</h1>
        </div>
        <button onClick={load} className="text-xs text-gray-500 flex items-center gap-1"><RefreshCw size={14} /> Yenile</button>
      </div>
      <div className="max-w-4xl mx-auto p-6">
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
        {loading ? <p className="text-sm text-gray-500">Yükleniyor...</p> : (
          <div className="bg-white rounded-xl border divide-y">
            {shipments.map((s) => (
              <div key={s.id} className="p-4">
                <div className="flex items-center gap-2 font-medium"><Truck size={14} /> {s.trackingNumber || "Takip no yok"}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {s.cargoCompany} · {s.order?.orderNumber} · {s.status}
                  {s.deliveredAt && ` · Teslim: ${new Date(s.deliveredAt).toLocaleDateString("tr-TR")}`}
                </div>
                <div className="text-xs text-gray-400 mt-1">Kargo: {fmt(s.shippingCost)} · Desi: {s.desi}</div>
              </div>
            ))}
            {shipments.length === 0 && <p className="p-4 text-sm text-gray-500">Kargo kaydı yok.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
