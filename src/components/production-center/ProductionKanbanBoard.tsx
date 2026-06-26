"use client";

import { useState } from "react";
import type { ProductionJobDto } from "@/lib/production-center/types";
import {
  PRODUCTION_KANBAN_COLUMNS,
  kanbanColumnToStatus,
  statusToKanbanColumn,
  type KanbanColumnId,
} from "@/lib/production-center/kanban";
import { ProductionJobCard } from "./ProductionJobCard";

type Props = {
  jobs: ProductionJobDto[];
  onSelect: (job: ProductionJobDto) => void;
  onStatusChange: (jobId: string, status: string) => Promise<void>;
};

export function ProductionKanbanBoard({ jobs, onSelect, onStatusChange }: Props) {
  const [dragJobId, setDragJobId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<KanbanColumnId | null>(null);

  const kanbanJobs = jobs.filter((j) => j.status !== "CANCELLED");

  const byColumn = (colId: KanbanColumnId) =>
    kanbanJobs.filter((j) => statusToKanbanColumn(j.status) === colId);

  const handleDrop = async (columnId: KanbanColumnId) => {
    if (!dragJobId) return;
    const job = jobs.find((j) => j.id === dragJobId);
    if (!job) return;
    const nextStatus = kanbanColumnToStatus(columnId);
    if (nextStatus !== job.status) {
      await onStatusChange(dragJobId, nextStatus);
    }
    setDragJobId(null);
    setOverColumn(null);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 min-h-[480px]">
      {PRODUCTION_KANBAN_COLUMNS.map((col) => (
        <div
          key={col.id}
          className={`w-[min(260px,82vw)] shrink-0 rounded-xl border flex flex-col min-h-[420px] transition-colors ${
            overColumn === col.id ? "border-emerald-500/50 bg-emerald-500/5" : "border-ena-border bg-white/[0.02]"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setOverColumn(col.id);
          }}
          onDragLeave={() => setOverColumn((c) => (c === col.id ? null : c))}
          onDrop={(e) => {
            e.preventDefault();
            void handleDrop(col.id);
          }}
        >
          <div className="px-3 py-2.5 border-b border-ena-border flex items-center justify-between">
            <span className="text-xs font-bold tracking-wide text-ena-text">{col.label}</span>
            <span className="text-[10px] text-ena-text-muted tabular-nums">{byColumn(col.id).length}</span>
          </div>
          <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-360px)]">
            {byColumn(col.id).map((job) => (
              <ProductionJobCard
                key={job.id}
                job={job}
                draggable
                onDragStart={(e) => {
                  setDragJobId(job.id);
                  e.dataTransfer.setData("text/plain", job.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => onSelect(job)}
              />
            ))}
            {!byColumn(col.id).length && (
              <p className="text-[10px] text-center text-ena-text-muted py-8">Boş</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
