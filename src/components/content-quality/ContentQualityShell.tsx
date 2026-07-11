"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  FileText,
  Layers,
  LayoutDashboard,
  Lightbulb,
  Link2,
  Loader2,
  Package,
  RefreshCw,
  Shield,
  Sparkles,
} from "lucide-react";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";

type Tab =
  | "overview"
  | "blogs"
  | "pages"
  | "products"
  | "recovery"
  | "issues"
  | "recommendations";

type Dashboard = {
  totalContent: number;
  avgSeo: number;
  avgGeo: number;
  avgAeo: number;
  avgQuality: number;
  criticalIssues: number;
  byType: Record<string, number>;
  worst: Array<{ title: string; qualityScore: number; issueCount: number; contentType: string }>;
  best: Array<{ title: string; qualityScore: number; issueCount: number; contentType: string }>;
  mostIssues: Array<{ title: string; qualityScore: number; issueCount: number; contentType: string }>;
};

type AuditItem = {
  id: string;
  contentType: string;
  contentId: string;
  title: string;
  seoScore: number;
  geoScore: number;
  aeoScore: number;
  qualityScore: number;
  contentHealthScore: number;
  issues: Array<{ type: string; severity: string; message: string }>;
  recommendations: Array<{ title: string; priority: string; description: string }>;
};

export function ContentQualityShell() {
  const [tab, setTab] = useState<Tab>("overview");
  const [report, setReport] = useState<Dashboard | null>(null);
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [issues, setIssues] = useState<Array<{ title: string; issue: { type: string; message: string }; qualityScore: number }>>([]);
  const [recommendations, setRecommendations] = useState<Array<{ title: string; priority: string; description: string; contentType: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  const loadReport = useCallback(async () => {
    const d = await fetchPageFactoryJson<Dashboard>("/api/admin/content-quality/report");
    if (d.success && d.data) setReport(d.data);
  }, []);

  const loadAudits = useCallback(async (contentType?: string) => {
    const q = contentType ? `?contentType=${contentType}&limit=50` : "?limit=50";
    const d = await fetchPageFactoryJson<{ items: AuditItem[] }>(`/api/admin/content-quality/audits${q}`);
    if (d.success && d.data) setAudits(d.data.items || []);
  }, []);

  const loadIssues = useCallback(async () => {
    const d = await fetchPageFactoryJson<{ issues: typeof issues }>("/api/admin/content-quality/audits?view=issues");
    if (d.success && d.data) setIssues(d.data.issues || []);
  }, []);

  const loadRecommendations = useCallback(async () => {
    const d = await fetchPageFactoryJson<{ recommendations: typeof recommendations }>(
      "/api/admin/content-quality/audits?view=recommendations"
    );
    if (d.success && d.data) setRecommendations(d.data.recommendations || []);
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    if (tab === "overview") loadReport();
    else if (tab === "blogs") loadAudits("BLOG");
    else if (tab === "pages") loadAudits("PAGE");
    else if (tab === "products") loadAudits("PRODUCT");
    else if (tab === "recovery") loadAudits("RECOVERY_PAGE");
    else if (tab === "issues") loadIssues();
    else if (tab === "recommendations") loadRecommendations();
  }, [tab, loadReport, loadAudits, loadIssues, loadRecommendations]);

  const runAudit = async (action = "auditAll") => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const d = await fetchPageFactoryJson("/api/admin/content-quality/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "recalculate" ? { action: "recalculate" } : {}),
      });
      if (!d.success) throw new Error(d.error);
      setResult(d.data);
      await loadReport();
      if (tab !== "overview") await loadAudits();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setLoading(false);
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
    { id: "overview", label: "Genel Bakış", icon: LayoutDashboard },
    { id: "blogs", label: "Bloglar", icon: FileText },
    { id: "pages", label: "Sayfalar", icon: Layers },
    { id: "products", label: "Ürünler", icon: Package },
    { id: "recovery", label: "Kurtarma Sayfaları", icon: Link2 },
    { id: "issues", label: "Sorunlar", icon: AlertTriangle },
    { id: "recommendations", label: "Öneriler", icon: Lightbulb },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-violet-600 p-2 text-white">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">İçerik Kalite Merkezi</h1>
            <p className="text-sm text-gray-600 mt-1">
              SEO · GEO · AEO · Schema · İç Link · İçerik Sağlığı — merkezi denetim
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => runAudit("auditAll")}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm text-white"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Yeniden Tara
        </button>
        <button
          type="button"
          onClick={() => runAudit("recalculate")}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-sm text-violet-900"
        >
          <BarChart3 size={16} />
          Skorları Güncelle
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
              tab === id ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && report ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              { label: "Toplam İçerik", value: report.totalContent },
              { label: "Ort. SEO", value: report.avgSeo },
              { label: "Ort. GEO", value: report.avgGeo },
              { label: "Ort. AEO", value: report.avgAeo },
              { label: "Ort. Kalite", value: report.avgQuality },
              { label: "Kritik Sorun", value: report.criticalIssues },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-500 uppercase">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <RankList title="En Kötü İçerikler" items={report.worst} />
            <RankList title="En İyi İçerikler" items={report.best} />
            <RankList title="En Çok Sorunlu" items={report.mostIssues} showIssues />
          </div>
        </div>
      ) : null}

      {["blogs", "pages", "products", "recovery"].includes(tab) ? (
        <AuditTable audits={audits} loading={loading} />
      ) : null}

      {tab === "issues" ? (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {issues.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">Sorun yok veya henüz tarama yapılmadı.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3">İçerik</th>
                  <th className="px-4 py-3">Sorun</th>
                  <th className="px-4 py-3">Kalite</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((row, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-4 py-3">{row.title}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-red-600">{row.issue.type}</span>
                      <div className="text-gray-600">{row.issue.message}</div>
                    </td>
                    <td className="px-4 py-3">{row.qualityScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {tab === "recommendations" ? (
        <div className="space-y-3">
          {recommendations.length === 0 ? (
            <p className="text-sm text-gray-500">Öneri yok.</p>
          ) : (
            recommendations.map((r, i) => (
              <div key={i} className="rounded-lg border border-violet-100 bg-violet-50/50 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-violet-600" />
                  <span className="font-medium text-gray-900">{r.title}</span>
                  <span className="text-xs text-gray-500">({r.contentType})</span>
                  <span className="ml-auto text-xs rounded-full bg-violet-200 px-2 py-0.5">{r.priority}</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{r.description}</p>
              </div>
            ))
          )}
        </div>
      ) : null}

      {result ? (
        <pre className="rounded-lg border border-gray-200 bg-gray-900 text-gray-100 p-4 text-xs overflow-auto max-h-40">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function RankList({
  title,
  items,
  showIssues,
}: {
  title: string;
  items: Array<{ title: string; qualityScore: number; issueCount: number }>;
  showIssues?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-gray-500">Veri yok</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex justify-between text-sm gap-2">
              <span className="truncate text-gray-700">{item.title}</span>
              <span className="shrink-0 text-gray-500">
                {item.qualityScore}
                {showIssues ? ` / ${item.issueCount} sorun` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AuditTable({ audits, loading }: { audits: AuditItem[]; loading: boolean }) {
  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline" /></div>;
  if (!audits.length) return <p className="text-sm text-gray-500 p-4">Henüz denetim yok. Yeniden Tara ile başlayın.</p>;
  return (
    <table className="w-full text-sm rounded-xl border border-gray-200 overflow-hidden">
      <thead className="bg-gray-50 text-left text-xs text-gray-500">
        <tr>
          <th className="px-4 py-3">İçerik</th>
          <th className="px-4 py-3">SEO</th>
          <th className="px-4 py-3">GEO</th>
          <th className="px-4 py-3">AEO</th>
          <th className="px-4 py-3">Kalite</th>
          <th className="px-4 py-3">Sağlık</th>
          <th className="px-4 py-3">Sorun</th>
        </tr>
      </thead>
      <tbody>
        {audits.map((a) => (
          <tr key={a.id} className="border-t border-gray-100">
            <td className="px-4 py-3">
              <div className="font-medium text-gray-900">{a.title}</div>
              <div className="text-xs text-gray-500">{a.contentType}</div>
            </td>
            <td className="px-4 py-3">{a.seoScore}</td>
            <td className="px-4 py-3">{a.geoScore}</td>
            <td className="px-4 py-3">{a.aeoScore}</td>
            <td className="px-4 py-3 font-semibold">{a.qualityScore}</td>
            <td className="px-4 py-3">{a.contentHealthScore}</td>
            <td className="px-4 py-3 text-xs text-red-600">{a.issues.length}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
