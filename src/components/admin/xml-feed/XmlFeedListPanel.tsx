"use client";

import { Button } from "@/components/ui/button";
import { Pencil, RefreshCw, Trash2 } from "lucide-react";
import type { XmlFeedListItem } from "./types";

type Props = {
  feeds: XmlFeedListItem[];
  loading: boolean;
  onEdit: (feedId: string) => void;
  onSync: (feedId: string) => void;
  onDelete: (feedId: string) => void;
};

export function XmlFeedListPanel({ feeds, loading, onEdit, onSync, onDelete }: Props) {
  if (feeds.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">Kayıtlı Feed&apos;ler</h3>
      <div className="space-y-2">
        {feeds.map((f) => (
          <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 p-3 text-sm">
            <div>
              <p className="font-medium">{f.name}</p>
              <p className="text-xs text-gray-500">
                {f.productCount} ürün · {f.templateId} · {f.lastSyncStatus || "henüz sync yok"} · {f.syncIntervalHours}h
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={loading} onClick={() => onEdit(f.id)}>
                <Pencil size={14} className="mr-1" /> Düzenle
              </Button>
              <Button size="sm" variant="outline" disabled={loading} onClick={() => onSync(f.id)}>
                <RefreshCw size={14} className="mr-1" /> Sync
              </Button>
              <Button size="sm" variant="outline" disabled={loading} onClick={() => onDelete(f.id)}>
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
