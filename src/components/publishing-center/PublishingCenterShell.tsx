"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Calendar,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Layers,
  Loader2,
  Play,
  Radio,
  Send,
  XCircle,
} from "lucide-react";
import { fetchPageFactoryJson } from "@/lib/page-factory/fetch-json";

type Tab =
  | "dashboard"
  | "queue"
  | "calendar"
  | "published"
  | "drafts"
  | "archive"
  | "batch";

type Stats = {
  total: number;
  draft: number;
  review: number;
  approved: number;
  scheduled: number;
  published: number;
  archived: number;
  pending: number;
  publishedToday: number;
  scheduledThisWeek: number;
  avgQuality: number;
};

type QueueItem = {
  id: string;
  contentType: string;
  contentId: string;
  status: string;
  publishMode: string;
  priority: number;
  scheduledAt: string | null;
  publishedAt: string | null;
  title: string;
  slug?: string;
  createdAt: string;
};

type CalendarDay = {
  date: string;
  blogs: number;
  pages: number;
  geo: number;
  total: number;
};

export function PublishingCenterShell() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");

  const loadStats = useCallback(async () => {
    const d = await fetchPageFactoryJson<Stats>("/api/admin/publishing-center/stats");
    if (d.success && d.data) setStats(d.data);
  }, []);

  const loadQueue = useCallback(async (status?: string, contentType?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (contentType) params.set("contentType", contentType);
    const q = params.toString() ? `?${params}` : "";
    const d = await fetchPageFactoryJson<{ items: QueueItem[] }>(
      `/api/admin/publishing-center/queue${q}`
    );
    if (d.success && d.data) setItems(d.data.items || []);
  }, []);

  const loadCalendar = useCallback(async () => {
    const d = await fetchPageFactoryJson<{ calendar: CalendarDay[] }>(
      "/api/admin/publishing-center/calendar?days=30"
    );
    if (d.success && d.data) setCalendar(d.data.calendar || []);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (tab === "dashboard") loadStats();
    else if (tab === "calendar") loadCalendar();
    else if (tab === "published") loadQueue("PUBLISHED");
    else if (tab === "drafts") loadQueue("DRAFT");
    else if (tab === "archive") loadQueue("ARCHIVED");
    else if (tab === "queue" || tab === "batch") loadQueue(filterStatus || undefined, filterType || undefined);
  }, [tab, loadStats, loadQueue, loadCalendar, filterStatus, filterType]);

  const runAction = async (action: string, extra: Record<string, unknown> = {}) => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchPageFactoryJson("/api/admin/publishing-center/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!d.success) throw new Error(d.error);
      await loadStats();
      await loadQueue(filterStatus || undefined, filterType || undefined);
      setSelected([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "queue", label: "Kuyruk", icon: Layers },
    { id: "calendar", label: "Takvim", icon: Calendar },
    { id: "published", label: "Yayınlananlar", icon: CheckCircle2 },
    { id: "drafts", label: "Taslaklar", icon: Clock },
    { id: "archive", label: "Arşiv", icon: Archive },
    { id: "batch", label: "Toplu İşlemler", icon: Send },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Radio className="h-7 w-7 text-indigo-600" />
            Yayın Merkezi
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Merkezi yayın kuyruğu, zamanlama ve kalite onaylı otomatik yayın
          </p>
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
          ENA_YAYIN_MERKEZI_V1
        </span>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition ${
              tab === t.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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

      {tab === "dashboard" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: "Toplam", value: stats.total },
              { label: "Taslak", value: stats.draft },
              { label: "İncelemede", value: stats.review },
              { label: "Onaylı", value: stats.approved },
              { label: "Zamanlanmış", value: stats.scheduled },
              { label: "Yayında", value: stats.published },
            ].map((c) => (
              <div key={c.label} className="bg-white border rounded-xl p-4">
                <div className="text-xs text-gray-500">{c.label}</div>
                <div className="text-2xl font-bold">{c.value}</div>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-xl p-4">
              <div className="text-xs text-gray-500">Bugün yayınlanan</div>
              <div className="text-2xl font-bold text-emerald-600">{stats.publishedToday}</div>
            </div>
            <div className="bg-white border rounded-xl p-4">
              <div className="text-xs text-gray-500">Bu hafta zamanlanan</div>
              <div className="text-2xl font-bold text-blue-600">{stats.scheduledThisWeek}</div>
            </div>
            <div className="bg-white border rounded-xl p-4">
              <div className="text-xs text-gray-500">Ortalama kalite</div>
              <div className="text-2xl font-bold">{stats.avgQuality}</div>
            </div>
            <div className="bg-white border rounded-xl p-4">
              <div className="text-xs text-gray-500">Bekleyen</div>
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            </div>
          </div>
        </div>
      )}

      {(tab === "queue" || tab === "published" || tab === "drafts" || tab === "archive") && (
        <div className="space-y-4">
          {tab === "queue" && (
            <div className="flex flex-wrap gap-2">
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">Tüm tipler</option>
                <option value="BLOG">Blog</option>
                <option value="PAGE">Sayfa</option>
                <option value="PRODUCT">Ürün</option>
                <option value="RECOVERY_PAGE">Kurtarma</option>
              </select>
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Tüm durumlar</option>
                <option value="DRAFT">Taslak</option>
                <option value="REVIEW">İncelemede</option>
                <option value="APPROVED">Onaylı</option>
                <option value="SCHEDULED">Zamanlanmış</option>
              </select>
            </div>
          )}
          <QueueTable
            items={items}
            selected={selected}
            onToggle={toggleSelect}
            onApprove={(id) => runAction("approve", { queueId: id })}
            onPublish={(id) => runAction("publish", { queueId: id })}
            onReject={(id) => runAction("reject", { queueId: id })}
            onArchive={(id) => runAction("archive", { queueId: id })}
            loading={loading}
          />
        </div>
      )}

      {tab === "calendar" && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Tarih</th>
                <th className="text-right p-3">Blog</th>
                <th className="text-right p-3">Sayfa</th>
                <th className="text-right p-3">GEO</th>
                <th className="text-right p-3">Toplam</th>
              </tr>
            </thead>
            <tbody>
              {calendar
                .filter((d) => d.total > 0)
                .slice(0, 14)
                .map((d) => (
                  <tr key={d.date} className="border-t">
                    <td className="p-3 font-medium">
                      {new Date(d.date).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "long",
                      })}
                    </td>
                    <td className="p-3 text-right">{d.blogs}</td>
                    <td className="p-3 text-right">{d.pages}</td>
                    <td className="p-3 text-right">{d.geo}</td>
                    <td className="p-3 text-right font-bold">{d.total}</td>
                  </tr>
                ))}
              {calendar.filter((d) => d.total > 0).length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    Takvimde planlanmış yayın yok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "batch" && (
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Kuyruk sekmesinden öğe seçin ({selected.length} seçili)
          </p>
          <input
            type="datetime-local"
            className="border rounded-lg px-3 py-2 text-sm"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <BatchBtn
              label="Toplu Yayınla"
              icon={Play}
              disabled={loading || !selected.length}
              onClick={() => runAction("publishBatch", { queueIds: selected })}
            />
            <BatchBtn
              label="Toplu Onayla"
              icon={CheckCircle2}
              disabled={loading || !selected.length}
              onClick={() => runAction("approveBatch", { queueIds: selected })}
            />
            <BatchBtn
              label="Toplu Reddet"
              icon={XCircle}
              disabled={loading || !selected.length}
              onClick={() => runAction("rejectBatch", { queueIds: selected })}
            />
            <BatchBtn
              label="Toplu Arşivle"
              icon={Archive}
              disabled={loading || !selected.length}
              onClick={() => runAction("archiveBatch", { queueIds: selected })}
            />
            <BatchBtn
              label="Toplu Zamanla"
              icon={Clock}
              disabled={loading || !selected.length || !scheduleDate}
              onClick={() =>
                runAction("scheduleBatch", {
                  queueIds: selected,
                  scheduledAt: new Date(scheduleDate).toISOString(),
                })
              }
            />
          </div>
          <QueueTable
            items={items}
            selected={selected}
            onToggle={toggleSelect}
            onApprove={(id) => runAction("approve", { queueId: id })}
            onPublish={(id) => runAction("publish", { queueId: id })}
            onReject={(id) => runAction("reject", { queueId: id })}
            onArchive={(id) => runAction("archive", { queueId: id })}
            loading={loading}
            showCheckbox
          />
        </div>
      )}
    </div>
  );
}

function BatchBtn({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof Play;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-50"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function QueueTable({
  items,
  selected,
  onToggle,
  onApprove,
  onPublish,
  onReject,
  onArchive,
  loading,
  showCheckbox,
}: {
  items: QueueItem[];
  selected: string[];
  onToggle: (id: string) => void;
  onApprove: (id: string) => void;
  onPublish: (id: string) => void;
  onReject: (id: string) => void;
  onArchive: (id: string) => void;
  loading: boolean;
  showCheckbox?: boolean;
}) {
  return (
    <div className="bg-white border rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            {showCheckbox && <th className="p-3 w-8" />}
            <th className="text-left p-3">Başlık</th>
            <th className="text-left p-3">Tip</th>
            <th className="text-left p-3">Durum</th>
            <th className="text-left p-3">Mod</th>
            <th className="text-right p-3">Öncelik</th>
            <th className="p-3">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t">
              {showCheckbox && (
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(item.id)}
                    onChange={() => onToggle(item.id)}
                  />
                </td>
              )}
              <td className="p-3 font-medium max-w-xs truncate">{item.title}</td>
              <td className="p-3">{item.contentType}</td>
              <td className="p-3">
                <StatusBadge status={item.status} />
              </td>
              <td className="p-3 text-gray-500">{item.publishMode}</td>
              <td className="p-3 text-right">{item.priority}</td>
              <td className="p-3">
                <div className="flex gap-1 flex-wrap">
                  {item.status === "REVIEW" && (
                    <ActionBtn onClick={() => onApprove(item.id)} disabled={loading}>
                      Onayla
                    </ActionBtn>
                  )}
                  {["APPROVED", "DRAFT", "SCHEDULED"].includes(item.status) && (
                    <ActionBtn onClick={() => onPublish(item.id)} disabled={loading}>
                      Yayınla
                    </ActionBtn>
                  )}
                  <ActionBtn onClick={() => onReject(item.id)} disabled={loading}>
                    Red
                  </ActionBtn>
                  <ActionBtn onClick={() => onArchive(item.id)} disabled={loading}>
                    Arşiv
                  </ActionBtn>
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={showCheckbox ? 7 : 6} className="p-6 text-center text-gray-500">
                Kuyruk boş
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    REVIEW: "bg-amber-100 text-amber-800",
    APPROVED: "bg-blue-100 text-blue-700",
    SCHEDULED: "bg-violet-100 text-violet-700",
    PUBLISHED: "bg-emerald-100 text-emerald-700",
    ARCHIVED: "bg-slate-100 text-slate-600",
    REJECTED: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[status] || colors.DRAFT}`}>
      {status}
    </span>
  );
}
