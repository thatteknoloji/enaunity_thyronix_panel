"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  LayoutDashboard,
  Layers,
  Loader2,
  Play,
  Shield,
  Sparkles,
  Workflow,
} from "lucide-react";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";
import { labelContentStatus } from "@/lib/admin/ui-labels";

type Tab =
  | "overview"
  | "plans"
  | "productions"
  | "quality"
  | "queue"
  | "published";

type Dashboard = {
  totalPlans: number;
  totalProductions: number;
  qualityPending: number;
  queuePending: number;
  publishedTotal: number;
  publishedToday: number;
  avgQuality: number;
  recentPlans: Array<{
    id: string;
    name: string;
    primaryKeyword: string;
    status: string;
    estimatedContentCount: number;
    createdAt: string;
  }>;
  recentProductions: Array<{
    id: string;
    title: string;
    contentType: string;
    qualityScore: number;
    status: string;
  }>;
};

type QueueItem = {
  id: string;
  title: string;
  contentType: string;
  status: string;
  priority: number;
  publishMode: string;
};

type PlanItem = {
  id: string;
  name: string;
  primaryKeyword: string;
  status: string;
  estimatedContentCount: number;
  createdAt: string;
};

const OPS_TABS: Tab[] = ["overview", "plans", "productions", "quality", "queue", "published"];

export function ContentOperationsShell() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("overview");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [quality, setQuality] = useState<QueueItem[]>([]);
  const [published, setPublished] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  const [keyword, setKeyword] = useState("cam tablo bayiliği");

  const loadDashboard = useCallback(async () => {
    const d = await fetchPageFactoryJson<Dashboard>("/api/admin/content-operations/dashboard");
    if (d.success && d.data) setDashboard(d.data);
  }, []);

  const loadPlans = useCallback(async () => {
    const d = await fetchPageFactoryJson<{ plans: PlanItem[] }>(
      "/api/admin/content-operations/pipeline?view=plans"
    );
    if (d.success && d.data) setPlans(d.data.plans || []);
  }, []);

  const loadQueue = useCallback(async () => {
    const d = await fetchPageFactoryJson<{ items: QueueItem[] }>(
      "/api/admin/content-operations/pipeline?view=queue"
    );
    if (d.success && d.data) setQueue(d.data.items || []);
  }, []);

  const loadQuality = useCallback(async () => {
    const d = await fetchPageFactoryJson<{ items: QueueItem[] }>(
      "/api/admin/content-operations/pipeline?view=quality-pending"
    );
    if (d.success && d.data) setQuality(d.data.items || []);
  }, []);

  const loadPublished = useCallback(async () => {
    const d = await fetchPageFactoryJson<{ items: QueueItem[] }>(
      "/api/admin/content-operations/pipeline?view=published"
    );
    if (d.success && d.data) setPublished(d.data.items || []);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const q = searchParams.get("tab");
    if (q && OPS_TABS.includes(q as Tab)) {
      setTab(q as Tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (tab === "overview") loadDashboard();
    else if (tab === "plans") loadPlans();
    else if (tab === "productions") loadDashboard();
    else if (tab === "quality") loadQuality();
    else if (tab === "queue") loadQueue();
    else if (tab === "published") loadPublished();
  }, [tab, loadDashboard, loadPlans, loadQuality, loadQueue, loadPublished]);

  const runPipeline = async (planId?: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const d = await fetchPageFactoryJson("/api/admin/content-operations/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          planId
            ? { action: "runFromPlan", planId, autoPublish: true }
            : {
                action: "runFromKeyword",
                primaryKeyword: keyword,
                geoProvinces: ["Ankara"],
                autoPublish: true,
              }
        ),
      });
      if (!d.success) throw new Error(d.error);
      setResult(d.data);
      await loadDashboard();
      await loadQueue();
      await loadQuality();
      await loadPublished();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pipeline hatası");
    } finally {
      setLoading(false);
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
    { id: "overview", label: "Genel Bakış", icon: LayoutDashboard },
    { id: "plans", label: "Planlar", icon: FileText },
    { id: "productions", label: "Üretimler", icon: Sparkles },
    { id: "quality", label: "Kalite Bekleyenler", icon: Shield },
    { id: "queue", label: "Yayın Kuyruğu", icon: Layers },
    { id: "published", label: "Yayınlananlar", icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Workflow className="h-7 w-7 text-sky-600" />
            İçerik Operasyon Merkezi
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Plan → Üretim → Kalite → Yayın — tam otomatik çekirdek akış
          </p>
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded bg-sky-50 text-sky-700 border border-sky-200">
          ENA_CEKIRDEK_AKIS_BIRLESTIRME_V1
        </span>
      </div>

      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sm text-sky-900">
        <strong>Akış:</strong> Plan Oluştur → Motorlara Gönder → İçerik Üret → Kalite Denetimi → Skor
        Hesapla → Yayın Kuyruğu → Otomatik Yayın (seo≥70, geo≥60, quality≥70)
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition ${
              tab === t.id ? "bg-sky-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <label className="text-sm flex-1 min-w-[200px]">
          <span className="text-gray-600">Keyword ile tam akış</span>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </label>
        <button
          onClick={() => runPipeline()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Tam Akışı Çalıştır
        </button>
      </div>

      {result ? (
        <pre className="text-xs bg-gray-50 border rounded-xl p-4 overflow-auto max-h-48">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}

      {tab === "overview" && dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Toplam Plan", value: dashboard.totalPlans },
            { label: "Üretimler", value: dashboard.totalProductions },
            { label: "Kalite Bekleyen", value: dashboard.qualityPending, color: "text-amber-600" },
            { label: "Kuyruk", value: dashboard.queuePending, color: "text-blue-600" },
            { label: "Yayınlanan", value: dashboard.publishedTotal, color: "text-emerald-600" },
            { label: "Bugün Yayın", value: dashboard.publishedToday },
            { label: "Ort. Kalite", value: dashboard.avgQuality },
            { label: "Bekleyen", value: dashboard.queuePending },
          ].map((c) => (
            <div key={c.label} className="bg-white border rounded-xl p-4">
              <div className="text-xs text-gray-500">{c.label}</div>
              <div className={`text-2xl font-bold ${c.color || ""}`}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "plans" && (
        <DataTable
          rows={plans.map((p) => ({
            id: p.id,
            title: p.name,
            sub: p.primaryKeyword,
            status: p.status,
            extra: String(p.estimatedContentCount),
            action: () => runPipeline(p.id),
          }))}
          cols={["Plan", "Keyword", "Durum", "Hedef", ""]}
          actionLabel="Akışı Çalıştır"
          loading={loading}
        />
      )}

      {tab === "productions" && dashboard && (
        <DataTable
          rows={dashboard.recentProductions.map((p) => ({
            id: p.id,
            title: p.title,
            sub: p.contentType,
            status: p.status,
            extra: `Kalite: ${p.qualityScore}`,
          }))}
          cols={["Başlık", "Tip", "Durum", "Skor"]}
        />
      )}

      {tab === "quality" && (
        <DataTable
          rows={quality.map((q) => ({
            id: q.id,
            title: q.title,
            sub: q.contentType,
            status: q.status,
            extra: q.publishMode,
          }))}
          cols={["Başlık", "Tip", "Durum", "Mod"]}
        />
      )}

      {tab === "queue" && (
        <DataTable
          rows={queue.map((q) => ({
            id: q.id,
            title: q.title,
            sub: q.contentType,
            status: q.status,
            extra: String(q.priority),
          }))}
          cols={["Başlık", "Tip", "Durum", "Öncelik"]}
        />
      )}

      {tab === "published" && (
        <DataTable
          rows={published.map((q) => ({
            id: q.id,
            title: q.title,
            sub: q.contentType,
            status: q.status,
            extra: "—",
          }))}
          cols={["Başlık", "Tip", "Durum", ""]}
        />
      )}
    </div>
  );
}

function DataTable({
  rows,
  cols,
  actionLabel,
  loading,
}: {
  rows: Array<{
    id: string;
    title: string;
    sub: string;
    status: string;
    extra: string;
    action?: () => void;
  }>;
  cols: string[];
  actionLabel?: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            {cols.map((c) => (
              <th key={c} className="text-left p-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-3 font-medium">{r.title}</td>
              <td className="p-3 text-gray-500">{r.sub}</td>
              <td className="p-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{labelContentStatus(r.status)}</span>
              </td>
              <td className="p-3">{r.extra}</td>
              {actionLabel && (
                <td className="p-3">
                  {r.action && (
                    <button
                      onClick={r.action}
                      disabled={loading}
                      className="text-xs text-sky-600 hover:underline disabled:opacity-50"
                    >
                      {actionLabel}
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length} className="p-6 text-center text-gray-500">
                Kayıt yok
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
