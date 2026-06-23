"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Eye,
  Globe,
  Loader2,
  Play,
  RefreshCw,
  ShieldOff,
  Upload,
} from "lucide-react";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";

type Project = { id: string; name: string };

type Stats = {
  staged: number;
  publishedInternal: number;
  unpublished: number;
  archived: number;
  indexCount: number;
  indexable: number;
  noindexCount: number;
  noindex: number;
  avgSeoScore: number;
  avgAeoScore: number;
  avgGeoScore: number;
  avgPublishScore: number;
  total: number;
};

type PublishedPage = {
  id: string;
  draftId: string;
  title: string;
  slug: string;
  path: string;
  status: string;
  robots: string;
  publishScore: number;
  seoScore: number;
  aeoScore: number;
  geoScore: number;
  blueprintType?: string;
  generationSource?: string;
  updatedAt: string;
  publishedAt: string | null;
  createdAt: string;
};

type PublishPreview = {
  eligible: boolean;
  path: string;
  robots: string;
  blockers: string[];
  warnings: string[];
  gateStatus: string;
  draftStatus: string;
};

type Props = {
  projects: Project[];
  mode: "admin" | "dealer";
  defaultProjectId?: string;
};

export function PageFactoryPublishedPagesTab({ projects, mode, defaultProjectId }: Props) {
  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [statusFilter, setStatusFilter] = useState("");
  const [draftIdInput, setDraftIdInput] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [pages, setPages] = useState<PublishedPage[]>([]);
  const [preview, setPreview] = useState<PublishPreview | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ stats: "true", limit: "30" });
      if (projectId) q.set("projectId", projectId);
      if (statusFilter) q.set("status", statusFilter);
      const r = await fetch(`/api/page-factory/published-pages?${q}`);
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Yüklenemedi");
      setStats(d.data.stats);
      setPages(d.data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [projectId, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (defaultProjectId) setProjectId(defaultProjectId);
  }, [defaultProjectId]);

  const runPreview = async () => {
    if (!draftIdInput.trim()) {
      setError("Draft ID girin");
      return;
    }
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const r = await fetch(`/api/page-factory/drafts/${draftIdInput.trim()}/publish/preview`, {
        method: "POST",
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Önizleme başarısız");
      setPreview(d.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Önizleme başarısız");
    } finally {
      setLoading(false);
    }
  };

  const publishDraft = async (draftId: string) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const r = await fetch(`/api/page-factory/drafts/${draftId}/publish/internal`, { method: "POST" });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Yayın başarısız");
      setMessage(`Yayınlandı: ${d.data.path}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yayın başarısız");
    } finally {
      setLoading(false);
    }
  };

  const bulkPublish = async () => {
    if (!projectId) {
      setError("Toplu yayın için proje seçin");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const r = await fetch("/api/page-factory/publish/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, limit: mode === "admin" ? 100 : 50 }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Toplu yayın başarısız");
      setMessage(`${d.data.published} yeni, ${d.data.updated} güncelleme, ${d.data.skipped} atlandı`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Toplu yayın başarısız");
    } finally {
      setLoading(false);
    }
  };

  const setRobots = async (pageId: string, robots: "index,follow" | "noindex,follow") => {
    setLoading(true);
    try {
      const r = await fetch(`/api/page-factory/published-pages/${pageId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-robots", robots }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Robots güncellenemedi");
    } finally {
      setLoading(false);
    }
  };

  const republish = async (pageId: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/page-factory/published-pages/${pageId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "republish" }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setMessage(`Güncellendi: ${d.data.path}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Re-publish başarısız");
    } finally {
      setLoading(false);
    }
  };

  const unpublish = async (pageId: string) => {
    if (!confirm("Bu sayfa yayından kaldırılacak. Emin misiniz?")) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/page-factory/published-pages/${pageId}/unpublish`, { method: "POST" });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Başarısız");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Başarısız");
    } finally {
      setLoading(false);
    }
  };

  const viewDetail = async (pageId: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/page-factory/published-pages/${pageId}`);
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      setDetail(d.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Detay alınamadı");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-emerald-50/50 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Globe size={16} className="text-emerald-600" />
            Published Pages — İç Yayın Motoru V1
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            READY_TO_PUBLISH draftları iç sistemde yayınlanabilir sayfa kayıtlarına dönüştür
          </p>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {message && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Proje">
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Tümü</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Tümü</option>
                <option value="STAGED">STAGED</option>
                <option value="PUBLISHED_INTERNAL">PUBLISHED_INTERNAL</option>
                <option value="UNPUBLISHED">UNPUBLISHED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </Field>
            <Field label="Draft ID (preview/publish)">
              <input
                value={draftIdInput}
                onChange={(e) => setDraftIdInput(e.target.value)}
                placeholder="cuid..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
              />
            </Field>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={runPreview}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                Preview
              </button>
              <button
                type="button"
                onClick={() => publishDraft(draftIdInput.trim())}
                disabled={loading || !draftIdInput.trim()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Upload size={14} /> İç Yayın
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={bulkPublish}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <Play size={14} /> Toplu İç Yayına Al
            </button>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50"
            >
              <RefreshCw size={14} /> Yenile
            </button>
            <a
              href="/pf-index"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50"
            >
              <Eye size={14} /> Index Görünümü
            </a>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Published Internal" value={stats.publishedInternal} color="text-emerald-600" />
          <StatCard label="Staged" value={stats.staged} />
          <StatCard label="Unpublished" value={stats.unpublished} color="text-amber-600" />
          <StatCard label="Archived" value={stats.archived} color="text-gray-500" />
          <StatCard label="Indexable" value={stats.indexable ?? stats.indexCount} color="text-blue-600" />
          <StatCard label="Noindex" value={stats.noindex ?? stats.noindexCount} color="text-orange-600" />
          <StatCard label="Ort. SEO" value={stats.avgSeoScore} />
          <StatCard label="Ort. AEO / GEO / Publish" value={`${stats.avgAeoScore} / ${stats.avgGeoScore} / ${stats.avgPublishScore}`} small />
        </div>
      )}

      {preview && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 text-sm space-y-2">
          <p className="font-medium">Publish Preview — {preview.eligible ? "✓ Uygun" : "✗ Uygun değil"}</p>
          <p className="text-xs text-gray-600">Path: <code>{preview.path}</code> · Robots: {preview.robots}</p>
          <p className="text-xs text-gray-600">Draft: {preview.draftStatus} · Gate: {preview.gateStatus}</p>
          {preview.blockers.map((b) => (
            <p key={b} className="text-xs text-red-700">{b}</p>
          ))}
          {preview.warnings.map((w) => (
            <p key={w} className="text-xs text-amber-700">{w}</p>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-3">
          <h3 className="text-sm font-semibold text-gray-800">Yayınlanan Sayfalar ({pages.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Başlık</th>
                <th className="px-4 py-2 text-left">Path</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Robots</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Source</th>
                <th className="px-4 py-2 text-right">Scores</th>
                <th className="px-4 py-2 text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {pages.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Henüz yayınlanmış sayfa yok</td></tr>
              ) : (
                pages.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 max-w-[200px] truncate">{p.title}</td>
                    <td className="px-4 py-2 font-mono text-[10px]">
                      <a href={`/pf${p.path}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        {p.path}
                      </a>
                    </td>
                    <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-2">{p.robots}</td>
                    <td className="px-4 py-2">{p.blueprintType || "—"}</td>
                    <td className="px-4 py-2">{p.generationSource || "—"}</td>
                    <td className="px-4 py-2 text-right text-[10px]">{p.seoScore}/{p.aeoScore}/{p.geoScore}/{p.publishScore}</td>
                    <td className="px-4 py-2 text-right space-x-1">
                      <button type="button" onClick={() => viewDetail(p.id)} className="text-blue-600 hover:underline">Detay</button>
                      {p.status === "PUBLISHED_INTERNAL" && (
                        <>
                          <button type="button" onClick={() => republish(p.id)} className="text-violet-600 hover:underline">Güncelle</button>
                          {p.robots.includes("noindex") ? (
                            <button type="button" onClick={() => setRobots(p.id, "index,follow")} className="text-emerald-600 hover:underline">Index</button>
                          ) : (
                            <button type="button" onClick={() => setRobots(p.id, "noindex,follow")} className="text-orange-600 hover:underline">Noindex</button>
                          )}
                          <button type="button" onClick={() => unpublish(p.id)} className="text-red-600 hover:underline inline-flex items-center gap-0.5">
                            <ShieldOff size={10} /> Kaldır
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-gray-900">{String(detail.title)}</h3>
              <button type="button" onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <pre className="text-[10px] bg-gray-50 p-3 rounded-lg overflow-x-auto">{JSON.stringify(detail, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-600 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ label, value, color, small }: { label: string; value: string | number; color?: string; small?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`${small ? "text-xs" : "text-lg font-bold"} ${color || "text-gray-900"}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PUBLISHED_INTERNAL: "bg-emerald-100 text-emerald-700",
    STAGED: "bg-blue-100 text-blue-700",
    UNPUBLISHED: "bg-amber-100 text-amber-700",
    ARCHIVED: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[status] || colors.STAGED}`}>
      {status}
    </span>
  );
}
