"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";

type Props = {
  categoryValues: string[];
  categoryMapping: Record<string, string>;
  storeCategories: string[];
  loading: boolean;
  editingFeedId: string | null;
  onCategoryMappingChange: (m: Record<string, string>) => void;
  onBack: () => void;
  onSave: () => void;
};

export function XmlFeedCategoryStep({
  categoryValues,
  categoryMapping,
  storeCategories,
  loading,
  editingFeedId,
  onCategoryMappingChange,
  onBack,
  onSave,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">Kategori Eşleme</h3>
        <p className="mb-4 text-xs text-gray-500">XML alt kategori → mağaza kategorisi</p>
        {categoryValues.length === 0 ? (
          <p className="text-sm text-gray-400">Kategori sütunu boş — kök kategori kullanılacak</p>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {categoryValues.map((src) => (
              <div key={src} className="flex items-center gap-3">
                <span className="w-40 truncate text-sm text-gray-600" title={src}>{src}</span>
                <span className="text-gray-300">→</span>
                <select
                  className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-sm"
                  value={categoryMapping[src] || src}
                  onChange={(e) => onCategoryMappingChange({ ...categoryMapping, [src]: e.target.value })}
                >
                  <option value={src}>{src} (olduğu gibi)</option>
                  {storeCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}><ChevronLeft size={14} className="mr-1" /> Geri</Button>
        <Button onClick={onSave} disabled={loading}>
          {loading ? (
            <><Loader2 size={14} className="mr-1 animate-spin" /> Kaydediliyor...</>
          ) : editingFeedId ? (
            "Güncelle ve Sync"
          ) : (
            "Feed Kaydet ve İlk Sync"
          )}
        </Button>
      </div>
    </div>
  );
}
