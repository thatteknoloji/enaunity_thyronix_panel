"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle, RefreshCw } from "lucide-react";
import type { XmlSyncReport } from "./types";

type Props = {
  syncReport: XmlSyncReport;
  savedFeedId: string | null;
  loading: boolean;
  onNewFeed: () => void;
  onManualSync: (feedId: string) => void;
};

export function XmlFeedDoneStep({ syncReport, savedFeedId, loading, onNewFeed, onManualSync }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
        <CheckCircle size={32} className="mb-3 text-green-600" />
        <h3 className="text-lg font-bold">XML Feed {syncReport.status === "SUCCESS" ? "Aktif" : "Tamamlandı"}</h3>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-white p-3 text-center"><p className="text-2xl font-bold text-green-600">{syncReport.added}</p><p className="text-xs">Yeni</p></div>
          <div className="rounded-lg bg-white p-3 text-center"><p className="text-2xl font-bold text-blue-600">{syncReport.updated}</p><p className="text-xs">Güncellenen</p></div>
          <div className="rounded-lg bg-white p-3 text-center"><p className="text-2xl font-bold text-amber-600">{syncReport.skipped}</p><p className="text-xs">Atlanan</p></div>
        </div>
        {syncReport.errors.length > 0 && (
          <div className="mt-4 max-h-32 overflow-y-auto text-xs text-red-600">
            {syncReport.errors.slice(0, 15).map((e, i) => <p key={i}>{e}</p>)}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onNewFeed}>Yeni Feed</Button>
        {savedFeedId && (
          <Button variant="outline" disabled={loading} onClick={() => onManualSync(savedFeedId)}>
            <RefreshCw size={14} className="mr-1" /> Tekrar Sync
          </Button>
        )}
      </div>
    </div>
  );
}
