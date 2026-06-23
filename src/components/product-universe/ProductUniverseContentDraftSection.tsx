"use client";

import { useState } from "react";
import { Eye, FileText, Loader2, Save, Shield } from "lucide-react";
import { ContentDraftPreviewModal } from "@/components/page-factory/ContentDraftPreviewModal";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";

type Props = {
  blueprintId: string;
  blueprintTitle: string;
  draftId?: string | null;
  initialPublishScore?: number | null;
  draftStatus?: string | null;
  gateStatus?: string | null;
  gateScore?: number | null;
  hasDraft?: boolean;
};

export function ProductUniverseContentDraftSection({
  blueprintId,
  blueprintTitle,
  draftId,
  initialPublishScore,
  draftStatus,
  gateStatus,
  gateScore,
  hasDraft,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gateLoading, setGateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [resolvedDraftId, setResolvedDraftId] = useState(draftId);
  const [publishScore, setPublishScore] = useState(initialPublishScore ?? null);
  const [status, setStatus] = useState(draftStatus);
  const [gate, setGate] = useState<{ status: string; score: number } | null>(
    gateStatus ? { status: gateStatus, score: gateScore ?? 0 } : null
  );

  const resolveDraftId = async (): Promise<string | null> => {
    if (resolvedDraftId) return resolvedDraftId;
    const d = await fetchPageFactoryJson<{ id: string }>(`/api/page-factory/blueprints/${blueprintId}/draft`);
    if (d.success && d.data?.id) {
      setResolvedDraftId(d.data.id);
      return d.data.id;
    }
    return null;
  };

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const id = await resolveDraftId();
      let payload: any;
      if (id) {
        const d = await fetchPageFactoryJson(`/api/page-factory/blueprints/${blueprintId}/draft/preview`, { method: "POST" });
        if (!d.success) throw new Error(d.error);
        payload = (d.data as { payload?: unknown }).payload || d.data;
        const gateD = await fetchPageFactoryJson(`/api/page-factory/drafts/${id}/publish-gate/preview`, { method: "POST" });
        if (gateD.success) payload = { ...payload, gate: gateD.data };
      } else {
        const d = await fetchPageFactoryJson(`/api/page-factory/blueprints/${blueprintId}/draft/preview`, { method: "POST" });
        if (!d.success) throw new Error(d.error);
        payload = (d.data as { payload?: unknown }).payload || d.data;
      }
      setPreviewData(payload);
      setPreviewOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Önizleme başarısız");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setSaving(true);
    setError(null);
    try {
      const d = await fetchPageFactoryJson(`/api/page-factory/blueprints/${blueprintId}/draft/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });
      if (!d.success) throw new Error(d.error || "Draft oluşturulamadı");
      const gen = d.data as { payload: { quality: { publishScore: number }; status: string }; draftId: string };
      setPublishScore(gen.payload.quality.publishScore);
      setStatus(gen.payload.status);
      setResolvedDraftId(gen.draftId);
      setPreviewData(gen.payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft oluşturulamadı");
    } finally {
      setSaving(false);
    }
  };

  const handleRunGate = async () => {
    setGateLoading(true);
    setError(null);
    try {
      const id = await resolveDraftId();
      if (!id) throw new Error("Önce draft oluşturun");
      const d = await fetchPageFactoryJson(`/api/page-factory/drafts/${id}/publish-gate/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });
      if (!d.success) throw new Error(d.error);
      const gateData = d.data as { status: string; score: number };
      setGate({ status: gateData.status, score: gateData.score });
      if (gateData.status === "PASSED" && gateData.score >= 80) setStatus("READY_TO_PUBLISH");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gate başarısız");
    } finally {
      setGateLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-lg border border-violet-100 bg-violet-50/40 p-3 space-y-2 mt-2">
        <div className="flex items-center gap-2 flex-wrap">
          <FileText size={12} className="text-violet-600" />
          <span className="text-[10px] font-semibold text-violet-800">Content Draft V3</span>
          {publishScore != null && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              publishScore >= 80 ? "bg-emerald-100 text-emerald-700" : publishScore >= 50 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
            }`}>
              Publish {publishScore}
            </span>
          )}
          {status && <span className="text-[10px] text-violet-600">{status}</span>}
          {gate && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              gate.status === "PASSED" ? "bg-emerald-100 text-emerald-700" : gate.status === "BLOCKED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
            }`}>
              Gate {gate.status} ({gate.score})
            </span>
          )}
          {status === "READY_TO_PUBLISH" && (
            <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-medium">Ready to publish</span>
          )}
        </div>

        {error && <p className="text-[10px] text-red-600">{error}</p>}

        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={handlePreview} disabled={loading} className="inline-flex items-center gap-1 rounded bg-violet-100 text-violet-800 px-2 py-1 text-[10px] font-medium hover:bg-violet-200 disabled:opacity-50">
            {loading ? <Loader2 size={10} className="animate-spin" /> : <Eye size={10} />} Draft Önizle
          </button>
          <button type="button" onClick={handleGenerate} disabled={saving} className="inline-flex items-center gap-1 rounded bg-violet-600 text-white px-2 py-1 text-[10px] font-medium hover:bg-violet-500 disabled:opacity-50">
            {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Draft Oluştur
          </button>
          {(hasDraft || resolvedDraftId) && (
            <button type="button" onClick={handleRunGate} disabled={gateLoading} className="inline-flex items-center gap-1 rounded bg-emerald-600 text-white px-2 py-1 text-[10px] font-medium hover:bg-emerald-500 disabled:opacity-50">
              {gateLoading ? <Loader2 size={10} className="animate-spin" /> : <Shield size={10} />} Gate Çalıştır
            </button>
          )}
        </div>
      </div>

      <ContentDraftPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        data={previewData}
        title={blueprintTitle}
        draftId={resolvedDraftId || undefined}
      />
    </>
  );
}
