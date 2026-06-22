"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Eye, Loader2, Shield, X } from "lucide-react";

type GateItem = {
  id: string;
  draftId: string;
  blueprintId: string;
  projectId: string | null;
  status: string;
  score: number;
  blockersJson: string;
  warningsJson: string;
  draft: { title: string; publishScore: number; status: string; createdAt: string };
};

type Stats = {
  totalDrafts: number;
  gatePassed: number;
  gateWarning: number;
  gateBlocked: number;
  gateNeedsReview: number;
  readyToPublish: number;
  rejected: number;
  needsReview: number;
  withoutGate: number;
};

export function PublishGateReviewTab({ projectId }: { projectId?: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [items, setItems] = useState<GateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const q = projectId ? `?projectId=${projectId}&stats=true` : "?stats=true";
    const statsR = await fetch(`/api/page-factory/publish-gate/queue${q}`);
    const statsD = await statsR.json();
    if (statsD.success) setStats(statsD.data);

    const listQ = projectId ? `?projectId=${projectId}&limit=50` : "?limit=50";
    const listR = await fetch(`/api/page-factory/publish-gate/queue${listQ}`);
    const listD = await listR.json();
    if (listD.success) setItems(listD.data.items || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (gateId: string, action: "approve" | "reject" | "needs_review") => {
    setActionLoading(gateId);
    try {
      const r = await fetch(`/api/page-factory/publish-gate/${gateId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Review başarısız");
    } finally {
      setActionLoading(null);
    }
  };

  const runGate = async (draftId: string) => {
    setActionLoading(draftId);
    try {
      await fetch(`/api/page-factory/drafts/${draftId}/publish-gate/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  const previewGate = async (draftId: string) => {
    const r = await fetch(`/api/page-factory/drafts/${draftId}/publish-gate/preview`, { method: "POST" });
    const d = await r.json();
    if (d.success) setPreview(d.data);
  };

  if (loading) return <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Yükleniyor…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield size={18} className="text-emerald-600" />
        <h2 className="text-sm font-semibold text-gray-900">Publish Gate — Review Queue</h2>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 text-xs">
          {[
            ["Draft", stats.totalDrafts],
            ["Passed", stats.gatePassed],
            ["Warning", stats.gateWarning],
            ["Blocked", stats.gateBlocked],
            ["Ready", stats.readyToPublish],
            ["Review", stats.needsReview],
            ["Rejected", stats.rejected],
            ["Gate yok", stats.withoutGate],
          ].map(([label, val]) => (
            <div key={String(label)} className="rounded-lg border border-gray-200 bg-white p-2">
              <p className="text-gray-500">{label}</p>
              <p className="font-bold text-gray-900">{val}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
          {items.length === 0 && <p className="p-4 text-xs text-gray-500">Kuyruk boş — önce draft oluşturup gate çalıştırın.</p>}
          {items.map((g) => {
            const blockers = JSON.parse(g.blockersJson || "[]").length;
            const warnings = JSON.parse(g.warningsJson || "[]").length;
            return (
              <div key={g.id} className="px-4 py-3 text-xs space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{g.draft.title}</p>
                    <p className="text-gray-500">
                      Gate: <span className="font-medium">{g.status}</span> · Score {g.score} · Publish {g.draft.publishScore}
                      · Blockers {blockers} · Warnings {warnings}
                    </p>
                  </div>
                  {g.draft.status === "READY_TO_PUBLISH" && (
                    <span className="shrink-0 rounded bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-medium">Ready</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  <button type="button" disabled={!!actionLoading} onClick={() => runGate(g.draftId)} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 hover:bg-gray-200 disabled:opacity-50">
                    {actionLoading === g.draftId ? <Loader2 size={10} className="animate-spin" /> : null} Gate çalıştır
                  </button>
                  <button type="button" onClick={() => previewGate(g.draftId)} className="inline-flex items-center gap-1 rounded bg-blue-50 text-blue-700 px-2 py-0.5 hover:bg-blue-100">
                    <Eye size={10} /> Önizle
                  </button>
                  <button type="button" disabled={!!actionLoading} onClick={() => review(g.id, "approve")} className="inline-flex items-center gap-1 rounded bg-emerald-600 text-white px-2 py-0.5 hover:bg-emerald-500 disabled:opacity-50">
                    <Check size={10} /> Onayla
                  </button>
                  <button type="button" disabled={!!actionLoading} onClick={() => review(g.id, "reject")} className="inline-flex items-center gap-1 rounded bg-red-100 text-red-700 px-2 py-0.5 hover:bg-red-200 disabled:opacity-50">
                    <X size={10} /> Reddet
                  </button>
                  <button type="button" disabled={!!actionLoading} onClick={() => review(g.id, "needs_review")} className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-800 px-2 py-0.5 hover:bg-amber-200 disabled:opacity-50">
                    İncelemeye al
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {preview && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-4 text-xs space-y-2">
          <p className="font-semibold text-emerald-800">Gate Önizleme — {preview.status} (score {preview.score})</p>
          {preview.blockers?.length > 0 && (
            <div>
              <p className="font-medium text-red-700">Blockers</p>
              {preview.blockers.map((b: any, i: number) => <p key={i} className="text-red-600">{b.label}: {b.message}</p>)}
            </div>
          )}
          {preview.warnings?.length > 0 && (
            <div>
              <p className="font-medium text-amber-700">Warnings</p>
              {preview.warnings.map((w: any, i: number) => <p key={i} className="text-amber-600">{w.label}: {w.message}</p>)}
            </div>
          )}
          {preview.suggestions?.length > 0 && (
            <div>
              <p className="font-medium text-gray-700">Suggestions</p>
              {preview.suggestions.map((s: string, i: number) => <p key={i} className="text-gray-600">{s}</p>)}
            </div>
          )}
          <button type="button" onClick={() => setPreview(null)} className="text-gray-500 hover:text-gray-700">Kapat</button>
        </div>
      )}
    </div>
  );
}
