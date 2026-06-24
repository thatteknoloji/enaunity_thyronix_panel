"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Star,
  Store,
  FileText,
  Plus,
  ChevronUp,
  ChevronDown,
  ArrowUpRight,
  Clock,
  RefreshCw,
  Rocket,
  Radio,
  Orbit,
  Map,
  Shield,
  Link2,
  Layers,
} from "lucide-react";
import { toAdminUrl } from "@/lib/auth/admin-access";

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const AUTO_REFRESH_SEC = 30;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.23, 1, 0.32, 1] as const },
  }),
};

const STATUS_LABELS: Record<string, { label: string; color: string; glow: string }> = {
  pending_approval: { label: "Onay Bekliyor", color: "bg-amber-400", glow: "shadow-amber-400/40" },
  approved: { label: "Onaylandı", color: "bg-blue-400", glow: "shadow-blue-400/40" },
  pending: { label: "Beklemede", color: "bg-yellow-400", glow: "shadow-yellow-400/40" },
  shipped: { label: "Kargoda", color: "bg-purple-400", glow: "shadow-purple-400/40" },
  delivered: { label: "Teslim", color: "bg-emerald-400", glow: "shadow-emerald-400/40" },
  cancelled: { label: "İptal", color: "bg-red-400", glow: "shadow-red-400/40" },
};

function useLiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function Starfield() {
  const stars = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        id: i,
        left: `${(i * 17 + 7) % 100}%`,
        top: `${(i * 23 + 11) % 100}%`,
        size: i % 3 === 0 ? 2 : 1,
        delay: (i % 5) * 0.4,
      })),
    [],
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {stars.map((s) => (
        <motion.span
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size }}
          animate={{ opacity: [0.15, 0.9, 0.15] }}
          transition={{ duration: 2.5 + s.delay, repeat: Infinity, ease: "easeInOut", delay: s.delay }}
        />
      ))}
    </div>
  );
}

function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none"
      initial={{ top: "0%" }}
      animate={{ top: ["0%", "100%"] }}
      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      aria-hidden
    />
  );
}

function SyncCountdown({ seconds, refreshing }: { seconds: number; refreshing: boolean }) {
  const pct = ((AUTO_REFRESH_SEC - seconds) / AUTO_REFRESH_SEC) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-10 w-10">
        <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36" aria-hidden>
          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke={refreshing ? "#34d399" : "#22d3ee"}
            strokeWidth="2"
            strokeDasharray={`${pct * 0.94} 100`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums text-cyan-300">
          {refreshing ? "…" : seconds}
        </span>
      </div>
      <div className="text-left hidden sm:block">
        <p className="text-[10px] uppercase tracking-widest text-cyan-300/70">Otomatik senkron</p>
        <p className="text-xs text-white/60">{refreshing ? "Veri güncelleniyor…" : `${seconds}s sonra yenileme`}</p>
      </div>
    </div>
  );
}

function AnimatedNumber({
  value,
  format,
  animateKey,
}: {
  value: number;
  format?: (n: number) => string;
  animateKey?: string | number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: false, margin: "-20px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    setDisplay(0);
    const duration = 900;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value, animateKey]);

  const text = format ? format(display) : display.toLocaleString("tr-TR");
  return (
    <span ref={ref} className="tabular-nums">
      {text}
    </span>
  );
}

function formatOrderStatus(status: string) {
  return STATUS_LABELS[status]?.label || status;
}

function MissionEmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: typeof Package;
  title: string;
  subtitle: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="relative py-10 px-4 text-center overflow-hidden">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-dashed border-cyan-200/60 pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-cyan-100/80 to-violet-100/80 blur-sm pointer-events-none"
      />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-cyan-50 border border-cyan-100 shadow-inner"
      >
        <Icon size={24} className="text-cyan-600" />
      </motion.div>
      <p className="relative text-sm font-semibold text-gray-700">{title}</p>
      <p className="relative text-xs text-gray-400 mt-1 max-w-xs mx-auto">{subtitle}</p>
      {action && (
        <Link
          href={action.href}
          className="relative inline-flex items-center gap-1 mt-4 text-xs font-semibold text-cyan-600 hover:text-cyan-700"
        >
          {action.label} <ArrowUpRight size={12} />
        </Link>
      )}
    </div>
  );
}

function EmptyChartBars({ currentMonth }: { currentMonth: number }) {
  return (
    <div className="flex items-end justify-between gap-1.5 h-44 relative">
      <div
        className="absolute inset-0 opacity-[0.35] pointer-events-none bg-[linear-gradient(rgba(148,163,184,0.15)_1px,transparent_1px)] bg-[size:100%_28px]"
        aria-hidden
      />
      {MONTHS.map((m, i) => (
        <div key={m} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end relative z-10">
          <motion.div
            animate={{ height: ["12%", "18%", "12%"], opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.08 }}
            className={`w-full rounded-t-md ${
              i === currentMonth
                ? "bg-gradient-to-t from-cyan-300/50 to-violet-300/50"
                : "bg-gradient-to-t from-slate-200/60 to-slate-300/40"
            }`}
            style={{ height: "14%" }}
          />
          <span className={`text-[10px] font-semibold ${i === currentMonth ? "text-cyan-500" : "text-gray-300"}`}>{m}</span>
        </div>
      ))}
      <motion.div
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-x-0 bottom-8 text-center text-[10px] uppercase tracking-widest text-gray-400 pointer-events-none"
      >
        Telemetri bekleniyor
      </motion.div>
    </div>
  );
}

function EmptyStatusRing() {
  return (
    <div className="relative flex items-center justify-center py-8">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute w-28 h-28 rounded-full border-2 border-dashed border-slate-200"
      />
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="relative w-20 h-20 rounded-full bg-gradient-to-br from-slate-50 to-cyan-50 border border-slate-100 flex flex-col items-center justify-center"
      >
        <span className="text-2xl font-black text-gray-300">0</span>
        <span className="text-[9px] uppercase tracking-wider text-gray-400">Kayıt</span>
      </motion.div>
      <motion.div
        animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute w-32 h-32 rounded-full border border-cyan-200/40 pointer-events-none"
      />
    </div>
  );
}

function MissionPanel({
  children,
  title,
  subtitle,
  action,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={`relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-cyan-500 via-violet-500 to-emerald-500 opacity-80" />
      <div className="p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </div>
    </motion.div>
  );
}

export default function AdminDashboardOverview() {
  const liveNow = useLiveClock();
  const todayLabel = liveNow.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  const timeLabel = liveNow.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const currentMonth = liveNow.getMonth();

  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    users: 0,
    revenue: 0,
    applications: 0,
    lowStock: 0,
    pendingApprovals: 0,
    pendingReturns: 0,
    pendingReviews: 0,
    lastMonthRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [monthlyRevenue, setMonthlyRevenue] = useState<number[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topDealers, setTopDealers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [secondsToRefresh, setSecondsToRefresh] = useState(AUTO_REFRESH_SEC);
  const [accountingHealth, setAccountingHealth] = useState<{
    hasDivergence: boolean;
    divergenceCount: number;
  } | null>(null);
  const [contentHub, setContentHub] = useState({
    plans: 0,
    blogs: 0,
    pages: 0,
    queuePending: 0,
    published: 0,
    qualityPending: 0,
    recoveredLinks: 0,
  });

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [dash, health, contentOps, blogStats, legacyStats, pageStats] = await Promise.all([
        fetch("/api/admin/dashboard/stats", { credentials: "include" }).then((r) => r.json()),
        fetch("/api/admin/accounting/health", { credentials: "include" })
          .then((r) => r.json())
          .catch(() => null),
        fetch("/api/admin/content-operations/dashboard", { credentials: "include" })
          .then((r) => r.json())
          .catch(() => null),
        fetch("/api/admin/blog-engine/stats", { credentials: "include" })
          .then((r) => r.json())
          .catch(() => null),
        fetch("/api/admin/legacy-recovery/stats", { credentials: "include" })
          .then((r) => r.json())
          .catch(() => null),
        fetch("/api/page-factory/published-pages?stats=true&limit=1", { credentials: "include" })
          .then((r) => r.json())
          .catch(() => null),
      ]);

      if (dash.success && dash.data) {
        const d = dash.data;
        setStats({
          products: d.stats.products,
          orders: d.stats.orders,
          users: d.stats.users,
          revenue: d.stats.revenue,
          applications: d.stats.applications,
          lowStock: d.stats.lowStock,
          pendingApprovals: d.stats.pendingApprovals,
          pendingReturns: d.stats.pendingReturns,
          pendingReviews: d.stats.pendingReviews,
          lastMonthRevenue: d.stats.lastMonthRevenue,
        });
        setRecentOrders(d.recentOrders || []);
        setStatusCounts(d.statusCounts || {});
        setMonthlyRevenue(d.monthlyRevenue || new Array(12).fill(0));
        setLowStockProducts(d.lowStockProducts || []);
        setTopProducts(d.topProducts || []);
        setTopDealers(d.topDealers || []);
      }

      if (health?.success) {
        setAccountingHealth({
          hasDivergence: health.data.hasDivergence,
          divergenceCount: health.data.divergenceCount,
        });
      }

      setContentHub({
        plans: contentOps?.data?.totalPlans ?? 0,
        blogs: blogStats?.data?.total ?? contentOps?.data?.totalProductions ?? 0,
        pages: pageStats?.data?.stats?.publishedInternal ?? pageStats?.data?.stats?.total ?? 0,
        queuePending: contentOps?.data?.queuePending ?? 0,
        published: contentOps?.data?.publishedTotal ?? 0,
        qualityPending: contentOps?.data?.qualityPending ?? 0,
        recoveredLinks: legacyStats?.data?.completed ?? legacyStats?.data?.generated ?? 0,
      });
      setLastUpdated(new Date());
      setRefreshTick((t) => t + 1);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsToRefresh((s) => {
        if (s <= 1) {
          loadData(true);
          return AUTO_REFRESH_SEC;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [loadData]);

  const maxMonthly = Math.max(...monthlyRevenue, 1);
  const hasOrderData = stats.orders > 0;
  const hasRevenueData = stats.revenue > 0 || monthlyRevenue.some((v) => v > 0);
  const revChange =
    stats.lastMonthRevenue > 0
      ? (((stats.revenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100).toFixed(1)
      : "0";
  const revUp = parseFloat(revChange) >= 0;
  const totalStatus = Object.values(statusCounts).reduce((a, b) => a + b, 0) || 1;
  const currentMonthRevenue = monthlyRevenue[currentMonth] || 0;
  const systemOk = !accountingHealth?.hasDivergence && stats.pendingApprovals === 0;

  const statCards = [
    {
      label: "Toplam Gelir",
      numeric: stats.revenue,
      format: (n: number) => `₺${n.toLocaleString("tr-TR")}`,
      icon: DollarSign,
      accent: "from-emerald-500 to-teal-400",
      bg: "bg-emerald-50",
      ring: "ring-emerald-100",
      glow: "group-hover:shadow-emerald-500/20",
      change: revChange,
      up: revUp,
      href: toAdminUrl("/admin/orders"),
    },
    {
      label: "Siparişler",
      numeric: stats.orders,
      icon: ShoppingCart,
      accent: "from-blue-500 to-cyan-400",
      bg: "bg-blue-50",
      ring: "ring-blue-100",
      glow: "group-hover:shadow-blue-500/20",
      meta: `${stats.pendingApprovals} onay bekliyor`,
      href: toAdminUrl("/admin/orders"),
    },
    {
      label: "Ürünler",
      numeric: stats.products,
      icon: Package,
      accent: "from-violet-500 to-purple-400",
      bg: "bg-violet-50",
      ring: "ring-violet-100",
      glow: "group-hover:shadow-violet-500/20",
      meta: `${stats.lowStock} kritik stok`,
      href: toAdminUrl("/admin/products"),
    },
    {
      label: "Bayi Başvuruları",
      numeric: stats.applications,
      icon: Store,
      accent: "from-amber-500 to-orange-400",
      bg: "bg-amber-50",
      ring: "ring-amber-100",
      glow: "group-hover:shadow-amber-500/20",
      meta: "bekleyen",
      href: toAdminUrl("/admin/partner-applications"),
    },
  ];

  const pendingAlerts = [
    {
      label: "Onay Bekleyen Sipariş",
      count: stats.pendingApprovals,
      icon: Clock,
      color: "text-amber-700 bg-amber-50 border-amber-200",
      href: toAdminUrl("/admin/orders"),
    },
    {
      label: "İade Talepleri",
      count: stats.pendingReturns,
      icon: AlertTriangle,
      color: "text-red-700 bg-red-50 border-red-200",
      href: toAdminUrl("/admin/returns"),
    },
    {
      label: "Bekleyen Yorumlar",
      count: stats.pendingReviews,
      icon: Star,
      color: "text-blue-700 bg-blue-50 border-blue-200",
      href: toAdminUrl("/admin/reviews"),
    },
  ].filter((a) => a.count > 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 animate-pulse relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Mission Control Hero */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#030712] via-[#0f172a] to-[#1e1b4b] p-6 md:p-8 text-white shadow-2xl shadow-cyan-950/40"
      >
        <Starfield />
        <ScanLine />
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[linear-gradient(rgba(34,211,238,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.8)_1px,transparent_1px)] bg-[size:32px_32px]"
          aria-hidden
        />
        <motion.div
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"
        />
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, delay: 1 }}
          className="absolute -bottom-20 -left-16 w-72 h-72 rounded-full bg-violet-500/10 blur-3xl pointer-events-none"
        />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="flex gap-4 min-w-0">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
              className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 relative"
            >
              <Orbit size={22} className="text-cyan-300 absolute opacity-40" />
              <Rocket size={20} className="text-cyan-200 relative z-10" />
            </motion.div>
            <div className="min-w-0">
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/25 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200 mb-3"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <Radio size={11} />
                Mission Control · Canlı Veri
              </motion.div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-100 to-violet-200 bg-clip-text text-transparent">
                Genel Bakış
              </h1>
              <p className="mt-1 text-xs text-cyan-200/50 uppercase tracking-widest">ENA Yönetim Paneli</p>

              <div className="mt-4 flex flex-wrap items-end gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Mission Time</p>
                  <motion.p
                    key={timeLabel}
                    initial={{ opacity: 0.6, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl md:text-3xl font-mono font-bold tabular-nums text-cyan-100 tracking-wider"
                  >
                    {timeLabel}
                  </motion.p>
                </div>
                <div className="pb-1">
                  <p className="text-sm text-white/60">{todayLabel}</p>
                  {lastUpdated && (
                    <p className="text-[10px] text-white/40 mt-0.5">
                      Son telemetri{" "}
                      {lastUpdated.toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <SyncCountdown seconds={secondsToRefresh} refreshing={refreshing} />
            <div className="flex gap-2">
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setSecondsToRefresh(AUTO_REFRESH_SEC);
                  loadData(true);
                }}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-colors disabled:opacity-50 backdrop-blur-sm"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin text-cyan-300" : "text-cyan-200"} />
                Yenile
              </motion.button>
            <Link
              href={toAdminUrl("/admin/reports")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-sm font-semibold text-slate-950 transition-all shadow-lg shadow-cyan-500/20"
            >
                Raporlar
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Telemetry strip */}
        <div className="relative mt-6 flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-wider">
          {[
            { label: "Sistem", ok: systemOk, text: systemOk ? "Nominal" : "Uyarı" },
            { label: "Veri", ok: true, text: "Gerçek API" },
            { label: "Senkron", ok: !refreshing, text: refreshing ? "Aktif" : "Hazır" },
            { label: "Mod", ok: true, text: "Production Lite" },
          ].map((t) => (
            <span
              key={t.label}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
                t.ok
                  ? "bg-emerald-500/10 border-emerald-400/25 text-emerald-300"
                  : "bg-amber-500/10 border-amber-400/25 text-amber-300"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${t.ok ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
              {t.label}: {t.text}
            </span>
          ))}
        </div>

        <div className="relative mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Bu ay gelir", value: currentMonthRevenue, prefix: "₺" },
            { label: "Aktif sipariş", value: stats.orders, prefix: "" },
            { label: "Kullanıcı", value: stats.users, prefix: "" },
            { label: "Kritik stok", value: stats.lowStock, prefix: "" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              whileHover={{ scale: 1.02, borderColor: "rgba(34,211,238,0.35)" }}
              className="rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 backdrop-blur-md transition-colors"
            >
              <p className="text-[10px] uppercase tracking-wider text-cyan-200/50">{item.label}</p>
              <p className="text-lg font-bold mt-1 text-white">
                {item.prefix}
                <AnimatedNumber
                  value={item.value}
                  format={(n) => n.toLocaleString("tr-TR")}
                  animateKey={refreshTick}
                />
              </p>
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {refreshing && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-0 left-0 right-0 h-0.5 origin-left bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400"
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* İçerik Merkezi özet kartları */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">İçerik Merkezi</h2>
          <Link
            href={toAdminUrl("/admin/icerik-operasyon-merkezi")}
            className="text-xs text-cyan-600 hover:underline flex items-center gap-1"
          >
            Operasyon Merkezi <ArrowUpRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {[
            { label: "İçerik Planları", value: contentHub.plans, icon: Map, href: "/admin/icerik-planlama-merkezi", accent: "from-violet-500 to-purple-400" },
            { label: "Bloglar", value: contentHub.blogs, icon: FileText, href: "/admin/blog-engine", accent: "from-emerald-500 to-teal-400" },
            { label: "Sayfalar", value: contentHub.pages, icon: Layers, href: "/admin/page-factory", accent: "from-blue-500 to-cyan-400" },
            { label: "Yayın Kuyruğu", value: contentHub.queuePending, icon: Radio, href: "/admin/yayin-merkezi", accent: "from-indigo-500 to-blue-400" },
            { label: "Yayınlananlar", value: contentHub.published, icon: Rocket, href: "/admin/yayin-merkezi", accent: "from-emerald-600 to-green-400" },
            { label: "Kalite Bekleyenler", value: contentHub.qualityPending, icon: Shield, href: "/admin/icerik-kalite-merkezi", accent: "from-amber-500 to-orange-400" },
            { label: "Kurtarılan Linkler", value: contentHub.recoveredLinks, icon: Link2, href: "/admin/link-kurtarma-merkezi", accent: "from-rose-500 to-pink-400" },
          ].map((card, i) => (
            <Link key={card.label} href={toAdminUrl(card.href)}>
              <motion.div
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${card.accent}`} />
                <card.icon size={18} className="text-gray-500 group-hover:text-gray-800 mb-2" />
                <p className="text-xl font-black text-gray-900 tabular-nums">
                  <AnimatedNumber value={card.value} animateKey={refreshTick} />
                </p>
                <p className="text-[11px] text-gray-500 mt-1 leading-tight">{card.label}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Pipeline — veri yokken sistem durumu */}
      {!hasOrderData && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-r from-violet-50 via-white to-cyan-50 p-5"
        >
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-12 pointer-events-none"
          />
          <div className="relative flex flex-wrap items-center gap-4">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 border border-violet-200"
            >
              <Rocket size={22} className="text-violet-600" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">Operasyon pipeline&apos;ı boş — sistem hazır</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {stats.products.toLocaleString("tr-TR")} ürün katalogda · {stats.users} kullanıcı · İlk sipariş geldiğinde grafikler canlanacak
              </p>
            </div>
            <Link
              href={toAdminUrl("/admin/orders")}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
            >
              Siparişleri izle <ArrowUpRight size={12} />
            </Link>
          </div>
        </motion.div>
      )}

      {/* Alerts */}
      <AnimatePresence>
        {pendingAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {pendingAlerts.map((a, i) => (
              <motion.div key={a.label} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
                <Link
                  href={a.href}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border ${a.color} transition-all hover:scale-[1.02] hover:shadow-md`}
                >
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.25 }}
                    className="relative flex h-2 w-2"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-40" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
                  </motion.span>
                  <a.icon size={14} />
                  {a.label}
                  <span className="font-black ml-1">{a.count}</span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {accountingHealth?.hasDivergence && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3"
        >
          <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Legacy balance ile DealerAccount arasında fark var</p>
            <p className="text-xs text-amber-800 mt-0.5">
              {accountingHealth.divergenceCount} bayide Dealer.balance ≠ DealerAccount.currentBalance.
              <Link href={toAdminUrl("/admin/dealer-transactions")} className="underline ml-1">
                Cari hareketlerini incele
              </Link>
            </p>
          </div>
        </motion.div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const inner = (
            <motion.div
              custom={i}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className={`group relative rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-xl ${card.glow} hover:border-gray-300 transition-all cursor-pointer overflow-hidden ring-1 ${card.ring}`}
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accent} opacity-80 group-hover:opacity-100 transition-opacity`}
              />
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br opacity-[0.07] group-hover:opacity-[0.14] transition-opacity blur-xl from-gray-900 to-gray-400" />
              <div className="relative z-10 pt-1">
                <div className="flex items-center justify-between mb-3">
                  <div className={`rounded-xl ${card.bg} p-2.5 ring-1 ring-black/5`}>
                    <card.icon size={20} className="text-gray-700" />
                  </div>
                  {card.href && (
                    <ArrowUpRight size={16} className="text-gray-300 group-hover:text-cyan-600 transition-colors" />
                  )}
                </div>
                <p className="text-[28px] font-black text-gray-900 tracking-tight">
                  {card.format ? (
                    <AnimatedNumber value={card.numeric} format={card.format} animateKey={refreshTick} />
                  ) : (
                    <AnimatedNumber value={card.numeric} animateKey={refreshTick} />
                  )}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-xs text-gray-500">{card.label}</p>
                  {card.change && (
                    <span
                      className={`text-xs font-semibold flex items-center gap-0.5 ${card.up ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {card.up ? <ChevronUp size={12} /> : <ChevronDown size={12} />}%{card.change}
                    </span>
                  )}
                  {card.meta && <span className="text-xs text-gray-400">· {card.meta}</span>}
                </div>
              </div>
            </motion.div>
          );
          return card.href ? (
            <Link key={card.label} href={card.href}>
              {inner}
            </Link>
          ) : (
            <div key={card.label}>{inner}</div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <MissionPanel
          title="Aylık Gelir"
          subtitle="Gerçek sipariş verisi — son 12 ay (₺)"
          delay={0.25}
          className="lg:col-span-2"
          action={
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${revUp ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"}`}
            >
              {revUp ? "+" : ""}%{revChange}
            </span>
          }
        >
          {!hasRevenueData ? (
            <>
              <EmptyChartBars currentMonth={currentMonth} />
              <p className="text-center text-[11px] text-gray-400 mt-2">Henüz gelir kaydı yok — B2B siparişler burada görünür</p>
            </>
          ) : (
          <div className="flex items-end justify-between gap-1.5 h-44 relative">
            <div
              className="absolute inset-0 opacity-[0.35] pointer-events-none bg-[linear-gradient(rgba(148,163,184,0.15)_1px,transparent_1px)] bg-[size:100%_28px]"
              aria-hidden
            />
            {monthlyRevenue.map((val, i) => {
              const h = Math.max((val / maxMonthly) * 100, val > 0 ? 8 : 0);
              const isCurrent = i === currentMonth;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end relative z-10">
                  <span className="text-[10px] font-medium text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {val > 0 ? `${(val / 1000).toFixed(0)}K` : ""}
                  </span>
                  <motion.div
                    key={`${i}-${refreshTick}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 0.15 + i * 0.04, duration: 0.65, ease: [0.23, 1, 0.32, 1] }}
                    className={`w-full rounded-t-md min-h-0 cursor-pointer transition-shadow ${
                      isCurrent
                        ? "bg-gradient-to-t from-cyan-600 via-blue-500 to-violet-400 shadow-lg shadow-cyan-500/25"
                        : "bg-gradient-to-t from-slate-200 to-slate-300 group-hover:from-cyan-200 group-hover:to-blue-200"
                    }`}
                    style={{ minHeight: val > 0 ? 4 : 0 }}
                  />
                  <span className={`text-[10px] font-semibold ${isCurrent ? "text-cyan-600" : "text-gray-400"}`}>
                    {MONTHS[i]}
                  </span>
                </div>
              );
            })}
          </div>
          )}
        </MissionPanel>

        <MissionPanel title="Sipariş Durumu" subtitle="Operasyonel dağılım" delay={0.32}>
          {!hasOrderData ? (
            <>
              <EmptyStatusRing />
              <p className="text-center text-[11px] text-gray-400 -mt-2">Henüz sipariş yok — dağılım otomatik oluşur</p>
            </>
          ) : (
          <div className="space-y-3">
            {Object.entries(STATUS_LABELS).map(([key, s], idx) => {
              const count = statusCounts[key] || 0;
              if (count === 0) return null;
              const pct = (count / totalStatus) * 100;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">{s.label}</span>
                    <span className="font-medium text-gray-900 tabular-nums">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      key={`${key}-${refreshTick}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.2 + idx * 0.07, duration: 0.7, ease: "easeOut" }}
                      className={`h-full rounded-full ${s.color} shadow-sm ${s.glow}`}
                    />
                  </div>
                </div>
              );
            })}
            {totalStatus <= 1 && <p className="text-xs text-gray-400 text-center py-4">Henüz sipariş yok</p>}
          </div>
          )}
        </MissionPanel>
      </div>

      {/* Recent + stock */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MissionPanel
          title="Son Siparişler"
          delay={0.35}
          action={
            <Link href={toAdminUrl("/admin/orders")} className="text-xs text-cyan-600 hover:underline flex items-center gap-1">
              Tümü <ArrowUpRight size={12} />
            </Link>
          }
        >
          {recentOrders.length === 0 ? (
            <MissionEmptyState
              icon={ShoppingCart}
              title="Henüz sipariş yok"
              subtitle="Bayi veya perakende siparişi oluşturulduğunda canlı akış burada görünür."
              action={{ label: "Sipariş paneli", href: toAdminUrl("/admin/orders") }}
            />
          ) : (
            <div className="space-y-2">
              {recentOrders.map((o, i) => (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  whileHover={{ x: 4 }}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 hover:bg-cyan-50/50 border border-transparent hover:border-cyan-100 transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {o.dealer?.company || o.dealer?.name || o.user?.name || "Misafir"}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {new Date(o.createdAt).toLocaleString("tr-TR")} · {formatOrderStatus(o.status)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-gray-900 shrink-0 tabular-nums">
                    {o.total.toLocaleString("tr-TR")} ₺
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </MissionPanel>

        <MissionPanel
          title="Kritik Stok"
          delay={0.4}
          action={
            <Link href={toAdminUrl("/admin/products")} className="text-xs text-violet-600 hover:underline flex items-center gap-1">
              Ürünler <ArrowUpRight size={12} />
            </Link>
          }
        >
          {lowStockProducts.length === 0 ? (
            <MissionEmptyState
              icon={Package}
              title="Kritik stok yok"
              subtitle="Tüm ürünler minimum stok seviyesinin üzerinde — sistem nominal."
              action={{ label: "Ürün katalogu", href: toAdminUrl("/admin/products") }}
            />
          ) : (
            <div className="space-y-2">
              {lowStockProducts.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-amber-100 bg-amber-50/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-[10px] text-amber-700">
                      Min: {p.minStockLevel} · SKU: {p.sku || "—"}
                    </p>
                  </div>
                  <motion.span
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                    className="text-lg font-black text-amber-600 shrink-0 tabular-nums"
                  >
                    {p.stock}
                  </motion.span>
                </motion.div>
              ))}
            </div>
          )}
        </MissionPanel>
      </div>

      {/* Bottom */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MissionPanel title="En Çok Satan" delay={0.45} action={<TrendingUp size={16} className="text-emerald-500" />}>
          {topProducts.length === 0 ? (
            <MissionEmptyState
              icon={TrendingUp}
              title="Henüz satış yok"
              subtitle="Sipariş akışı başladığında en çok satan ürünler burada sıralanır."
            />
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.06 }}
                  className="flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-100 to-cyan-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-700 truncate">{p.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-gray-900 tabular-nums">
                      {p.revenue.toLocaleString("tr-TR")} ₺
                    </span>
                    <span className="text-[10px] text-gray-400 ml-2">{p.qty} adet</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </MissionPanel>

        <div className="space-y-6">
          <MissionPanel title="En İyi Bayiler" delay={0.5} action={<Store size={16} className="text-purple-500" />}>
            {topDealers.length === 0 ? (
              <MissionEmptyState
                icon={Store}
                title="Henüz bayi siparişi yok"
                subtitle="Bayi B2B siparişleri geldiğinde performans liderleri listelenir."
                action={{ label: "Bayiler", href: toAdminUrl("/admin/dealers") }}
              />
            ) : (
              <div className="space-y-3">
                {topDealers.map((d, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 + i * 0.06 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-700 truncate">{d.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-gray-900 tabular-nums">
                        {d.revenue.toLocaleString("tr-TR")} ₺
                      </span>
                      <span className="text-[10px] text-gray-400 ml-2">{d.orders} sip.</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </MissionPanel>

          <MissionPanel title="Hızlı İşlemler" delay={0.55}>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: "Yeni Ürün",
                  icon: Plus,
                  href: "/admin/products/new",
                  color: "from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500",
                },
                {
                  label: "Siparişler",
                  icon: ShoppingCart,
                  href: "/admin/orders",
                  color: "from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500",
                },
                {
                  label: "Bayiler",
                  icon: Store,
                  href: "/admin/dealers",
                  color: "from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500",
                },
                {
                  label: "Excel Export",
                  icon: FileText,
                  href: "/api/admin/export?type=products",
                  color: "from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500",
                },
              ].map((a) => {
                const inner = (
                  <motion.div
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-white text-sm font-medium bg-gradient-to-r ${a.color} transition-all justify-center shadow-md`}
                  >
                    <a.icon size={16} />
                    {a.label}
                  </motion.div>
                );
                const href = a.href.startsWith("/admin") ? toAdminUrl(a.href) : a.href;
                return a.href.startsWith("/admin") ? (
                  <Link key={a.label} href={href}>
                    {inner}
                  </Link>
                ) : (
                  <a key={a.label} href={href}>
                    {inner}
                  </a>
                );
              })}
            </div>
          </MissionPanel>
        </div>
      </div>
    </div>
  );
}
