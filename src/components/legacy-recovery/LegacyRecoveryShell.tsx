"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Ban,
  FileInput,
  LayoutDashboard,
  Link2,
  Loader2,
  Play,
  Sparkles,
  Upload,
} from "lucide-react";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";
import { strategyLabel } from "@/lib/legacy-recovery/recovery-planner";

type Tab =
  | "dashboard"
  | "import"
  | "analyze"
  | "plan"
  | "redirects"
  | "gone"
  | "generated";

type Stats = {
  total: number;
  blogRecovery: number;
  pageRecovery: number;
  redirect301: number;
  gone410: number;
  pending: number;
  completed: number;
  imported: number;
  analyzed: number;
  planned: number;
  generated: number;
};

type LegacyUrlItem = {
  id: string;
  url: string;
  normalizedUrl: string;
  status: string;
  classification: string;
  recoveryStrategy: string;
  confidenceScore: number;
  suggestedTargetUrl: string | null;
  generatedBlogId: string | null;
  generatedPageId: string | null;
};

export function LegacyRecoveryShell() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [urls, setUrls] = useState<LegacyUrlItem[]>([]);
  const [redirects, setRedirects] = useState<Array<{ sourceUrl: string; targetUrl: string; statusCode: number }>>([]);
  const [goneRules, setGoneRules] = useState<Array<{ url: string; reason: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  const [importFormat, setImportFormat] = useState("manual");
  const [importContent, setImportContent] = useState(
    "/blog/cam-tablo-bayiligi\n/urun/eski-cam-tablo\n/kampanya-2020\n/kategori/cam-tablo"
  );
  const [manualUrl, setManualUrl] = useState("");
  const [redirectSource, setRedirectSource] = useState("");
  const [redirectTarget, setRedirectTarget] = useState("");
  const [goneUrl, setGoneUrl] = useState("");
  const [goneReason, setGoneReason] = useState("Süresi dolmuş kampanya");

  const loadStats = useCallback(async () => {
    const d = await fetchPageFactoryJson<Stats>("/api/admin/legacy-recovery/stats");
    if (d.success && d.data) setStats(d.data);
  }, []);

  const loadUrls = useCallback(async (status?: string) => {
    const q = status ? `?status=${status}&limit=50` : "?limit=50";
    const d = await fetchPageFactoryJson<{ items: LegacyUrlItem[] }>(`/api/admin/legacy-recovery/urls${q}`);
    if (d.success && d.data) setUrls(d.data.items || []);
  }, []);

  const loadRedirects = useCallback(async () => {
    const d = await fetchPageFactoryJson<{ items: typeof redirects }>("/api/admin/legacy-recovery/redirects");
    if (d.success && d.data) setRedirects(d.data.items || []);
  }, []);

  const loadGone = useCallback(async () => {
    const d = await fetchPageFactoryJson<{ items: typeof goneRules }>("/api/admin/legacy-recovery/gone");
    if (d.success && d.data) setGoneRules(d.data.items || []);
  }, []);

  const loadGenerated = useCallback(async () => {
    const d = await fetchPageFactoryJson<{ items: LegacyUrlItem[] }>(
      "/api/admin/legacy-recovery/urls?view=generated"
    );
    if (d.success && d.data) setUrls(d.data.items || []);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (tab === "analyze" || tab === "plan") loadUrls();
    if (tab === "redirects") loadRedirects();
    if (tab === "gone") loadGone();
    if (tab === "generated") loadGenerated();
  }, [tab, loadUrls, loadRedirects, loadGone, loadGenerated]);

  const runAction = async (endpoint: string, body?: Record<string, unknown>) => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const d = await fetchPageFactoryJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      });
      if (!d.success) throw new Error(d.error || "İşlem başarısız");
      setResult(d.data);
      await loadStats();
      if (tab === "analyze" || tab === "plan") await loadUrls();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setLoading(false);
    }
  };

  const runImport = async () => {
    setError(null);
    setLoading(true);
    try {
      const body =
        importFormat === "manual"
          ? { format: "manual", urls: importContent.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean) }
          : { format: importFormat, content: importContent };
      const d = await fetchPageFactoryJson("/api/admin/legacy-recovery/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!d.success) throw new Error(d.error);
      setResult(d.data);
      await loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import hatası");
    } finally {
      setLoading(false);
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
    { id: "dashboard", label: "Genel Bakış", icon: LayoutDashboard },
    { id: "import", label: "URL İçe Aktar", icon: Upload },
    { id: "analyze", label: "Analiz", icon: Sparkles },
    { id: "plan", label: "Kurtarma Planı", icon: FileInput },
    { id: "redirects", label: "301 Yönlendirmeler", icon: ArrowRightLeft },
    { id: "gone", label: "410 Kaldırılan Sayfalar", icon: Ban },
    { id: "generated", label: "Üretilen İçerikler", icon: Link2 },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-600 p-2 text-white">
            <Link2 size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Link Kurtarma Merkezi</h1>
            <p className="text-sm text-gray-600 mt-1">
              Eski URL analizi, 301/410 kararları, Blog ve Sayfa kurtarma — bağımsız modül
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
              tab === id ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && stats ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Toplam URL", value: stats.total },
            { label: "Blog Kurtarma", value: stats.blogRecovery },
            { label: "Sayfa Kurtarma", value: stats.pageRecovery },
            { label: "301", value: stats.redirect301 },
            { label: "410", value: stats.gone410 },
            { label: "Bekleyen", value: stats.pending },
            { label: "Tamamlanan", value: stats.completed },
            { label: "İçe Aktarılan", value: stats.imported },
            { label: "Analiz", value: stats.analyzed },
            { label: "Planlı", value: stats.planned },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500 uppercase">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "import" ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <label className="block text-xs text-gray-600">
            Format
            <select
              value={importFormat}
              onChange={(e) => setImportFormat(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="manual">Manuel / Satır satır</option>
              <option value="csv">CSV</option>
              <option value="txt">TXT</option>
              <option value="sitemap">XML Sitemap</option>
            </select>
          </label>
          <label className="block text-xs text-gray-600">
            İçerik
            <textarea
              value={importContent}
              onChange={(e) => setImportContent(e.target.value)}
              rows={8}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
            />
          </label>
          <button
            type="button"
            onClick={runImport}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            İçe Aktar
          </button>
        </div>
      ) : null}

      {tab === "analyze" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runAction("/api/admin/legacy-recovery/analyze")}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm text-white"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Toplu Analiz
            </button>
            <button
              type="button"
              onClick={() => runAction("/api/admin/legacy-recovery/plan")}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900"
            >
              Plan Oluştur
            </button>
            <button
              type="button"
              onClick={() => runAction("/api/admin/legacy-recovery/generate")}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm text-white"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              Toplu Uygula
            </button>
          </div>
          <UrlTable urls={urls} />
        </div>
      ) : null}

      {tab === "plan" ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => runAction("/api/admin/legacy-recovery/plan")}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm text-white"
          >
            Plan Oluştur
          </button>
          <UrlTable urls={urls.filter((u) => u.status === "PLANNED" || u.status === "ANALYZED")} />
        </div>
      ) : null}

      {tab === "redirects" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={redirectSource}
              onChange={(e) => setRedirectSource(e.target.value)}
              placeholder="/eski-url"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              value={redirectTarget}
              onChange={(e) => setRedirectTarget(e.target.value)}
              placeholder="/yeni-url"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={async () => {
                await runAction("/api/admin/legacy-recovery/redirects", {
                  sourceUrl: redirectSource,
                  targetUrl: redirectTarget,
                });
                await loadRedirects();
              }}
              disabled={loading}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white"
            >
              301 Ekle
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="py-2">Kaynak</th>
                <th className="py-2">Hedef</th>
                <th className="py-2">Kod</th>
              </tr>
            </thead>
            <tbody>
              {redirects.map((r) => (
                <tr key={r.sourceUrl} className="border-t border-gray-100">
                  <td className="py-2 font-mono text-xs">{r.sourceUrl}</td>
                  <td className="py-2 font-mono text-xs">{r.targetUrl}</td>
                  <td className="py-2">{r.statusCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "gone" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={goneUrl}
              onChange={(e) => setGoneUrl(e.target.value)}
              placeholder="/kampanya-2020"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              value={goneReason}
              onChange={(e) => setGoneReason(e.target.value)}
              placeholder="Sebep"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={async () => {
                await runAction("/api/admin/legacy-recovery/gone", { url: goneUrl, reason: goneReason });
                await loadGone();
              }}
              disabled={loading}
              className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-white"
            >
              410 Ekle
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="py-2">URL</th>
                <th className="py-2">Sebep</th>
              </tr>
            </thead>
            <tbody>
              {goneRules.map((r) => (
                <tr key={r.url} className="border-t border-gray-100">
                  <td className="py-2 font-mono text-xs">{r.url}</td>
                  <td className="py-2 text-gray-600">{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "generated" ? <UrlTable urls={urls} showGenerated /> : null}

      {result ? (
        <pre className="rounded-lg border border-gray-200 bg-gray-900 text-gray-100 p-4 text-xs overflow-auto max-h-48">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function UrlTable({ urls, showGenerated }: { urls: LegacyUrlItem[]; showGenerated?: boolean }) {
  if (!urls.length) return <p className="text-sm text-gray-500">Kayıt yok.</p>;
  return (
    <table className="w-full text-sm rounded-xl border border-gray-200 overflow-hidden">
      <thead className="bg-gray-50 text-left text-xs text-gray-500">
        <tr>
          <th className="px-4 py-3">URL</th>
          <th className="px-4 py-3">Sınıf</th>
          <th className="px-4 py-3">Strateji</th>
          <th className="px-4 py-3">Durum</th>
          {showGenerated ? <th className="px-4 py-3">Üretim</th> : null}
        </tr>
      </thead>
      <tbody>
        {urls.map((u) => (
          <tr key={u.id} className="border-t border-gray-100">
            <td className="px-4 py-3">
              <div className="font-mono text-xs">{u.normalizedUrl}</div>
              {u.suggestedTargetUrl ? (
                <div className="text-xs text-gray-500">→ {u.suggestedTargetUrl}</div>
              ) : null}
            </td>
            <td className="px-4 py-3 text-xs">{u.classification}</td>
            <td className="px-4 py-3 text-xs">
              {strategyLabel(u.recoveryStrategy as Parameters<typeof strategyLabel>[0])}
            </td>
            <td className="px-4 py-3 text-xs">{u.status}</td>
            {showGenerated ? (
              <td className="px-4 py-3 text-xs">
                {u.generatedBlogId ? `Blog: ${u.generatedBlogId.slice(0, 8)}…` : null}
                {u.generatedPageId ? `Sayfa: ${u.generatedPageId.slice(0, 8)}…` : null}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
