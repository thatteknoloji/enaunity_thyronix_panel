"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, ShoppingCart } from "lucide-react";
import { statusLabel } from "@/lib/ui/turkish-labels";

async function api<T>(url: string): Promise<T> {
  const r = await fetch(url);
  const d = await r.json();
  if (!r.ok || !d.success) throw new Error(d.error || `HTTP ${r.status}`);
  return d.data;
}

function fmt(n: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
}

export default function DealerMarketplaceOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await api("/api/dealer/marketplace-hub?type=orders"));
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
          <h1 className="text-lg font-bold">Pazaryeri Siparişleri</h1>
        </div>
        <button onClick={load} className="text-xs text-gray-500 flex items-center gap-1"><RefreshCw size={14} /></button>
      </div>
      <div className="max-w-4xl mx-auto p-6">
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
        {loading ? <p className="text-sm text-gray-500">Yükleniyor...</p> : (
          <div className="bg-white rounded-xl border divide-y">
            {orders.map((o) => (
              <div key={o.id} className="p-4 flex justify-between">
                <div>
                  <div className="font-medium flex items-center gap-2"><ShoppingCart size={14} /> {o.orderNumber}</div>
                  <div className="text-xs text-gray-500">{o.marketplace} · {o.marketplaceOrderId} · {o.customerName}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{fmt(o.totalAmount)}</div>
                  <div className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 inline-block mt-1">{statusLabel(o.status)}</div>
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="p-4 text-sm text-gray-500">Pazaryeri siparişi yok. Bağlantı ekleyip senkronize edin.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
