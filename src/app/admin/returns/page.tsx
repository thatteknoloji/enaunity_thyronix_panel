"use client";

import { useEffect, useState } from "react";
import { formatPrice, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw, CheckCircle, XCircle, Package, Store } from "lucide-react";
import toast from "react-hot-toast";

interface ReturnReq {
  id: string; reason: string; status: string; adminNote: string; createdAt: string;
  dealer: { id: string; company: string; name: string };
  order?: { id: string; total: number } | null;
  items: Array<{ id: string; productId: string; quantity: number; price: number; product: { name: string } }>;
}

const statusVariant: Record<string, "default" | "success" | "danger" | "warning"> = {
  pending: "warning", approved: "success", rejected: "danger",
};
const statusText: Record<string, string> = {
  pending: "Onay Bekliyor", approved: "Onaylandı", rejected: "Reddedildi",
};

export default function AdminReturnsPage() {
  const [requests, setRequests] = useState<ReturnReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminNote, setAdminNote] = useState<Record<string, string>>({});

  const fetchData = () => {
    fetch("/api/admin/returns")
      .then((r) => r.json()).then((d) => setRequests(d.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleAction = async (id: string, status: string) => {
    const res = await fetch("/api/admin/returns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, adminNote: adminNote[id] || "" }),
    });
    if (res.ok) {
      toast.success(status === "approved" ? "İade onaylandı" : "İade reddedildi");
      fetchData();
    } else {
      toast.error("İşlem başarısız");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">İade Talepleri</h1>
        <p className="text-sm text-gray-500 mt-1">Toplam {requests.length} talep</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Yükleniyor...</p>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white">
          <RotateCcw size={40} className="mx-auto text-gray-300" />
          <p className="mt-3 text-gray-500">Bekleyen iade talebi yok</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={statusVariant[req.status] || "default"}>{statusText[req.status] || req.status}</Badge>
                      <span className="text-xs text-gray-400">{formatDate(req.createdAt)}</span>
                    </div>
                    <p className="text-sm text-purple-600 flex items-center gap-1 truncate">
                      <Store size={12} /> {req.dealer.company} — {req.dealer.name}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">{req.reason || "Sebep belirtilmedi"}</p>
                  </div>
                  <div className="text-right text-sm shrink-0">
                    <p className="font-bold text-gray-900">
                      {formatPrice(req.items.reduce((s, i) => s + i.price * i.quantity, 0))}
                    </p>
                    <span className="text-xs text-gray-400">{req.items.length} ürün</span>
                  </div>
                </div>

                <div className="space-y-1 mb-3">
                  {req.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <Package size={12} />
                        <span>{item.product.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span>x{item.quantity}</span>
                        <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {req.status === "pending" && (
                  <div className="flex items-end gap-2">
                    <input
                      placeholder="Admin notu (opsiyonel)"
                      value={adminNote[req.id] || ""}
                      onChange={(e) => setAdminNote({ ...adminNote, [req.id]: e.target.value })}
                      className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-900"
                    />
                    <button onClick={() => handleAction(req.id, "approved")}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                      <CheckCircle size={14} /> Onayla
                    </button>
                    <button onClick={() => handleAction(req.id, "rejected")}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-ena-primary/5 text-ena-primary border border-red-200 hover:bg-ena-primary/10">
                      <XCircle size={14} /> Reddet
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
