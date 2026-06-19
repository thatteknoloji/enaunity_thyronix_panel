"use client";

import { useEffect, useState } from "react";
import { ProductsTabs } from "@/components/admin/ProductsTabs";
import { formatDate } from "@/lib/utils";
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

interface ImportJob {
  id: string;
  type: string;
  status: string;
  fileName: string;
  productCount: number;
  addedCount: number;
  updatedCount: number;
  unchangedCount: number;
  errorMessage: string;
  durationMs: number;
  createdAt: string;
  completedAt: string | null;
}

export default function ImportHistoryPage() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/products/import/jobs")
      .then((r) => r.json())
      .then((d) => setJobs(d.data || []))
      .finally(() => setLoading(false));
  }, []);

  const statusIcon = (status: string) => {
    if (status === "COMPLETED") return <CheckCircle size={16} className="text-green-600" />;
    if (status === "FAILED") return <XCircle size={16} className="text-red-600" />;
    if (status === "RUNNING") return <Loader2 size={16} className="text-blue-600 animate-spin" />;
    return <Clock size={16} className="text-gray-400" />;
  };

  return (
    <div>
      <ProductsTabs />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Import Geçmişi</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-400"><Loader2 size={24} className="animate-spin mx-auto mb-2" /> Yükleniyor...</div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
          Henüz import kaydı yok
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dosya</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Format</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Yeni</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Güncelle</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Süre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">{statusIcon(j.status)}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{j.fileName || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{j.type}</td>
                  <td className="px-4 py-3 text-right text-green-700 font-medium">{j.addedCount}</td>
                  <td className="px-4 py-3 text-right text-blue-700 font-medium">{j.updatedCount}</td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">{j.durationMs ? `${(j.durationMs / 1000).toFixed(1)}s` : "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(j.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
