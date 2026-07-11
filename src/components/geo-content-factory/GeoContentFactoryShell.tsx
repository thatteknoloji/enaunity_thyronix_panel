"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Globe2,
  LayoutDashboard,
  Loader2,
  MapPin,
  Play,
  PlusCircle,
  Sparkles,
  XCircle,
} from "lucide-react";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";

type Tab = "dashboard" | "create" | "queue" | "completed" | "errors";

type Stats = {
  totalGeoContent: number;
  totalProvinces: number;
  totalDistricts: number;
  successRate: number;
  recentJobs: Array<{
    id: string;
    keyword: string;
    status: string;
    totalTargets: number;
    generatedCount: number;
    publishedCount: number;
    failedCount: number;
    createdAt: string;
  }>;
};

type Job = {
  id: string;
  keyword: string;
  keywordGroup: string | null;
  category: string | null;
  status: string;
  totalTargets: number;
  generatedCount: number;
  publishedCount: number;
  failedCount: number;
  createdAt: string;
};

type Preview = {
  totalTargets: number;
  provinceCount: number;
  districtCount: number;
  sampleUrls: string[];
  sampleSlugs: string[];
  estimatedMinutes: number;
};

const MODES = [
  { id: "PROVINCE", label: "İl" },
  { id: "DISTRICT", label: "İlçe" },
  { id: "PROVINCE_AND_DISTRICT", label: "İl + İlçe" },
] as const;

export function GeoContentFactoryShell() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  const [keyword, setKeyword] = useState("cam tablo bayiliği");
  const [keywordGroup, setKeywordGroup] = useState("");
  const [category, setCategory] = useState("");
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("PROVINCE");

  const loadStats = useCallback(async () => {
    const d = await fetchPageFactoryJson<Stats>("/api/admin/geo-content-factory/stats");
    if (d.success && d.data) setStats(d.data);
  }, []);

  const loadJobs = useCallback(async (status?: string) => {
    const q = status ? `?status=${status}` : "";
    const d = await fetchPageFactoryJson<{ jobs: Job[] }>(`/api/admin/geo-content-factory/jobs${q}`);
    if (d.success && d.data) setJobs(d.data.jobs || []);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (tab === "dashboard") loadStats();
    else if (tab === "queue") loadJobs("RUNNING");
    else if (tab === "completed") loadJobs("COMPLETED");
    else if (tab === "errors") loadJobs("FAILED");
    else if (tab === "create") loadJobs();
  }, [tab, loadStats, loadJobs]);

  const runPreview = async () => {
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const d = await fetchPageFactoryJson<Preview>("/api/admin/geo-content-factory/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", keyword, mode }),
      });
      if (!d.success) throw new Error(d.error);
      setPreview(d.data || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Önizleme hatası");
    } finally {
      setLoading(false);
    }
  };

  const runGenerate = async (autoPublish: boolean) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const d = await fetchPageFactoryJson("/api/admin/geo-content-factory/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          keyword,
          keywordGroup: keywordGroup || undefined,
          category: category || undefined,
          mode,
          autoPublish,
        }),
      });
      if (!d.success) throw new Error(d.error);
      setResult(d.data);
      await loadStats();
      await loadJobs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Üretim hatası");
    } finally {
      setLoading(false);
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
    { id: "dashboard", label: "Genel Bakış", icon: LayoutDashboard },
    { id: "create", label: "Oluştur", icon: PlusCircle },
    { id: "queue", label: "İş Kuyruğu", icon: Loader2 },
    { id: "completed", label: "Tamamlananlar", icon: CheckCircle2 },
    { id: "errors", label: "Hatalar", icon: XCircle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe2 className="h-7 w-7 text-emerald-600" />
            GEO İçerik Fabrikası
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tek keyword ile şehir ve ilçe bazlı binlerce GEO uyumlu blog üretin
          </p>
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
          ENA_GEO_ICERIK_FABRIKASI_V1
        </span>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition ${
              tab === t.id ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {tab === "dashboard" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Toplam GEO İçerik", value: stats.totalGeoContent, icon: FileTextIcon },
              { label: "Toplam Şehir", value: stats.totalProvinces, icon: MapPin },
              { label: "Toplam İlçe", value: stats.totalDistricts, icon: MapPin },
              { label: "Başarı Oranı", value: `%${stats.successRate}`, icon: Sparkles },
              { label: "Son İşler", value: stats.recentJobs.length, icon: LayoutDashboard },
            ].map((card) => (
              <div key={card.label} className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                  <card.icon className="h-4 w-4" />
                  {card.label}
                </div>
                <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b font-medium text-gray-800">Son İşler</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left p-3">Keyword</th>
                    <th className="text-left p-3">Durum</th>
                    <th className="text-right p-3">Hedef</th>
                    <th className="text-right p-3">Üretilen</th>
                    <th className="text-right p-3">Yayın</th>
                    <th className="text-right p-3">Hata</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentJobs.map((j) => (
                    <tr key={j.id} className="border-t">
                      <td className="p-3 font-medium">{j.keyword}</td>
                      <td className="p-3">
                        <StatusBadge status={j.status} />
                      </td>
                      <td className="p-3 text-right">{j.totalTargets}</td>
                      <td className="p-3 text-right">{j.generatedCount}</td>
                      <td className="p-3 text-right">{j.publishedCount}</td>
                      <td className="p-3 text-right text-red-600">{j.failedCount}</td>
                    </tr>
                  ))}
                  {stats.recentJobs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-500">
                        Henüz iş yok
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "create" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Üretim Formu</h2>
            <label className="block text-sm">
              <span className="text-gray-600">Keyword</span>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Keyword Group</span>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={keywordGroup}
                onChange={(e) => setKeywordGroup(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Kategori</span>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </label>
            <div>
              <span className="text-sm text-gray-600">Üretim Türü</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                      mode === m.id
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-gray-700 border-gray-300"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={runPreview}
                disabled={loading || !keyword.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Önizleme
              </button>
              <button
                onClick={() => runGenerate(false)}
                disabled={loading || !keyword.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Üret
              </button>
              <button
                onClick={() => runGenerate(true)}
                disabled={loading || !keyword.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Üret ve Yayınla
              </button>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Önizleme</h2>
            {preview ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500">Toplam içerik</div>
                    <div className="text-xl font-bold">{preview.totalTargets}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500">Tahmini süre</div>
                    <div className="text-xl font-bold">~{preview.estimatedMinutes} dk</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500">İl</div>
                    <div className="text-xl font-bold">{preview.provinceCount}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500">İlçe</div>
                    <div className="text-xl font-bold">{preview.districtCount}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-2">Örnek URL&apos;ler</div>
                  <ul className="text-sm space-y-1 font-mono text-emerald-700">
                    {preview.sampleUrls.map((u) => (
                      <li key={u}>{u}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">Önizleme için &quot;Önizleme&quot; butonuna tıklayın.</p>
            )}
            {result ? (
              <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto max-h-48">
                {JSON.stringify(result, null, 2)}
              </pre>
            ) : null}
          </div>
        </div>
      )}

      {(tab === "queue" || tab === "completed" || tab === "errors") && (
        <JobTable jobs={jobs} />
      )}
    </div>
  );
}

function FileTextIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-gray-100 text-gray-700",
    RUNNING: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    FAILED: "bg-red-100 text-red-700",
    CANCELLED: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || colors.PENDING}`}>
      {status}
    </span>
  );
}

function JobTable({ jobs }: { jobs: Job[] }) {
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="text-left p-3">Keyword</th>
            <th className="text-left p-3">Durum</th>
            <th className="text-right p-3">Hedef</th>
            <th className="text-right p-3">Üretilen</th>
            <th className="text-right p-3">Yayın</th>
            <th className="text-right p-3">Hata</th>
            <th className="text-left p-3">Tarih</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.id} className="border-t">
              <td className="p-3 font-medium">{j.keyword}</td>
              <td className="p-3">
                <StatusBadge status={j.status} />
              </td>
              <td className="p-3 text-right">{j.totalTargets}</td>
              <td className="p-3 text-right">{j.generatedCount}</td>
              <td className="p-3 text-right">{j.publishedCount}</td>
              <td className="p-3 text-right text-red-600">{j.failedCount}</td>
              <td className="p-3 text-gray-500">{new Date(j.createdAt).toLocaleString("tr-TR")}</td>
            </tr>
          ))}
          {jobs.length === 0 && (
            <tr>
              <td colSpan={7} className="p-6 text-center text-gray-500">
                Kayıt bulunamadı
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
