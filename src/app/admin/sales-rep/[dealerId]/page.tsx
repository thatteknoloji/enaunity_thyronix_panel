"use client";

import { useEffect, useState, use } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Store, ShoppingCart, ArrowLeft, Package, DollarSign, Calendar } from "lucide-react";

interface DealerDetail {
  id: string;
  name: string;
  company: string;
  group: string;
  city: string;
  email: string;
  phone: string;
  taxOffice: string;
  taxNumber: string;
  _count: { orders: number };
  latestOrders: Array<{
    id: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
}

const statusColors: Record<string, string> = {
  pending_approval: "bg-amber-100 text-amber-700",
  pending: "bg-gray-100 text-gray-600",
  approved: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-ena-primary/10 text-ena-primary",
};

export default function DealerDetailPage({ params }: { params: Promise<{ dealerId: string }> }) {
  const { dealerId } = use(params);
  const [dealer, setDealer] = useState<DealerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/sales-rep/${dealerId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setDealer(d.data); })
      .finally(() => setLoading(false));
  }, [dealerId]);

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-gray-100"/><div className="h-64 rounded bg-gray-100"/></div>;

  if (!dealer) return <div className="text-center py-16 text-gray-400">Bayi bulunamadı</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/sales-rep"><Button variant="outline" size="sm" className="border-gray-200 text-gray-500"><ArrowLeft size={15} /> Temsilci Paneli</Button></Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center"><Store size={28} className="text-gray-400" /></div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{dealer.name}</h2>
              <p className="text-sm text-gray-500">{dealer.company} · {dealer.city}</p>
              <div className="flex gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">{dealer.email}</span>
                {dealer.phone && <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">{dealer.phone}</span>}
              </div>
              {dealer.taxOffice && <p className="text-xs text-gray-400 mt-2">{dealer.taxOffice} {dealer.taxNumber}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/admin/dealers/${dealer.id}`}><Button variant="outline" size="sm" className="border-gray-200 text-gray-500 gap-1"><DollarSign size={14} /> Detay</Button></Link>
            <Link href={`/admin/orders?dealerId=${dealer.id}`}><Button variant="outline" size="sm" className="border-gray-200 text-gray-500 gap-1"><ShoppingCart size={14} /> Siparişler</Button></Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Toplam Sipariş</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{dealer._count.orders}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Bayi Grubu</p>
          <p className="text-lg font-bold text-gray-900 mt-1 capitalize">{dealer.group}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Şehir</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{dealer.city || "—"}</p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Calendar size={15} /> Son Siparişler</h3>
        <div className="space-y-2">
          {dealer.latestOrders.map(order => (
            <div key={order.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-center gap-3">
                <Package size={16} className="text-gray-400" />
                <div>
                  <p className="text-sm font-mono text-gray-700">#{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString("tr-TR")}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900">{order.total.toLocaleString("tr-TR")} TL</span>
                <span className={`text-[10px] px-2 py-0.5 rounded block mt-1 ${statusColors[order.status] || "bg-gray-100 text-gray-500"}`}>
                  {order.status}
                </span>
              </div>
            </div>
          ))}
          {dealer.latestOrders.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Henüz sipariş yok</p>}
        </div>
      </div>
    </div>
  );
}
