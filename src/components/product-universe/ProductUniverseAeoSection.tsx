"use client";

import { useState } from "react";
import { Eye, Loader2, Save, Sparkles } from "lucide-react";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";

type AeoPayload = {
  aeoQualityScore: number;
  answerBlocks: Array<{ type: string; question: string; answer: string; shortAnswer: string }>;
  faqBlocks: Array<{ question: string; answer: string }>;
  schemaHints: Array<{ type: string; priority: number; missingFields: string[] }>;
  citationHints: Array<{ sourceType: string; sourceName: string; field: string; confidence: number }>;
  noindexRecommended: boolean;
  sensitiveCategoryWarning?: boolean;
};

type Props = {
  blueprintId: string;
  blueprintTitle: string;
  initialAeoScore?: number | null;
  hasAeo?: boolean;
};

export function ProductUniverseAeoSection({
  blueprintId,
  blueprintTitle,
  initialAeoScore,
  hasAeo,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AeoPayload | null>(null);
  const [savedScore, setSavedScore] = useState<number | null>(initialAeoScore ?? null);
  const [saved, setSaved] = useState(hasAeo ?? false);

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchPageFactoryJson<AeoPayload>(`/api/aeo/blueprints/${blueprintId}/preview`, { method: "POST" });
      if (!d.success) throw new Error(d.error || "Önizleme başarısız");
      setPreview(d.data || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Önizleme başarısız");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const d = await fetchPageFactoryJson<{ payload: AeoPayload }>(`/api/aeo/blueprints/${blueprintId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });
      if (!d.success) throw new Error(d.error || "Kayıt başarısız");
      setPreview(d.data?.payload || null);
      setSavedScore(d.data?.payload.aeoQualityScore ?? null);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  const data = preview;
  const score = data?.aeoQualityScore ?? savedScore;
  const quickAnswer = data?.answerBlocks.find((b) => b.type === "QUICK_ANSWER");

  return (
    <div className="rounded-lg border border-cyan-100 bg-cyan-50/40 p-3 space-y-2 mt-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Sparkles size={12} className="text-cyan-600" />
        <span className="text-[10px] font-semibold text-cyan-800">AEO Layer V1</span>
        <span className="text-[10px] text-gray-500 truncate">{blueprintTitle}</span>
        {score != null && (
          <span
            className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded ${
              score >= 70 ? "bg-emerald-100 text-emerald-700" : score >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
            }`}
          >
            AEO {score}
          </span>
        )}
        {saved && !preview && (
          <span className="text-[10px] text-emerald-600">Kayıtlı</span>
        )}
      </div>

      {error && <p className="text-[10px] text-red-600">{error}</p>}

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={handlePreview}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded bg-cyan-100 text-cyan-800 px-2 py-1 text-[10px] font-medium hover:bg-cyan-200 disabled:opacity-50"
        >
          {loading ? <Loader2 size={10} className="animate-spin" /> : <Eye size={10} />}
          AEO Önizle
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded bg-cyan-600 text-white px-2 py-1 text-[10px] font-medium hover:bg-cyan-500 disabled:opacity-50"
        >
          {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
          AEO Katmanını Kaydet
        </button>
      </div>

      {data && (
        <div className="space-y-2 text-[10px]">
          {data.sensitiveCategoryWarning && (
            <p className="text-amber-700 bg-amber-50 rounded px-2 py-1">Hassas kategori — içerik üretiminde ek kontrol önerilir.</p>
          )}
          {data.noindexRecommended && (
            <p className="text-orange-700">noindex öneriliyor — AEO skoru max 60 ile sınırlı.</p>
          )}

          {quickAnswer && (
            <div className="bg-white rounded p-2 border border-gray-100">
              <p className="font-semibold text-gray-800 mb-0.5">Quick Answer</p>
              <p className="text-gray-600">{quickAnswer.answer}</p>
            </div>
          )}

          {data.faqBlocks.length > 0 && (
            <div className="bg-white rounded p-2 border border-gray-100 max-h-28 overflow-y-auto">
              <p className="font-semibold text-gray-800 mb-1">FAQ ({data.faqBlocks.length})</p>
              {data.faqBlocks.slice(0, 4).map((f, i) => (
                <div key={i} className="mb-1">
                  <p className="font-medium text-gray-700">{f.question}</p>
                  <p className="text-gray-500">{f.answer.slice(0, 120)}…</p>
                </div>
              ))}
            </div>
          )}

          {data.schemaHints.length > 0 && (
            <div className="bg-white rounded p-2 border border-gray-100">
              <p className="font-semibold text-gray-800 mb-1">Schema Hints</p>
              <div className="flex flex-wrap gap-1">
                {data.schemaHints.map((s) => (
                  <span key={s.type} className="bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded">
                    {s.type}
                    {s.missingFields.length > 0 && ` (−${s.missingFields.length})`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.citationHints.length > 0 && (
            <div className="bg-white rounded p-2 border border-gray-100">
              <p className="font-semibold text-gray-800 mb-1">Citation Hints</p>
              {data.citationHints.slice(0, 4).map((c, i) => (
                <p key={i} className="text-gray-500">
                  {c.sourceType} · {c.sourceName} · {c.field} ({Math.round(c.confidence * 100)}%)
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
