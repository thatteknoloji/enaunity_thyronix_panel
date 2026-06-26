"use client";

import { Search, Filter, LayoutGrid, Columns3, Plus, RefreshCw, LayoutDashboard } from "lucide-react";
import {
  PRODUCTION_PRIORITIES,
  PRODUCTION_STATUSES,
  type ProductionJobDto,
} from "@/lib/production-center/types";
import {
  PRODUCTION_PRIORITY_LABELS,
  PRODUCTION_SOURCE_LABELS,
  PRODUCTION_STATUS_LABELS,
} from "@/lib/production-center/kanban";

export type ProductionFiltersState = {
  status: string;
  machine: string;
  operator: string;
  productType: string;
  priority: string;
  search: string;
  orderSource: string;
};

export type ProductionView = "dashboard" | "kanban" | "cards";

type Props = {
  filters: ProductionFiltersState;
  onChange: (patch: Partial<ProductionFiltersState>) => void;
  view: ProductionView;
  onViewChange: (view: ProductionView) => void;
  onRefresh: () => void;
  onCreateManual: () => void;
  onCreateFromDealer: () => void;
  loading?: boolean;
  jobs: ProductionJobDto[];
};

export function ProductionFiltersBar({
  filters,
  onChange,
  view,
  onViewChange,
  onRefresh,
  onCreateManual,
  onCreateFromDealer,
  loading,
  jobs,
}: Props) {
  const machines = [...new Set(jobs.map((j) => j.machineName).filter(Boolean))];
  const operators = [...new Set(jobs.map((j) => j.operatorName).filter(Boolean))];
  const productTypes = [...new Set(jobs.map((j) => j.productType).filter(Boolean))];

  return (
    <div className="space-y-3 shrink-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Üretim Merkezi</p>
          <h1 className="text-xl font-bold text-ena-text">Production Center</h1>
          <p className="text-xs text-ena-text-muted mt-0.5">
            Sipariş → Production Pack → Üretim → Kargo → Tamamlandı
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ena-border px-3 py-2 text-xs font-medium text-ena-text hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Yenile
          </button>
          <button
            type="button"
            onClick={onCreateFromDealer}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/15"
          >
            <Plus className="h-3.5 w-3.5" /> Bayi Siparişinden
          </button>
          <button
            type="button"
            onClick={onCreateManual}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            <Plus className="h-3.5 w-3.5" /> Manuel İş
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ena-border bg-white/5 p-3">
        <Filter className="h-4 w-4 text-ena-text-muted shrink-0" />
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ena-text-muted" />
          <input
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="İş no, müşteri, ürün…"
            className="w-full rounded-lg border border-ena-border bg-ena-dark/40 pl-8 pr-3 py-1.5 text-xs"
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value })}
          className="rounded-lg border border-ena-border bg-ena-dark/40 px-2 py-1.5 text-xs min-w-[120px]"
        >
          <option value="">Durum</option>
          {PRODUCTION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PRODUCTION_STATUS_LABELS[s] ?? s}
            </option>
          ))}
        </select>
        <select
          value={filters.priority}
          onChange={(e) => onChange({ priority: e.target.value })}
          className="rounded-lg border border-ena-border bg-ena-dark/40 px-2 py-1.5 text-xs"
        >
          <option value="">Öncelik</option>
          {PRODUCTION_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRODUCTION_PRIORITY_LABELS[p] ?? p}
            </option>
          ))}
        </select>
        <select
          value={filters.machine}
          onChange={(e) => onChange({ machine: e.target.value })}
          className="rounded-lg border border-ena-border bg-ena-dark/40 px-2 py-1.5 text-xs"
        >
          <option value="">Makine</option>
          {machines.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={filters.operator}
          onChange={(e) => onChange({ operator: e.target.value })}
          className="rounded-lg border border-ena-border bg-ena-dark/40 px-2 py-1.5 text-xs"
        >
          <option value="">Operatör</option>
          {operators.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select
          value={filters.productType}
          onChange={(e) => onChange({ productType: e.target.value })}
          className="rounded-lg border border-ena-border bg-ena-dark/40 px-2 py-1.5 text-xs max-w-[140px]"
        >
          <option value="">Ürün tipi</option>
          {productTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={filters.orderSource}
          onChange={(e) => onChange({ orderSource: e.target.value })}
          className="rounded-lg border border-ena-border bg-ena-dark/40 px-2 py-1.5 text-xs"
        >
          <option value="">Kaynak</option>
          {Object.entries(PRODUCTION_SOURCE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div className="flex rounded-lg border border-ena-border overflow-hidden ml-auto">
          <button
            type="button"
            onClick={() => onViewChange("dashboard")}
            className={`px-2.5 py-1.5 text-xs inline-flex items-center gap-1 ${view === "dashboard" ? "bg-emerald-600 text-white" : "text-ena-text-muted hover:bg-white/5"}`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
          </button>
          <button
            type="button"
            onClick={() => onViewChange("kanban")}
            className={`px-2.5 py-1.5 text-xs inline-flex items-center gap-1 ${view === "kanban" ? "bg-emerald-600 text-white" : "text-ena-text-muted hover:bg-white/5"}`}
          >
            <Columns3 className="h-3.5 w-3.5" /> Kanban
          </button>
          <button
            type="button"
            onClick={() => onViewChange("cards")}
            className={`px-2.5 py-1.5 text-xs inline-flex items-center gap-1 ${view === "cards" ? "bg-emerald-600 text-white" : "text-ena-text-muted hover:bg-white/5"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Kart
          </button>
        </div>
      </div>
    </div>
  );
}
