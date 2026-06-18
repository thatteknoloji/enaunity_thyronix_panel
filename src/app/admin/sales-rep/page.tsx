"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Store, ShoppingCart, TrendingUp, Eye, BarChart3 } from "lucide-react";

interface DealerWithStats {
  id: string;
  name: string;
  company: string;
  group: string;
  city: string;
  _count: { orders: number };
}

export default function SalesRepPage() {
  const [dealers, setDealers] = useState<DealerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.data?.role === "admin") {
        setUserName(d.data.name || "Temsilci");
      }
    });
    fetch("/api/admin/sales-rep").then(r => r.json()).then(d => {
      if (d.success) setDealers(d.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-gray-100"/><div className="grid grid-cols-3 gap-4"><div className="h-32 rounded-xl bg-gray-100"/><div className="h-32 rounded-xl bg-gray-100"/></div></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Satış Temsilcisi Paneli</h1>
        <p className="text-sm text-gray-500 mt-0.5">Hoş geldin, {userName} — bağlı olduğun bayiler</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Store size={20} className="text-blue-600" /></div>
            <div><p className="text-xs text-gray-500">Bağlı Bayi</p><p className="text-xl font-bold text-gray-900">{dealers.length}</p></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"><ShoppingCart size={20} className="text-emerald-600" /></div>
            <div><p className="text-xs text-gray-500">Toplam Sipariş</p><p className="text-xl font-bold text-gray-900">{dealers.reduce((s, d) => s + d._count.orders, 0)}</p></div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><TrendingUp size={20} className="text-purple-600" /></div>
            <div><p className="text-xs text-gray-500">Ort. Sipariş/Bayi</p><p className="text-xl font-bold text-gray-900">{dealers.length ? (dealers.reduce((s, d) => s + d._count.orders, 0) / dealers.length).toFixed(1) : "0"}</p></div>
          </div>
        </div>
      </div>

      {dealers.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white">
          <Store size={48} className="mx-auto text-gray-200" />
          <p className="mt-3 text-gray-500">Size atanmış bayi bulunmuyor</p>
          <p className="text-xs text-gray-400 mt-1">Admin paneline gidin, bayi atamaları yapın</p>
          <Link href="/admin/dealer-assignments">
            <Button variant="outline" className="mt-4 border-gray-200 text-gray-500">Atamaları Yönet</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {dealers.map(dealer => (
            <div key={dealer.id} className="rounded-xl border border-gray-200 bg-white p-5 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Store size={18} className="text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{dealer.name}</h3>
                    <p className="text-xs text-gray-500">
                      {dealer.company}{dealer.city ? ` · ${dealer.city}` : ""}
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-gray-500">{dealer.group}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Sipariş</p>
                    <p className="text-sm font-semibold text-gray-900">{dealer._count.orders}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/dealers/${dealer.id}`}>
                      <Button variant="outline" size="sm" className="border-gray-200 text-gray-500 gap-1">
                        <Eye size={14} /> İncele
                      </Button>
                    </Link>
                    <Link href={`/admin/orders?dealerId=${dealer.id}`}>
                      <Button variant="outline" size="sm" className="border-gray-200 text-gray-500 gap-1">
                        <BarChart3 size={14} /> Siparişler
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
