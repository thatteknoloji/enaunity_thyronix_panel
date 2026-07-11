"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, RefreshCw, ExternalLink } from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";

type Item = {
  id: string;
  title: string;
  status: "ok" | "warning" | "missing";
  description: string;
  suggestion: string;
  href?: string;
};

type ChecklistData = {
  items: Item[];
  summary: { ok: number; warning: number; missing: number };
  buildInfo: Record<string, string>;
  knownGaps: string[];
};

const STATUS_ICON = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  missing: XCircle,
};

const STATUS_STYLE = {
  ok: "text-green-700 bg-green-50 border-green-200",
  warning: "text-amber-800 bg-amber-50 border-amber-200",
  missing: "text-red-700 bg-red-50 border-red-200",
};

export default function LinkSlashReleasePage() {
  const [data, setData] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/linkslash/release-checklist");
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Yüklenemedi");
      setData(d.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <Link href={toAdminUrl("/admin/linkslash")} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">LinkSlash V1.0 Release Checklist</h1>
          <p className="mt-1 text-sm text-gray-500">Ürünleştirme hazırlık durumu ve bilinen eksikler</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="ml-auto flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Yenile
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {data && (
        <>
          <div className="mb-6 grid grid-cols-3 gap-3 max-w-lg">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-800">{data.summary.ok}</p>
              <p className="text-xs text-green-700">OK</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
              <p className="text-2xl font-bold text-amber-800">{data.summary.warning}</p>
              <p className="text-xs text-amber-700">Uyarı</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
              <p className="text-2xl font-bold text-red-800">{data.summary.missing}</p>
              <p className="text-xs text-red-700">Eksik</p>
            </div>
          </div>

          <div className="mb-6 rounded-xl border bg-white p-4 shadow-sm text-sm text-gray-600">
            <p className="font-medium text-gray-900 mb-2">Build / Deploy</p>
            <ul className="space-y-1">
              {Object.entries(data.buildInfo).map(([k, v]) => (
                <li key={k}><span className="text-gray-400">{k}:</span> {v}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 mb-8">
            {data.items.map((item) => {
              const Icon = STATUS_ICON[item.status];
              return (
                <div key={item.id} className={`rounded-xl border p-4 ${STATUS_STYLE[item.status]}`}>
                  <div className="flex items-start gap-3">
                    <Icon size={20} className="shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm opacity-90">{item.description}</p>
                      <p className="mt-2 text-xs opacity-80"><strong>Öneri:</strong> {item.suggestion}</p>
                      {item.href && (
                        <Link
                          href={item.href.startsWith("/admin") ? toAdminUrl(item.href) : item.href}
                          target={item.href.startsWith("http") || item.href.startsWith("/linkslash") ? "_blank" : undefined}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium underline"
                        >
                          İlgili sayfa <ExternalLink size={12} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Bilinen eksikler (V1.0 sonrası)</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
              {data.knownGaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
            <div className="mt-4 text-sm text-gray-600 space-y-1">
              <p><strong>Extension:</strong> <code>public/linkslash/extension/RELEASE.md</code></p>
              <p><strong>Android:</strong> <code>mobile/linkslash/RELEASE.md</code></p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
