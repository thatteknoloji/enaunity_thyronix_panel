"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  GitBranch,
  Loader2,
  Play,
  RefreshCw,
  Shield,
  Sparkles,
  FileText,
} from "lucide-react";
import { PIPELINE_GENERATION_SOURCE_OPTIONS } from "@/lib/page-factory/pipeline/pipeline-source-filter";
import type { PipelineMode } from "@/lib/page-factory/pipeline/pipeline-types";

type Project = { id: string; name: string };

type PreviewResult = {
  totalBlueprints: number;
  totalCandidates: number;
  needsAeo: number;
  needsDraft: number;
  needsGate: number;
  readyToPublishEstimate: number;
  gatePassedEstimate: number;
  gateWarningEstimate: number;
  gateBlockedEstimate: number;
  publishEstimate?: number;
  sampleBlueprintIds: string[];
  warnings: string[];
  planOnly?: boolean;
  generationSource?: string;
};

type RunResult = {
  jobId: string;
  totalBlueprints: number;
  processed?: number;
  skipped?: number;
  aeoGenerated: number;
  draftsGenerated: number;
  gatePassed: number;
  gateWarning: number;
  gateBlocked: number;
  pagesPublished?: number;
  pagesUpdated?: number;
  publishSkipped?: number;
  errorCount: number;
  dryRun: boolean;
  warnings: string[];
  errors: Array<{ blueprintId: string; message: string }>;
};

type PipelineJob = {
  id: string;
  projectId: string | null;
  status: string;
  totalBlueprints: number;
  aeoGenerated: number;
  draftsGenerated: number;
  gatePassed: number;
  gateWarning: number;
  gateBlocked: number;
  pagesPublished: number;
  errorCount: number;
  createdAt: string;
};

type Props = {
  projects: Project[];
  mode: "admin" | "dealer";
  defaultProjectId?: string;
};

const BLUEPRINT_KINDS = [
  "PRODUCT_DETAIL",
  "PRODUCT_CATEGORY",
  "PRODUCT_INTENT",
  "PRODUCT_GEO",
  "PRODUCT_FAQ",
];

export function PageFactoryPipelineTab({ projects, mode, defaultProjectId }: Props) {
  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [generationSource, setGenerationSource] = useState<string>("ALL");
  const [blueprintType, setBlueprintType] = useState("");
  const [minQualityScore, setMinQualityScore] = useState(0);
  const [minAeoScore, setMinAeoScore] = useState(0);
  const [onlyWithoutAeo, setOnlyWithoutAeo] = useState(false);
  const [onlyWithoutDraft, setOnlyWithoutDraft] = useState(false);
  const [onlyWithoutGate, setOnlyWithoutGate] = useState(false);
  const [limit, setLimit] = useState(mode === "admin" ? 100 : 50);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [jobs, setJobs] = useState<PipelineJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildBody = (pipelineMode: PipelineMode) => ({
    projectId: projectId || undefined,
    generationSource: generationSource || "ALL",
    blueprintType: blueprintType || undefined,
    minQualityScore: minQualityScore > 0 ? minQualityScore : undefined,
    minAeoScore: minAeoScore || undefined,
    onlyWithoutAeo,
    onlyWithoutDraft,
    onlyWithoutGate,
    limit,
    mode: pipelineMode,
  });

  const loadJobs = useCallback(async () => {
    try {
      const r = await fetch("/api/page-factory/pipeline/jobs?limit=10");
      const d = await r.json();
      if (d.success) setJobs(d.data.items || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (defaultProjectId) setProjectId(defaultProjectId);
  }, [defaultProjectId]);

  const runPreview = async () => {
    if (!projectId) {
      setError("Proje seçin");
      return;
    }
    setLoading(true);
    setError(null);
    setPreview(null);
    setResult(null);
    try {
      const r = await fetch("/api/page-factory/pipeline/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody("full")),
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

  const runPipeline = async (pipelineMode: PipelineMode) => {
    if (!projectId) {
      setError("Proje seçin");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/page-factory/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(pipelineMode)),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Pipeline başarısız");
      setResult(d.data);
      await loadJobs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pipeline başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-indigo-50/50 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <GitBranch size={16} className="text-indigo-600" />
            AEO Bulk + Draft Pipeline V1
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            AEO → Draft → Gate → Published Page tam zincir
          </p>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Proje *">
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">— Seçin —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Generation Source">
              <select
                value={generationSource}
                onChange={(e) => setGenerationSource(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {PIPELINE_GENERATION_SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Blueprint Type">
              <select
                value={blueprintType}
                onChange={(e) => setBlueprintType(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Tümü</option>
                {BLUEPRINT_KINDS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </Field>
            <Field label="Min Quality Score">
              <input
                type="number"
                min={0}
                max={100}
                value={minQualityScore}
                onChange={(e) => setMinQualityScore(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Min AEO Score">
              <input
                type="number"
                min={0}
                max={100}
                value={minAeoScore}
                onChange={(e) => setMinAeoScore(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label={`Limit (max ${mode === "admin" ? 1000 : 100})`}>
              <input
                type="number"
                min={1}
                max={mode === "admin" ? 1000 : 100}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={onlyWithoutAeo} onChange={(e) => setOnlyWithoutAeo(e.target.checked)} />
              Sadece AEO olmayan
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={onlyWithoutDraft} onChange={(e) => setOnlyWithoutDraft(e.target.checked)} />
              Sadece draft olmayan
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={onlyWithoutGate} onChange={(e) => setOnlyWithoutGate(e.target.checked)} />
              Sadece gate olmayan
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <ActionBtn icon={Eye} label="Önizle" onClick={runPreview} loading={loading} variant="outline" />
            <ActionBtn icon={Play} label="Pipeline Çalıştır" onClick={() => runPipeline("full")} loading={loading} />
            <ActionBtn icon={Sparkles} label="Sadece AEO" onClick={() => runPipeline("aeo_only")} loading={loading} variant="violet" />
            <ActionBtn icon={FileText} label="Sadece Draft" onClick={() => runPipeline("draft_only")} loading={loading} variant="blue" />
            <ActionBtn icon={Shield} label="Sadece Gate" onClick={() => runPipeline("gate_only")} loading={loading} variant="emerald" />
          </div>
        </div>
      </div>

      {preview && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Eye size={14} className="text-indigo-600" />
            Önizleme
          </h3>
          {preview.planOnly && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              10K+ aday — plan-only uyarısı
            </div>
          )}
          {preview.warnings.map((w) => (
            <div key={w} className="text-xs text-amber-700">{w}</div>
          ))}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Seçilen Blueprint" value={preview.totalBlueprints} />
            <StatCard label="Projede Toplam" value={preview.totalCandidates} color="text-gray-600" />
            <StatCard label="Kaynak Filtresi" value={preview.generationSource || "ALL"} small />
            <StatCard label="AEO üretilecek" value={preview.needsAeo} color="text-violet-600" />
            <StatCard label="Draft üretilecek" value={preview.needsDraft} color="text-blue-600" />
            <StatCard label="Gate çalışacak" value={preview.needsGate} color="text-emerald-600" />
            <StatCard label="Publish tahmini" value={preview.publishEstimate ?? 0} color="text-emerald-700" />
            <StatCard label="Gate passed (tahmini)" value={preview.gatePassedEstimate} />
            <StatCard label="Gate warning (tahmini)" value={preview.gateWarningEstimate} color="text-amber-600" />
            <StatCard label="Gate blocked (tahmini)" value={preview.gateBlockedEstimate} color="text-red-600" />
            <StatCard label="Ready to publish (tahmini)" value={preview.readyToPublishEstimate} color="text-green-600" />
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-green-200 bg-green-50/30 p-6 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green-600" />
            Pipeline Sonucu {result.dryRun ? "(dry-run)" : ""}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <StatCard label="Job ID" value={result.jobId.slice(0, 12) + "…"} small />
            <StatCard label="Blueprint" value={result.totalBlueprints} />
            <StatCard label="AEO üretildi" value={result.aeoGenerated} color="text-violet-600" />
            <StatCard label="Draft üretildi" value={result.draftsGenerated} color="text-blue-600" />
            <StatCard label="Gate passed" value={result.gatePassed} color="text-green-600" />
            <StatCard label="Gate warning" value={result.gateWarning} color="text-amber-600" />
            <StatCard label="Gate blocked" value={result.gateBlocked} color="text-red-600" />
            <StatCard label="Published" value={result.pagesPublished ?? 0} color="text-emerald-700" />
            <StatCard label="Publish güncelleme" value={result.pagesUpdated ?? 0} />
            <StatCard label="Publish atlandı" value={result.publishSkipped ?? 0} color="text-gray-500" />
            <StatCard label="Hata" value={result.errorCount} color="text-red-600" />
          </div>
          {result.errors.length > 0 && (
            <div className="text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto">
              {result.errors.map((e) => (
                <div key={e.blueprintId}>{e.blueprintId}: {e.message}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Job Geçmişi</h3>
          <button type="button" onClick={loadJobs} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <RefreshCw size={12} /> Yenile
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Tarih</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Blueprint</th>
                <th className="px-4 py-2 text-right">AEO</th>
                <th className="px-4 py-2 text-right">Draft</th>
                <th className="px-4 py-2 text-right">Gate ✓</th>
                <th className="px-4 py-2 text-right">Published</th>
                <th className="px-4 py-2 text-right">Hata</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">Henüz job yok</td></tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2">{new Date(j.createdAt).toLocaleString("tr-TR")}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={j.status} />
                    </td>
                    <td className="px-4 py-2 text-right">{j.totalBlueprints}</td>
                    <td className="px-4 py-2 text-right">{j.aeoGenerated}</td>
                    <td className="px-4 py-2 text-right">{j.draftsGenerated}</td>
                    <td className="px-4 py-2 text-right">{j.gatePassed}</td>
                    <td className="px-4 py-2 text-right">{j.pagesPublished ?? 0}</td>
                    <td className="px-4 py-2 text-right">{j.errorCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
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
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`${small ? "text-xs font-mono" : "text-lg font-bold"} ${color || "text-gray-900"}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    COMPLETED: "bg-green-100 text-green-700",
    RUNNING: "bg-blue-100 text-blue-700",
    FAILED: "bg-red-100 text-red-700",
    PENDING: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[status] || colors.PENDING}`}>
      {status}
    </span>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  loading,
  variant = "primary",
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
  loading: boolean;
  variant?: "primary" | "outline" | "violet" | "blue" | "emerald";
}) {
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    outline: "border border-gray-200 text-gray-700 hover:bg-gray-50",
    violet: "bg-violet-600 text-white hover:bg-violet-700",
    blue: "bg-blue-600 text-white hover:bg-blue-700",
    emerald: "bg-emerald-600 text-white hover:bg-emerald-700",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50 ${styles[variant]}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
      {label}
    </button>
  );
}
