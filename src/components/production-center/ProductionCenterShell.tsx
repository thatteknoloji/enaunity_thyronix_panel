"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { ProductionDashboardStats, ProductionJobDto } from "@/lib/production-center/types";
import { ProductionFiltersBar, type ProductionFiltersState, type ProductionView } from "./ProductionFiltersBar";
import { ProductionKanbanBoard } from "./ProductionKanbanBoard";
import { ProductionJobCardGrid } from "./ProductionJobCard";
import { ProductionJobDetailPanel } from "./ProductionJobDetailPanel";
import { ProductionDashboard } from "./ProductionDashboard";
import { CreateFromDealerOrderDialog, CreateManualJobDialog } from "./CreateJobDialogs";

const EMPTY_FILTERS: ProductionFiltersState = {
  status: "",
  machine: "",
  operator: "",
  productType: "",
  priority: "",
  search: "",
  orderSource: "",
};

const EMPTY_STATS: ProductionDashboardStats = {
  todayPending: 0,
  printing: 0,
  packaging: 0,
  toShip: 0,
  completed: 0,
};

export function ProductionCenterShell() {
  const [jobs, setJobs] = useState<ProductionJobDto[]>([]);
  const [stats, setStats] = useState<ProductionDashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProductionFiltersState>(EMPTY_FILTERS);
  const [view, setView] = useState<ProductionView>("dashboard");
  const [selected, setSelected] = useState<ProductionJobDto | null>(null);
  const [dealerDialog, setDealerDialog] = useState(false);
  const [manualDialog, setManualDialog] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.status) p.set("status", filters.status);
    if (filters.machine) p.set("machine", filters.machine);
    if (filters.operator) p.set("operator", filters.operator);
    if (filters.productType) p.set("productType", filters.productType);
    if (filters.priority) p.set("priority", filters.priority);
    if (filters.search) p.set("search", filters.search);
    if (filters.orderSource) p.set("orderSource", filters.orderSource);
    return p.toString();
  }, [filters]);

  const fetchDashboard = useCallback(async () => {
    const res = await fetch("/api/production/jobs?dashboard=1");
    const json = await res.json();
    if (json.success) setStats(json.data.stats ?? EMPTY_STATS);
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsRes] = await Promise.all([
        fetch(`/api/production/jobs${query ? `?${query}` : ""}`),
        fetchDashboard(),
      ]);
      const json = await jobsRes.json();
      if (!json.success) throw new Error(json.error);
      setJobs(json.data.jobs ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [query, fetchDashboard]);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const handleStatusChange = async (jobId: string, status: string) => {
    try {
      const res = await fetch(`/api/production/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? json.data : j)));
      if (selected?.id === jobId) setSelected(json.data);
      void fetchDashboard();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Durum güncellenemedi");
    }
  };

  const onJobCreated = (job: ProductionJobDto) => {
    setJobs((prev) => [job, ...prev]);
    setSelected(job);
    void fetchDashboard();
  };

  const onJobUpdated = (job: ProductionJobDto) => {
    setJobs((prev) => prev.map((j) => (j.id === job.id ? job : j)));
    setSelected(job);
    void fetchDashboard();
  };

  const navigateFromDashboard = (filter: { status?: string }) => {
    if (filter.status) setFilters((f) => ({ ...f, status: filter.status! }));
    setView("kanban");
  };

  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1">
      <ProductionFiltersBar
        filters={filters}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        view={view}
        onViewChange={setView}
        onRefresh={() => void fetchJobs()}
        onCreateManual={() => setManualDialog(true)}
        onCreateFromDealer={() => setDealerDialog(true)}
        loading={loading}
        jobs={jobs}
      />

      {loading && !jobs.length && view !== "dashboard" ? (
        <div className="flex-1 flex items-center justify-center text-sm text-ena-text-muted py-20">
          Üretim kuyruğu yükleniyor…
        </div>
      ) : view === "dashboard" ? (
        <ProductionDashboard stats={stats} onNavigate={navigateFromDashboard} />
      ) : view === "kanban" ? (
        <ProductionKanbanBoard jobs={jobs} onSelect={setSelected} onStatusChange={handleStatusChange} />
      ) : (
        <ProductionJobCardGrid jobs={jobs} onSelect={setSelected} />
      )}

      <ProductionJobDetailPanel job={selected} onClose={() => setSelected(null)} onUpdated={onJobUpdated} />
      <CreateFromDealerOrderDialog open={dealerDialog} onClose={() => setDealerDialog(false)} onCreated={onJobCreated} />
      <CreateManualJobDialog open={manualDialog} onClose={() => setManualDialog(false)} onCreated={onJobCreated} />
    </div>
  );
}
