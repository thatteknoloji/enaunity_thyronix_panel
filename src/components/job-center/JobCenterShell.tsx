"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";

type Tab = "overview" | "waiting" | "running" | "completed" | "failed" | "cancelled";

type JobLog = {
  id: string;
  level: string;
  message: string;
  createdAt: string;
};

type JobItem = {
  id: string;
  jobType: string;
  entityType: string;
  entityId: string;
  status: string;
  priority: string;
  progress: number;
  totalSteps: number;
  completedSteps: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastHeartbeat: string | null;
  estimatedRemainingSeconds: number | null;
  currentStep: string;
  currentMessage: string;
  errorMessage: string;
  retryCount: number;
  maxRetry: number;
  logs?: JobLog[];
};

type DashboardStats = {
  active: number;
  waiting: number;
  avgDurationSeconds: number;
  successRate: number;
  lastError: {
    id: string;
    jobType: string;
    errorMessage: string;
    finishedAt: string | null;
  } | null;
  retryWaiting: number;
  cpuWaiting: number;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Genel Bakış" },
  { id: "waiting", label: "Bekleyen" },
  { id: "running", label: "Çalışan" },
  { id: "completed", label: "Tamamlanan" },
  { id: "failed", label: "Hatalı" },
  { id: "cancelled", label: "İptal Edilen" },
];

const STATUS_FOR_TAB: Record<Exclude<Tab, "overview">, string> = {
  waiting: "WAITING",
  running: "RUNNING,PAUSED",
  completed: "COMPLETED",
  failed: "FAILED",
  cancelled: "CANCELLED",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  BLOG_GENERATION: "Blog Üretimi",
  PAGE_GENERATION: "Sayfa Üretimi",
  GEO_GENERATION: "GEO Üretimi",
  RECOVERY_GENERATION: "Link Kurtarma",
  AI_REWRITE: "AI Rewrite",
  CONTENT_AUDIT: "İçerik Denetimi",
  CONTENT_PLAN: "İçerik Planı",
  PUBLISH: "Yayın",
  BATCH_PUBLISH: "Toplu Yayın",
  IMPORT: "İçe Aktarma",
  EXPORT: "Dışa Aktarma",
};

const STATUS_LABELS: Record<string, string> = {
  WAITING: "Bekliyor",
  RUNNING: "Çalışıyor",
  PAUSED: "Duraklatıldı",
  COMPLETED: "Tamamlandı",
  FAILED: "Hatalı",
  CANCELLED: "İptal",
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800",
  HIGH: "bg-orange-100 text-orange-800",
  NORMAL: "bg-blue-100 text-blue-800",
  LOW: "bg-gray-100 text-gray-600",
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}d ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}s ${m % 60}d`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function statusIcon(status: string) {
  switch (status) {
    case "RUNNING":
      return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
    case "COMPLETED":
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case "FAILED":
      return <XCircle className="w-4 h-4 text-red-600" />;
    case "CANCELLED":
      return <XCircle className="w-4 h-4 text-gray-500" />;
    case "PAUSED":
      return <Pause className="w-4 h-4 text-amber-600" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
}

export function JobCenterShell() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [selected, setSelected] = useState<JobItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/admin/jobs?stats=1");
    const d = await res.json();
    if (d.success) setStats(d.data);
  }, []);

  const loadJobs = useCallback(async (currentTab: Tab) => {
    if (currentTab === "overview") return;
    setLoading(true);
    try {
      const status = STATUS_FOR_TAB[currentTab];
      const res = await fetch(`/api/admin/jobs?status=${status}&limit=100`);
      const d = await res.json();
      if (d.success) setJobs(d.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/jobs/${id}`);
    const d = await res.json();
    if (d.success) setSelected(d.data);
  }, []);

  const refresh = useCallback(async () => {
    await loadStats();
    if (tab !== "overview") await loadJobs(tab);
    if (selected) await loadDetail(selected.id);
  }, [loadStats, loadJobs, tab, selected, loadDetail]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (tab === "overview") return;
    void loadJobs(tab);
  }, [tab, loadJobs]);

  useEffect(() => {
    const timer = setInterval(() => {
      void refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  const runAction = async (action: string) => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/jobs/${selected.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (d.success) {
        setSelected(d.data);
        await refresh();
      } else {
        alert(d.error || "İşlem başarısız");
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Görev Merkezi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Uzun süren içerik işlemleri arka planda kuyrukta çalışır — HTTP 504 riski azalır.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              tab === t.id
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Activity className="w-5 h-5 text-blue-600" />}
            label="Aktif Görev"
            value={String(stats.active)}
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            label="Bekleyen"
            value={String(stats.waiting)}
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
            label="Başarı Oranı (24s)"
            value={`%${stats.successRate}`}
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-purple-600" />}
            label="Ort. Süre (24s)"
            value={formatDuration(stats.avgDurationSeconds)}
          />
          <StatCard
            icon={<Loader2 className="w-5 h-5 text-indigo-600" />}
            label="CPU / Kuyruk"
            value={String(stats.cpuWaiting)}
          />
          <StatCard
            icon={<RotateCcw className="w-5 h-5 text-orange-600" />}
            label="Retry Bekleyen"
            value={String(stats.retryWaiting)}
          />
          {stats.lastError && (
            <div className="col-span-2 md:col-span-4 p-4 border rounded-lg bg-red-50 border-red-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">Son Hata</p>
                  <p className="text-xs text-red-700 mt-1">
                    {JOB_TYPE_LABELS[stats.lastError.jobType] || stats.lastError.jobType}{" "}
                    — {formatTime(stats.lastError.finishedAt)}
                  </p>
                  <p className="text-sm text-red-800 mt-1">{stats.lastError.errorMessage}</p>
                  <button
                    type="button"
                    className="text-xs text-red-700 underline mt-2"
                    onClick={() => {
                      void loadDetail(stats.lastError!.id);
                    }}
                  >
                    Detayı gör
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab !== "overview" && (
        <div className="border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Yükleniyor…</div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">Görev bulunamadı</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Tür</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Öncelik</th>
                  <th className="px-4 py-3">İlerleme</th>
                  <th className="px-4 py-3">Mesaj</th>
                  <th className="px-4 py-3">Oluşturulma</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => void loadDetail(job.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{JOB_TYPE_LABELS[job.jobType] || job.jobType}</div>
                      <div className="text-xs text-gray-400 truncate max-w-[180px]">{job.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {statusIcon(job.status)}
                        {STATUS_LABELS[job.status] || job.status}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          PRIORITY_COLORS[job.priority] || "bg-gray-100"
                        }`}
                      >
                        {job.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${Math.min(100, job.progress)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{Math.round(job.progress)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[240px] truncate">
                      {job.currentMessage || job.currentStep || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatTime(job.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between p-5 border-b sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-semibold">
                  {JOB_TYPE_LABELS[selected.jobType] || selected.jobType}
                </h2>
                <p className="text-xs text-gray-400 mt-1 font-mono">{selected.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="Durum" value={STATUS_LABELS[selected.status] || selected.status} />
                <InfoRow label="Öncelik" value={selected.priority} />
                <InfoRow label="İlerleme" value={`${Math.round(selected.progress)}%`} />
                <InfoRow
                  label="Adımlar"
                  value={`${selected.completedSteps}/${selected.totalSteps || "—"}`}
                />
                <InfoRow label="Retry" value={`${selected.retryCount}/${selected.maxRetry}`} />
                <InfoRow label="Oluşturan" value={selected.createdBy || "—"} />
                <InfoRow label="Başlangıç" value={formatTime(selected.startedAt)} />
                <InfoRow label="Bitiş" value={formatTime(selected.finishedAt)} />
              </div>

              {selected.currentMessage && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-900">
                  {selected.currentStep && (
                    <span className="font-medium">{selected.currentStep}: </span>
                  )}
                  {selected.currentMessage}
                </div>
              )}

              {selected.errorMessage && (
                <div className="p-3 bg-red-50 rounded-lg text-sm text-red-800">
                  {selected.errorMessage}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {selected.status === "RUNNING" && (
                  <ActionBtn
                    icon={<Pause className="w-4 h-4" />}
                    label="Duraklat"
                    loading={actionLoading}
                    onClick={() => void runAction("pause")}
                  />
                )}
                {(selected.status === "PAUSED" || selected.status === "WAITING") && (
                  <ActionBtn
                    icon={<Play className="w-4 h-4" />}
                    label="Devam"
                    loading={actionLoading}
                    onClick={() => void runAction("resume")}
                  />
                )}
                {selected.status === "FAILED" && selected.retryCount < selected.maxRetry && (
                  <ActionBtn
                    icon={<RotateCcw className="w-4 h-4" />}
                    label="Yeniden Dene"
                    loading={actionLoading}
                    onClick={() => void runAction("retry")}
                  />
                )}
                {!["COMPLETED", "CANCELLED"].includes(selected.status) && (
                  <ActionBtn
                    icon={<XCircle className="w-4 h-4" />}
                    label="İptal"
                    loading={actionLoading}
                    variant="danger"
                    onClick={() => void runAction("cancel")}
                  />
                )}
              </div>

              {selected.logs && selected.logs.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Log</h3>
                  <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                    {selected.logs.map((log) => (
                      <div key={log.id} className="px-3 py-2 text-sm flex gap-3">
                        <span className="text-xs text-gray-400 shrink-0 font-mono">
                          {formatTime(log.createdAt)}
                        </span>
                        <span
                          className={
                            log.level === "ERROR"
                              ? "text-red-700"
                              : log.level === "WARN"
                                ? "text-amber-700"
                                : "text-gray-700"
                          }
                        >
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  loading,
  variant = "default",
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  loading: boolean;
  variant?: "default" | "danger";
  onClick: () => void;
}) {
  const cls =
    variant === "danger"
      ? "border-red-200 text-red-700 hover:bg-red-50"
      : "border-gray-200 hover:bg-gray-50";
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg ${cls} disabled:opacity-50`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}
