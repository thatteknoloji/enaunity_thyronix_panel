"use client";

import { useEffect, useState } from "react";
import { Store, ExternalLink, CheckCircle, XCircle, Search, Globe, Loader2, AlertCircle } from "lucide-react";

type DealerStore = {
  id: string;
  dealerId: string;
  name: string;
  slug: string;
  status: string;
  orderCount: number;
  totalRevenue: number;
  paymentModel: string;
  logo: string;
  customDomain: string;
  customDomainVerified: boolean;
  createdAt: string;
  _count?: { products: number; orders: number };
};

export default function AdminDropshipPage() {
  const [stores, setStores] = useState<DealerStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dropship/stores")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStores(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDomainAction = async (storeId: string, action: string) => {
    setActing(storeId);
    await fetch("/api/dropship/stores/domain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, action }),
    });
    setActing(null);
    window.location.reload();
  };

  const filtered = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.slug.toLowerCase().includes(search.toLowerCase())
  );

  const pendingDomains = stores.filter((s) => s.customDomain && !s.customDomainVerified);

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
      ACTIVE: { color: "bg-green-100 text-green-800", label: "Aktif" },
      DRAFT: { color: "bg-yellow-100 text-yellow-800", label: "Taslak" },
      SUSPENDED: { color: "bg-red-100 text-red-800", label: "Askıda" },
    };
    const m = map[status] || { color: "bg-gray-100 text-gray-800", label: status };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${m.color}`}>
        {m.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Dropship Store</h1>
          <p className="text-sm text-gray-500 mt-1">Bayi mağazalarını yönet</p>
        </div>
      </div>

      {pendingDomains.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
            <AlertCircle size={16} /> Bekleyen Domain Talepleri ({pendingDomains.length})
          </h2>
          {pendingDomains.map((store) => (
            <div key={store.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100">
              <div>
                <p className="text-sm font-medium text-gray-900">{store.name}</p>
                <p className="text-xs text-gray-500">
                  <strong>{store.customDomain}</strong> → {store.slug}.enaunity.com.tr
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDomainAction(store.id, "verify")} disabled={acting === store.id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
                  {acting === store.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                  Onayla
                </button>
                <button onClick={() => handleDomainAction(store.id, "reject")} disabled={acting === store.id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors disabled:opacity-50">
                  <XCircle size={12} /> Reddet
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Mağaza ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ena-primary/20 focus:border-ena-primary"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Henüz mağaza yok</div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((store) => (
            <div
              key={store.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                    {store.logo ? (
                      <img src={store.logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Store size={24} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{store.name}</h3>
                      {statusBadge(store.status)}
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        {store.paymentModel === "PLATFORM" ? "Platform" : "Bayi POS"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {store.slug}.enaunity.com.tr
                      {store.customDomainVerified && store.customDomain && (
                        <span className="ml-2 text-green-600">
                          | <Globe size={12} className="inline" /> {store.customDomain}
                        </span>
                      )}
                      {store.customDomain && !store.customDomainVerified && (
                        <span className="ml-2 text-amber-600">
                          | <Globe size={12} className="inline" /> {store.customDomain} (onay bekliyor)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">{store.orderCount || 0}</p>
                    <p className="text-xs">Sipariş</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">{store.totalRevenue?.toFixed(2) || "0.00"} TL</p>
                    <p className="text-xs">Ciro</p>
                  </div>
                  <a
                    href={`https://${store.slug}.enaunity.com.tr`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-ena-primary hover:bg-ena-primary/5 rounded-lg transition-colors"
                  >
                    <ExternalLink size={14} />
                    Görüntüle
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
