"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyLoadedProject,
  duplicatePodCoreProject,
  listPodCoreProjects,
  loadPodCoreProject,
  savePodCoreProject,
  type PodOrderBridgeListItem,
} from "@/lib/pod-core/pod-order-bridge";
import { PROJECT_SERIALIZER_VERSION } from "@/lib/pod-core/pod-types";
import { usePodCore } from "./pod-core-context";

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: currency || "TRY" }).format(amount);
}

export function PodProjectPanel() {
  const {
    engine,
    mockupTemplate,
    widthCm,
    heightCm,
    quantity,
    customerType,
    pricing,
    projectId,
    projectName,
    setProjectName,
    lastSavedAt,
    lastLoadedAt,
    exportCount,
    setProjectMeta,
    refresh,
    setMockupTemplate,
    setWidthCm,
    setHeightCm,
    setQuantity,
    setCustomerType,
    restorePricingSnapshot,
  } = usePodCore();

  const [projects, setProjects] = useState<PodOrderBridgeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(projectId);

  const reloadList = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listPodCoreProjects();
      setProjects(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadList();
  }, [reloadList, lastSavedAt]);

  useEffect(() => {
    setSelectedId(projectId);
  }, [projectId]);

  const handleSave = async () => {
    if (!engine) return;
    setBusy("save");
    setError(null);
    try {
      const result = await savePodCoreProject({
        ownerUserId: "",
        projectId: projectId ?? undefined,
        projectName,
        engine,
        mockupTemplate,
        widthCm,
        heightCm,
        quantity,
        customerType,
        pricing,
        includeProductionPack: true,
        exportCount,
      });
      setProjectMeta({
        projectId: result.project.projectId,
        projectName: result.project.projectName,
        lastSavedAt: Date.now(),
        exportCount: result.project.exportCount,
        pricingSnapshot: result.project.pricingSnapshot,
      });
      setSelectedId(result.project.projectId);
      await reloadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt hatası");
    } finally {
      setBusy(null);
    }
  };

  const handleLoad = async (id?: string) => {
    const targetId = id ?? selectedId;
    if (!targetId || !engine) return;
    setBusy("load");
    setError(null);
    try {
      const loaded = await loadPodCoreProject(targetId);
      await applyLoadedProject(engine, loaded);
      setMockupTemplate(loaded.mockupTemplate);
      setWidthCm(loaded.widthCm);
      setHeightCm(loaded.heightCm);
      setQuantity(loaded.quantity);
      setCustomerType(loaded.customerType);
      restorePricingSnapshot(loaded.pricingSnapshot);
      setProjectMeta({
        projectId: loaded.record.projectId,
        projectName: loaded.record.projectName,
        lastLoadedAt: Date.now(),
        exportCount: loaded.record.exportCount,
        pricingSnapshot: loaded.record.pricingSnapshot,
      });
      setProjectName(loaded.record.projectName);
      setSelectedId(loaded.record.projectId);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yükleme hatası");
    } finally {
      setBusy(null);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedId) return;
    setBusy("duplicate");
    setError(null);
    try {
      const copy = await duplicatePodCoreProject(selectedId);
      setProjectMeta({
        projectId: copy.projectId,
        projectName: copy.projectName,
        lastSavedAt: Date.now(),
        exportCount: copy.exportCount,
        pricingSnapshot: copy.pricingSnapshot,
      });
      setProjectName(copy.projectName);
      setSelectedId(copy.projectId);
      await reloadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kopyalama hatası");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = () => {
    setError("Silme işlemi V5 fazında aktif olacak (stub)");
  };

  const snapshot = pricing;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-2">Project</p>
        <label className="block text-xs text-ena-light/60 mb-1">Proje Adı</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-full rounded-lg border border-ena-border bg-white/5 px-3 py-2 text-sm text-ena-text"
          placeholder="Proje adı"
        />
      </div>

      <div className="rounded-lg border border-ena-border/60 p-3 space-y-1 text-xs">
        <Row label="Template" value={mockupTemplate.name} />
        <Row label="Son Kayıt" value={lastSavedAt ? new Date(lastSavedAt).toLocaleString("tr-TR") : "—"} />
        <Row label="Project ID" value={projectId ?? "—"} />
        <Row label="Serializer" value={PROJECT_SERIALIZER_VERSION} />
      </div>

      <div className="rounded-lg border border-ena-border/60 p-3 space-y-1 text-xs">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ena-light/50 mb-1">Pricing Snapshot</p>
        {snapshot ? (
          <>
            <Row label="Rule" value={mockupTemplate.pricingRuleCode} />
            <Row label="Alan m²" value={snapshot.areaM2.toFixed(4)} />
            <Row label="Bayi" value={formatMoney(snapshot.dealerPrice, snapshot.currency)} />
            <Row label="Perakende" value={formatMoney(snapshot.retailPrice, snapshot.currency)} />
            <Row label="Final" value={formatMoney(snapshot.finalPrice, snapshot.currency)} />
          </>
        ) : (
          <p className="text-ena-light/50">Henüz fiyat hesaplanmadı</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionBtn onClick={() => void handleSave()} disabled={!!busy || !engine?.canvas} loading={busy === "save"}>
          Kaydet
        </ActionBtn>
        <ActionBtn onClick={() => void handleLoad()} disabled={!!busy || !selectedId} loading={busy === "load"}>
          Yükle
        </ActionBtn>
        <ActionBtn onClick={() => void handleDuplicate()} disabled={!!busy || !selectedId} loading={busy === "duplicate"}>
          Kopyala
        </ActionBtn>
        <ActionBtn onClick={handleDelete} disabled={!!busy || !selectedId} variant="danger">
          Sil
        </ActionBtn>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ena-light/50">Kayıtlı Projeler</p>
          <button type="button" onClick={() => void reloadList()} className="text-[10px] text-emerald-600 hover:underline">
            {loading ? "..." : "Yenile"}
          </button>
        </div>
        <ul className="max-h-48 overflow-auto space-y-1">
          {projects.length === 0 && (
            <li className="text-xs text-ena-light/50 py-2">Henüz kayıtlı proje yok</li>
          )}
          {projects.map((p) => (
            <li key={p.projectId}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(p.projectId);
                  void handleLoad(p.projectId);
                }}
                className={`w-full text-left rounded-lg px-2 py-1.5 text-xs transition ${
                  selectedId === p.projectId
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-700"
                    : "hover:bg-white/5 text-ena-light/70"
                }`}
              >
                <span className="font-medium block truncate">{p.projectName}</span>
                <span className="text-[10px] text-ena-light/50">
                  {p.templateName} · {new Date(p.updatedAt).toLocaleString("tr-TR")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[10px] text-ena-light/40">Export count: {exportCount}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-ena-light/50">{label}</span>
      <span className="text-ena-text truncate">{value}</span>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  loading,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "default" | "danger";
}) {
  const base =
    variant === "danger"
      ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
      : "border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 ${base}`}
    >
      {loading ? "..." : children}
    </button>
  );
}
