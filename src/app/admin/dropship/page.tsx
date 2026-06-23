"use client";

import { useEffect, useState } from "react";
import { Store, ExternalLink, CheckCircle, XCircle, Search } from "lucide-react";

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
  createdAt: string;
  _count?: { products: number; orders: number };
};

export default function AdminDropshipPage() {
  const [stores, setStores] = useState<DealerStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/dropship/stores")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStores(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.slug.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; icon: typeof CheckCircle }> = {
      ACTIVE: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      DRAFT: { color: "bg-yellow-100 text-yellow-800", icon: XCircle },
      SUSPENDED: { color: "bg-red-100 text-red-800", icon: XCircle },
    };
    const m = map[status] || { color: "bg-gray-100 text-gray-800", icon: XCircle };
    const Icon = m.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.color}`}>
        <Icon size={12} />
        {status === "ACTIVE" ? "Aktif" : status === "DRAFT" ? "Taslak" : "Askıda"}
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
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-lg">
                    {store.logo ? (
                      <img src={store.logo} alt="" className="w-full h-full object-cover rounded-lg" />
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
