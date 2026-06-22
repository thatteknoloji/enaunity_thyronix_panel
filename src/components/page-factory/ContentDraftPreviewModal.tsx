"use client";

import { X } from "lucide-react";

type DraftPayload = {
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  sections: Array<{ type: string; heading: string; content: string; bullets?: string[] }>;
  faq: Array<{ question: string; answer: string }>;
  schemaDraft: Record<string, unknown>;
  internalLinks: Array<{ anchor: string; targetType: string; targetSlug: string | null; reason: string }>;
  sourceJson: Record<string, unknown>;
  quality: { seoScore: number; aeoScore: number; geoScore: number; publishScore: number };
  contentPolicyWarnings?: string[];
  status?: string;
  gate?: {
    status: string;
    score: number;
    blockers: Array<{ label: string; message: string }>;
    warnings: Array<{ label: string; message: string }>;
    suggestions: string[];
    checks?: Array<{ key: string; label: string; status: string; message: string }>;
    passed?: Record<string, boolean>;
  };
};

type Props = {
  open: boolean;
  onClose: () => void;
  data: DraftPayload | null;
  title?: string;
  draftId?: string;
};

export function ContentDraftPreviewModal({ open, onClose, data, title }: Props) {
  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">{title || "Content Draft Önizleme"}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4 text-xs">
          <div className="grid grid-cols-4 gap-2">
            {[
              ["SEO", data.quality.seoScore],
              ["AEO", data.quality.aeoScore],
              ["GEO", data.quality.geoScore],
              ["Publish", data.quality.publishScore],
            ].map(([label, score]) => (
              <div key={String(label)} className="rounded-lg bg-gray-50 p-2 text-center">
                <p className="text-[10px] text-gray-500">{label}</p>
                <p className="text-lg font-bold text-gray-900">{score}</p>
              </div>
            ))}
          </div>

          {data.gate && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
              <p className="font-semibold text-emerald-800">Publish Gate — {data.gate.status} (score {data.gate.score})</p>
              {data.gate.passed && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(data.gate.passed).map(([k, v]) => (
                    <span key={k} className={`text-[10px] px-1.5 py-0.5 rounded ${v ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {k}: {v ? "✓" : "✗"}
                    </span>
                  ))}
                </div>
              )}
              {data.gate.blockers?.length > 0 && (
                <div>
                  <p className="font-medium text-red-700 text-[10px]">Blockers</p>
                  {data.gate.blockers.map((b, i) => <p key={i} className="text-red-600">{b.label}: {b.message}</p>)}
                </div>
              )}
              {data.gate.warnings?.length > 0 && (
                <div>
                  <p className="font-medium text-amber-700 text-[10px]">Warnings</p>
                  {data.gate.warnings.map((w, i) => <p key={i} className="text-amber-600">{w.label}: {w.message}</p>)}
                </div>
              )}
              {data.gate.suggestions?.length > 0 && (
                <div>
                  <p className="font-medium text-gray-700 text-[10px]">Suggestions</p>
                  {data.gate.suggestions.map((s, i) => <p key={i} className="text-gray-600">{s}</p>)}
                </div>
              )}
            </div>
          )}

          {data.contentPolicyWarnings?.map((w) => (
            <p key={w} className="text-amber-700 bg-amber-50 rounded px-2 py-1">{w}</p>
          ))}

          <div>
            <p className="font-semibold text-gray-800">H1</p>
            <p className="text-gray-600">{data.h1}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800">Meta Title</p>
            <p className="text-gray-600">{data.metaTitle}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800">Meta Description</p>
            <p className="text-gray-600">{data.metaDescription}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800">Intro</p>
            <p className="text-gray-600">{data.intro}</p>
          </div>

          <div>
            <p className="font-semibold text-gray-800 mb-1">Sections ({data.sections.length})</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {data.sections.map((s, i) => (
                <div key={i} className="bg-gray-50 rounded p-2">
                  <p className="font-medium text-gray-700">{s.type}: {s.heading}</p>
                  <p className="text-gray-500">{s.content.slice(0, 150)}{s.content.length > 150 ? "…" : ""}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="font-semibold text-gray-800 mb-1">FAQ ({data.faq.length})</p>
            {data.faq.slice(0, 5).map((f, i) => (
              <div key={i} className="mb-1">
                <p className="font-medium text-gray-700">{f.question}</p>
                <p className="text-gray-500">{f.answer}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="font-semibold text-gray-800 mb-1">Schema JSON</p>
            <pre className="bg-gray-900 text-green-400 rounded p-2 text-[9px] overflow-x-auto max-h-32">
              {JSON.stringify(data.schemaDraft, null, 2)}
            </pre>
          </div>

          <div>
            <p className="font-semibold text-gray-800 mb-1">Internal Links</p>
            {data.internalLinks.slice(0, 6).map((l, i) => (
              <p key={i} className="text-gray-500">{l.anchor} → {l.targetSlug || l.targetType}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
