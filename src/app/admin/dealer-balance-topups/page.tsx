"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPrice, formatDate } from "@/lib/utils";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

type TopUpItem = {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  dealer: { name: string; company: string; email: string };
};

export default function AdminDealerBalanceTopupsPage() {
  const [items, setItems] = useState<TopUpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dealer-balance-topups?status=PENDING_APPROVAL");
      const d = await res.json();
      if (d.success) setItems(d.data.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id: string) => {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/dealer-balance-topups/${id}/approve`, { method: "POST" });
      const d = await res.json();
      if (d.success) {
        toast.success("Onaylandı");
        load();
      } else toast.error(d.error || "Hata");
    } finally {
      setActing(null);
    }
  };

  const reject = async (id: string) => {
    const note = window.prompt("Red sebebi:");
    if (!note) return;
    setActing(id);
    try {
      const res = await fetch(`/api/admin/dealer-balance-topups/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success("Reddedildi");
        load();
      } else toast.error(d.error || "Hata");
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bakiye Yükleme Onayları</h1>
        <p className="text-sm text-gray-500">Havale/EFT ile bekleyen bakiye talepleri</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="animate-spin" size={18} /> Yükleniyor...
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">Bekleyen talep yok.</p>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3">Bayi</th>
                <th className="px-4 py-3">Tutar</th>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.dealer.company || item.dealer.name}</div>
                    <div className="text-xs text-gray-500">{item.dealer.email}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{formatPrice(item.amount)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(item.createdAt)}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={acting === item.id}
                      onClick={() => approve(item.id)}
                    >
                      <Check size={14} className="mr-1" /> Onayla
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={acting === item.id}
                      onClick={() => reject(item.id)}
                    >
                      <X size={14} className="mr-1" /> Reddet
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
