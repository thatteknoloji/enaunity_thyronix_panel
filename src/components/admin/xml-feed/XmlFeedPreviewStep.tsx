"use client";

import { Button } from "@/components/ui/button";
import { formatRulesSummary } from "@/lib/products/xml-feed/mapping-fields";
import type { XmlFeedRules } from "@/lib/products/xml-feed/types";
import { resolveProductStockStatus } from "@/lib/products/stock-status";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import type { XmlPreviewState } from "./types";

type Props = {
  preview: XmlPreviewState;
  rules: XmlFeedRules;
  loading: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onNext: () => void;
};

export function XmlFeedPreviewStep({ preview, rules, loading, onBack, onRefresh, onNext }: Props) {
  const okGroups = preview.groups.filter((g) => !(g.errors?.length)).length;
  const errorCount = preview.errors.length + (preview.parseErrors?.length || 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-3"><p className="text-xl font-bold">{preview.totalRows}</p><p className="text-xs text-gray-500">Satır</p></div>
          <div className="rounded-lg bg-blue-50 p-3"><p className="text-xl font-bold text-blue-700">{preview.groupCount}</p><p className="text-xs text-blue-600">Parent</p></div>
          <div className="rounded-lg bg-green-50 p-3"><p className="text-xl font-bold text-green-700">{okGroups}</p><p className="text-xs text-green-600">Hazır</p></div>
          <div className="rounded-lg bg-red-50 p-3"><p className="text-xl font-bold text-red-600">{errorCount}</p><p className="text-xs text-red-500">Sorun</p></div>
        </div>
        <p className="mt-2 text-xs text-gray-500">{formatRulesSummary(rules)}</p>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={onRefresh} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Önizlemeyi Yenile
          </Button>
        </div>
      </div>

      {(preview.parseErrors?.length || 0) > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {preview.parseErrors!.slice(0, 8).map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Model</th>
              <th className="px-3 py-2 text-left">Başlık</th>
              <th className="px-3 py-2 text-left">Marka</th>
              <th className="px-3 py-2 text-left">Kategori</th>
              <th className="px-3 py-2 text-right">Fiyat</th>
              <th className="px-3 py-2 text-right">Varyant</th>
              <th className="px-3 py-2 text-left">Stok</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {preview.groups.map((g) => {
              const rows = (g.rows || []) as Array<{ stock?: number; variantOptions?: Array<{ group: string; value: string }> }>;
              const stockStatus = resolveProductStockStatus({
                productStock: g.stock ?? rows.reduce((sum, r) => sum + (r.stock || 0), 0),
                variants: rows.map((r) => ({
                  stock: r.stock,
                  options: r.variantOptions,
                })),
              });
              return (
              <tr key={g.modelCode}>
                <td className="px-3 py-2 font-mono">{g.modelCode}</td>
                <td className="max-w-[160px] truncate px-3 py-2">{g.name}</td>
                <td className="px-3 py-2">{g.brand || "—"}</td>
                <td className="max-w-[120px] truncate px-3 py-2">{g.category}</td>
                <td className="px-3 py-2 text-right">{g.price != null ? `₺${g.price}` : "—"}</td>
                <td className="px-3 py-2 text-right">{rows.length || g.variantCount || 0}</td>
                <td className="max-w-[180px] px-3 py-2">
                  <p className={`font-medium ${
                    stockStatus.level === "out" ? "text-red-600" :
                    stockStatus.level === "low" ? "text-amber-600" :
                    stockStatus.level === "partial" ? "text-orange-600" : "text-green-700"
                  }`}>
                    {stockStatus.headline}
                  </p>
                  {stockStatus.warnings.slice(0, 2).map((w) => (
                    <p key={w} className="truncate text-[10px] text-amber-700">{w}</p>
                  ))}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}><ChevronLeft size={14} className="mr-1" /> Geri</Button>
        <Button onClick={onNext} disabled={okGroups === 0 || loading}>
          Kategori Eşleme <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}
