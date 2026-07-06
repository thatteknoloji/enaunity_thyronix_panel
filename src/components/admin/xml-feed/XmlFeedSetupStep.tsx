"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, ChevronRight, Loader2 } from "lucide-react";
import type { XmlFeedTestState } from "./types";
import { FEED_TEMPLATES } from "./types";

type Props = {
  name: string;
  feedUrl: string;
  rootCategory: string;
  templateId: string;
  syncIntervalHours: number;
  loading: boolean;
  testResult: XmlFeedTestState | null;
  editingFeedId: string | null;
  onNameChange: (v: string) => void;
  onFeedUrlChange: (v: string) => void;
  onRootCategoryChange: (v: string) => void;
  onTemplateIdChange: (v: string) => void;
  onSyncIntervalChange: (v: number) => void;
  onTest: () => void;
  onNext: () => void;
};

export function XmlFeedSetupStep({
  name,
  feedUrl,
  rootCategory,
  templateId,
  syncIntervalHours,
  loading,
  testResult,
  editingFeedId,
  onNameChange,
  onFeedUrlChange,
  onRootCategoryChange,
  onTemplateIdChange,
  onSyncIntervalChange,
  onTest,
  onNext,
}: Props) {
  const canNext = Boolean(feedUrl.trim() && rootCategory.trim() && testResult && !testResult.error);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">
        {editingFeedId ? "Feed Düzenle" : "Feed Ayarları"}
      </h3>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">Feed Adı</label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">XML Feed URL</label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs"
            value={feedUrl}
            onChange={(e) => onFeedUrlChange(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">
            Ana Kategori (XML Ürünler altında)
          </label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={rootCategory}
            onChange={(e) => onRootCategoryChange(e.target.value)}
            placeholder="Kadın İç Giyim"
          />
          <p className="mt-1 text-[10px] text-gray-400">
            Ürünler &quot;XML Ürünler&quot; menüsü altında bu başlıkla listelenir. Ana sayfada görünmez.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">Şablon</label>
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={templateId}
              onChange={(e) => onTemplateIdChange(e.target.value)}
            >
              {FEED_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-gray-400">
              {FEED_TEMPLATES.find((t) => t.id === templateId)?.desc}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">Sync Aralığı (saat)</label>
            <input
              type="number"
              min={1}
              max={168}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={syncIntervalHours}
              onChange={(e) => onSyncIntervalChange(Number(e.target.value) || 12)}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={onTest} disabled={loading || !feedUrl}>
          {loading ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
          Feed Test Et
        </Button>
        <Button onClick={onNext} disabled={!canNext || loading}>
          Alan Eşleme <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>

      {testResult && (
        <div className={`mt-4 rounded-lg p-3 text-xs ${testResult.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {testResult.error ? (
            <p className="flex items-center gap-1"><AlertCircle size={14} /> {testResult.error}</p>
          ) : (
            <>
              <p className="flex items-center gap-1">
                <CheckCircle size={14} />
                {testResult.productCount} ürün · {testResult.detectedFields.length} alan · {testResult.variantFields.length} varyant alanı
              </p>
              {testResult.categoryValues.length > 0 && (
                <p className="mt-1 text-gray-600">Kategoriler: {testResult.categoryValues.slice(0, 5).join(", ")}</p>
              )}
            </>
          )}
        </div>
      )}

      {!testResult && (
        <p className="mt-3 text-xs text-amber-700">
          Devam etmek için önce Feed Test Et ile XML alanlarını algılatın.
        </p>
      )}
    </div>
  );
}
