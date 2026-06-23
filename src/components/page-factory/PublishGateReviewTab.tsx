"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Eye, Loader2, Shield, Upload, X } from "lucide-react";

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

type DraftWithoutGate = {
  id: string;
  title: string;
  publishScore: number;
  status: string;
  blueprintId: string;
  blueprint: { title: string };
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
  const [withoutGate, setWithoutGate] = useState<DraftWithoutGate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);

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

    const wgQ = projectId ? `?projectId=${projectId}&withoutGate=true&limit=30` : "?withoutGate=true&limit=30";
    const wgR = await fetch(`/api/page-factory/publish-gate/queue${wgQ}`);
    const wgD = await wgR.json();
    if (wgD.success) setWithoutGate(wgD.data.items || []);

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
    setMessage(null);
    try {
      const r = await fetch(`/api/page-factory/drafts/${draftId}/publish-gate/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Gate başarısız");
      setMessage("Publish Gate oluşturuldu/güncellendi");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gate başarısız");
    } finally {
      setActionLoading(null);
    }
  };

  const publishInternal = async (draftId: string) => {
    setActionLoading(`pub-${draftId}`);
    setMessage(null);
    try {
      const r = await fetch(`/api/page-factory/drafts/${draftId}/publish/internal`, { method: "POST" });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Yayın başarısız");
      setMessage(`İç yayına alındı: ${d.data.path}`);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Yayın başarısız");
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

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</div>
      )}

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

      {withoutGate.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 overflow-hidden">
          <p className="px-4 py-2 text-xs font-semibold text-amber-900 border-b border-amber-100">
            Gate olmayan draftlar ({withoutGate.length})
          </p>
          <div className="divide-y divide-amber-100 max-h-48 overflow-y-auto">
            {withoutGate.map((d) => (
              <div key={d.id} className="px-4 py-2 flex items-center justify-between gap-2 text-xs">
                <div>
                  <p className="font-medium text-gray-900">{d.title}</p>
                  <p className="text-gray-500">Score {d.publishScore} · {d.status}</p>
                </div>
                <button
                  type="button"
                  disabled={!!actionLoading}
                  onClick={() => runGate(d.id)}
                  className="shrink-0 rounded bg-amber-600 text-white px-2 py-1 hover:bg-amber-500 disabled:opacity-50"
                >
                  Gate oluştur
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
          {items.length === 0 && <p className="p-4 text-xs text-gray-500">Kuyruk boş — pipeline çalıştırın veya gate oluşturun.</p>}
          {items.map((g) => {
            const blockerList: Array<{ label?: string; message?: string }> = JSON.parse(g.blockersJson || "[]");
            const warningList: Array<{ label?: string; message?: string }> = JSON.parse(g.warningsJson || "[]");
            const canPublish =
              g.draft.status === "READY_TO_PUBLISH" &&
              (g.status === "PASSED" || g.status === "WARNING");
            return (
              <div key={g.id} className="px-4 py-3 text-xs space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{g.draft.title}</p>
                    <p className="text-gray-500">
                      Gate: <span className="font-medium">{g.status}</span> · Score {g.score} · Publish {g.draft.publishScore}
                      · Blockers {blockerList.length} · Warnings {warningList.length}
                    </p>
                    {g.status === "BLOCKED" && blockerList.length > 0 && (
                      <div className="mt-1 text-red-700">
                        {blockerList.map((b, i) => (
                          <p key={i}>⛔ {b.label || "Blocker"}: {b.message || JSON.stringify(b)}</p>
                        ))}
                      </div>
                    )}
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
                  {canPublish && (
                    <button
                      type="button"
                      disabled={!!actionLoading}
                      onClick={() => publishInternal(g.draftId)}
                      className="inline-flex items-center gap-1 rounded bg-emerald-600 text-white px-2 py-0.5 hover:bg-emerald-500 disabled:opacity-50"
                    >
                      <Upload size={10} /> İç Yayına Al
                    </button>
                  )}
                  <button type="button" disabled={!!actionLoading} onClick={() => review(g.id, "approve")} className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 hover:bg-emerald-200 disabled:opacity-50">
                    <Check size={10} /> Onayla
                  </button>
                  <button type="button" disabled={!!actionLoading} onClick={() => review(g.id, "reject")} className="inline-flex items-center gap-1 rounded bg-red-100 text-red-700 px-2 py-0.5 hover:bg-red-200 disabled:opacity-50">
                    <X size={10} /> Reddet
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
          <button type="button" onClick={() => setPreview(null)} className="text-gray-500 hover:text-gray-700">Kapat</button>
        </div>
      )}
    </div>
  );
}
