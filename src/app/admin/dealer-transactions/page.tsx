"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Search, RefreshCw, Clock, User, TrendingUp, TrendingDown, DollarSign, Filter } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

interface Transaction {
  id: string;
  dealerId: string;
  type: string;
  amount: number;
  debit?: number;
  credit?: number;
  orderId: string | null;
  note: string;
  balanceAfter: number;
  createdAt: string;
  dealer: { name: string; company: string };
  source?: string;
}

export default function DealerTransactionsPage() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const size = 50;

  const load = async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), size: String(size) });
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/admin/dealer-transactions?${params}`);
      const d = await res.json();
      if (d.success) { setItems(d.data.items); setTotal(d.data.total); }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalPages = Math.ceil(total / size);

  const TYPE_LABELS: Record<string, string> = {
    order: "Sipariş",
    order_debit: "Sipariş Kesintisi",
    payment: "Ödeme",
    payment_credit: "Ödeme",
    refund: "İade",
    return_credit: "İade",
    adjustment: "Düzeltme",
    credit: "Kredi",
    invoice: "Fatura",
    ORDER_COST: "Sipariş Maliyeti",
    PAYMENT: "Ödeme",
    REFUND: "İade",
    MANUAL_ADJUSTMENT: "Düzeltme",
    SERVICE_FEE: "Hizmet Bedeli",
    SHIPPING_FEE: "Kargo",
    PACKAGING_FEE: "Paketleme",
    MODULE_PAYMENT: "Modül Ödemesi",
    PRODUCT_PACKAGE_PAYMENT: "Paket Ödemesi",
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div><h1 className="text-3xl font-bold text-gray-900">Cari Hareketleri</h1><p className="mt-1 text-sm text-gray-500">DealerAccount kaynaklı bakiye işlem kayıtları</p></div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <select
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            >
              <option value="">Tüm İşlemler</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <button onClick={() => load()} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700">
            <RefreshCw size={12} /> Yenile
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Henüz işlem kaydı yok</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tarih</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bayi</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tür</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Tutar</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Bakiye Sonrası</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Not</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((t) => {
                  const isIncome = t.credit ? t.credit > 0 : ["payment", "credit", "payment_credit", "return_credit", "PAYMENT", "REFUND", "MODULE_PAYMENT", "PRODUCT_PACKAGE_PAYMENT"].includes(t.type);
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleString("tr-TR")}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-700">{t.dealer.name}</p>
                        <p className="text-[10px] text-gray-400">{t.dealer.company}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                          isIncome ? "bg-emerald-50 text-emerald-700" : "bg-ena-primary/5 text-ena-primary"
                        }`}>
                          {isIncome ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {TYPE_LABELS[t.type] || t.type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-bold text-sm ${isIncome ? "text-emerald-600" : "text-ena-primary"}`}>
                        {isIncome ? "+" : "-"}{formatPrice(t.amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-mono text-gray-600">
                        {formatPrice(t.balanceAfter)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                        {t.note || "—"}
                        {t.orderId && <span className="text-[10px] text-blue-500 block">Sipariş: {t.orderId}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">Toplam {total} kayıt</span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => { setPage(page - 1); load(page - 1); }}
                className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">Geri</button>
              <button disabled={page >= totalPages} onClick={() => { setPage(page + 1); load(page + 1); }}
                className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">İleri</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
