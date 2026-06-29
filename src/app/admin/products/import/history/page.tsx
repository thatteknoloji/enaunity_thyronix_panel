"use client";

import { useEffect, useState } from "react";
import { ProductsTabs } from "@/components/admin/ProductsTabs";
import { formatDate } from "@/lib/utils";
import { CheckCircle, XCircle, Clock, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  reportJson?: string;
}

function downloadJobReport(fileName: string, lines: string[]) {
  const blob = new Blob([lines.filter(Boolean).join("\n") || "Rapor boş"], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
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
    if (status === "RUNNING") return <Loader2 size={16} className="animate-spin text-blue-600" />;
    return <Clock size={16} className="text-gray-400" />;
  };

  const extractErrors = (job: ImportJob) => {
    const errors: string[] = [];
    if (job.errorMessage) errors.push(job.errorMessage);
    try {
      const parsed = JSON.parse(job.reportJson || "{}");
      if (Array.isArray(parsed.errors)) {
        errors.push(...parsed.errors);
      }
    } catch { }
    return Array.from(new Set(errors.filter(Boolean)));
  };

  return (
    <div>
      <ProductsTabs />
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Import Geçmişi</h1>

      {loading ? (
        <div className="py-12 text-center text-gray-400"><Loader2 size={24} className="mx-auto mb-2 animate-spin" /> Yükleniyor...</div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
          Henüz import kaydı yok
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Dosya</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Format</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Yeni</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Güncelle</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Sorun</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Süre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Tarih</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Rapor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((j) => {
                const errors = extractErrors(j);
                return (
                  <tr key={j.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">{statusIcon(j.status)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{j.fileName || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{j.type}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">{j.addedCount}</td>
                    <td className="px-4 py-3 text-right font-medium text-blue-700">{j.updatedCount}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-red-600">{errors.length}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">{j.durationMs ? `${(j.durationMs / 1000).toFixed(1)}s` : "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(j.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {errors.length > 0 ? (
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => downloadJobReport(`import-history-${j.id}.txt`, errors)}
                        >
                          <Download size={14} /> İndir
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-400">Temiz</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
