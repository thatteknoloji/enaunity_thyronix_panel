"use client";

import { useEffect, useState, useCallback } from "react";
import { formatPrice, formatDate } from "@/lib/utils";
import { FileText, Store } from "lucide-react";

interface QuoteItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: { name: string; image: string };
}

interface Quote {
  id: string;
  status: string;
  note: string;
  adminNote: string;
  total: number;
  items: QuoteItem[];
  createdAt: string;
  dealer: { id: string; company: string; name: string; email: string };
}

const statusColors: Record<string, string> = {
  pending: "text-amber-700 bg-amber-50 border-amber-200",
  approved: "text-green-700 bg-green-50 border-green-200",
  rejected: "text-ena-primary bg-ena-primary/5 border-red-200",
  countered: "text-blue-700 bg-blue-50 border-blue-200",
};

const statusLabels: Record<string, string> = {
  pending: "Beklemede",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  countered: "Karşı Teklif",
};

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/admin/quotes");
    setQuotes((await res.json()).data || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/admin/quotes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, adminNote }),
    });
    setAdminNote("");
    setExpandedId(null);
    fetchData();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Fiyat Teklifleri</h1>

      <div className="space-y-4">
        {quotes.map((q) => (
          <div key={q.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Store size={16} className="text-purple-500" />
                <div>
                  <p className="font-semibold text-gray-900">{q.dealer.company}</p>
                  <p className="text-xs text-gray-500">{q.dealer.name} — {q.dealer.email}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColors[q.status]}`}>{statusLabels[q.status]}</span>
                <p className="text-lg font-bold text-gray-900 mt-1">{formatPrice(q.total)}</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 font-mono mb-2">#{q.id.slice(0, 8)} — {formatDate(q.createdAt)}</p>

            <div className="space-y-1 mb-3">
              {q.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{item.product.name} x{item.quantity}</span>
                  <span className="font-medium text-gray-900">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {q.note && <p className="text-xs text-gray-500 mb-1"><b>Müşteri:</b> {q.note}</p>}

            {expandedId === q.id ? (
              <div className="space-y-2 mt-3 border-t border-gray-100 pt-3">
                <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Admin notu..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" rows={2} />
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => updateStatus(q.id, "approved")} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-colors">Onayla</button>
                  <button onClick={() => updateStatus(q.id, "rejected")} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:brightness-90 transition-colors">Reddet</button>
                  <button onClick={() => updateStatus(q.id, "countered")} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors">Karşı Teklif</button>
                  <button onClick={() => { setExpandedId(null); setAdminNote(""); }} className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50 transition-colors">İptal</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setExpandedId(q.id)} className="text-xs text-purple-600 hover:text-purple-700 mt-2">İşlem Yap</button>
            )}
          </div>
        ))}
        {quotes.length === 0 && (
          <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl">
            <FileText size={40} className="mx-auto mb-2 text-gray-300" />
            <p>Henüz teklif yok</p>
          </div>
        )}
      </div>
    </div>
  );
}
