"use client";

import { useEffect, useState } from "react";
import { Loader2, Package } from "lucide-react";
import { ProductStatusBadge } from "@/components/customer-products/ProductCard";
import type { UnifiedStatus } from "@/lib/customer-products/types";
import { getModuleLabel } from "@/lib/modules/labels";
import { statusLabel } from "@/lib/ui/turkish-labels";

type AdminRow = {
  dealer: { id: string; name: string; company: string; email: string };
  approvalStatus: string;
  ownedProducts: string[];
  licenses: Array<{ id: string; moduleKey: string; planKey: string; status: string; unifiedStatus: UnifiedStatus }>;
  lastPayment: {
    id: string;
    moduleKey: string;
    amount: number;
    status: string;
    paidAt: string | null;
    createdAt: string;
  } | null;
};

export default function AdminCustomerProductsPage() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/customer-products")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRows(d.data || []);
        else setError(d.error || "Veri yüklenemedi");
        setLoading(false);
      })
      .catch(() => {
        setError("Bağlantı hatası");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-ena-primary" size={32} />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Package className="text-ena-primary" size={22} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Müşteri Ürünleri</h1>
        </div>
        <p className="text-sm text-gray-500">Müşteri ürünleri, lisanslar ve son ödemeler</p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                <th className="px-4 py-3 font-medium">Müşteri</th>
                <th className="px-4 py-3 font-medium">Ürünler</th>
                <th className="px-4 py-3 font-medium">Lisanslar</th>
                <th className="px-4 py-3 font-medium">Paketler</th>
                <th className="px-4 py-3 font-medium">Son Ödeme</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">Kayıt yok</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.dealer.id} className="border-b border-gray-50 dark:border-gray-700/50 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{row.dealer.company || row.dealer.name}</div>
                      <div className="text-xs text-gray-500">{row.dealer.email}</div>
                      <div className="text-xs text-gray-400 mt-1">Onay: {statusLabel(row.approvalStatus)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.ownedProducts.length === 0 ? (
                          <span className="text-gray-400 text-xs">—</span>
                        ) : (
                          row.ownedProducts.map((p) => (
                            <span key={p} className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300">
                              {p}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {row.licenses.length === 0 ? (
                          <span className="text-gray-400 text-xs">—</span>
                        ) : (
                          row.licenses.map((l) => (
                            <div key={l.id} className="flex items-center gap-2">
                              <span className="text-xs text-gray-600 dark:text-gray-300">{getModuleLabel(l.moduleKey)}</span>
                              <ProductStatusBadge status={l.unifiedStatus} />
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                      {row.licenses.map((l) => l.planKey).filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                      {row.lastPayment ? (
                        <>
                          <div>{getModuleLabel(row.lastPayment.moduleKey)}</div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {row.lastPayment.amount.toLocaleString("tr-TR")} ₺
                          </div>
                          <div className="text-gray-400">{statusLabel(row.lastPayment.status)}</div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
