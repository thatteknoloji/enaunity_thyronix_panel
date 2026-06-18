"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Package, AlertTriangle, RefreshCw, CheckCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";

interface BackorderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  productSku: string;
  ordered: number;
  inStock: number;
  backorderQty: number;
  eta: string;
  price: number;
}

interface Backorder {
  orderId: string;
  orderNo: string;
  createdAt: string;
  status: string;
  total: number;
  user: { name: string; email: string } | null;
  dealer: { name: string } | null;
  items: BackorderItem[];
}

export default function BackordersPage() {
  const [backorders, setBackorders] = useState<Backorder[]>([]);
  const [loading, setLoading] = useState(true);
  const [fulfilling, setFulfilling] = useState<string | null>(null);

  const fetchBackorders = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/backorders");
    const d = await res.json();
    if (d.success) setBackorders(d.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBackorders();
  }, []);

  const handleFulfill = async (orderId: string, itemId: string) => {
    setFulfilling(itemId);
    const res = await fetch(`/api/admin/backorders/${orderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, action: "fulfill" }),
    });
    const d = await res.json();
    if (d.success) {
      toast.success(`${d.data.fulfilled} adet karşılandı`);
      fetchBackorders();
    } else {
      toast.error(d.error || "Hata");
    }
    setFulfilling(null);
  };

  const totalBackorderQty = backorders.reduce((s, o) =>
    s + o.items.reduce((s2, i) => s2 + i.backorderQty, 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ön Sipariş Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">
            {backorders.length} siparişte toplam {totalBackorderQty} adet ön sipariş bekliyor
          </p>
        </div>
        <button
          onClick={fetchBackorders}
          className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw size={14} /> Yenile
        </button>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : backorders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-green-200 bg-green-50 p-8 text-center"
        >
          <CheckCircle size={48} className="mx-auto mb-3 text-green-500" />
          <h2 className="text-lg font-semibold text-green-800">Bekleyen ön sipariş yok</h2>
          <p className="text-sm text-green-600 mt-1">Tüm siparişler karşılanmış durumda.</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {backorders.map(order => (
            <motion.div
              key={order.orderId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-amber-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 bg-amber-50 border-b border-amber-200">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={16} className="text-amber-600" />
                  <span className="font-semibold text-sm text-amber-800">
                    #{order.orderNo}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString("tr-TR", {
                      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {order.dealer ? order.dealer.name : order.user?.name}
                  </span>
                  <span className="text-xs font-medium text-gray-700">
                    {order.total.toFixed(2)} ₺
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {order.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {item.productImage && item.productImage !== "/placeholder.svg" ? (
                          <img src={item.productImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package size={18} className="text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                        <p className="text-xs text-gray-500">SKU: {item.productSku}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right text-xs">
                        <div className="text-gray-500">Sipariş: <span className="font-medium text-gray-700">{item.ordered}</span></div>
                        <div className="text-gray-500">Stok: <span className="font-medium text-gray-700">{item.inStock}</span></div>
                        <div className="text-amber-600 font-semibold">Bekleyen: {item.backorderQty}</div>
                      </div>

                      {item.eta && (
                        <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                          <Clock size={12} /> {item.eta}
                        </div>
                      )}

                      <button
                        onClick={() => handleFulfill(order.orderId, item.id)}
                        disabled={fulfilling === item.id}
                        className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shrink-0"
                      >
                        {fulfilling === item.id ? "..." : "Karşıla"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
