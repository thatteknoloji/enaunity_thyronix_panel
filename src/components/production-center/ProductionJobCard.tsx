"use client";

import { GripVertical, Package } from "lucide-react";
import type { ProductionJobDto } from "@/lib/production-center/types";
import {
  PRODUCTION_PRIORITY_LABELS,
  PRODUCTION_SOURCE_LABELS,
  PRODUCTION_STATUS_LABELS,
} from "@/lib/production-center/kanban";

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "border-slate-400/40",
  NORMAL: "border-white/10",
  HIGH: "border-amber-500/50",
  URGENT: "border-red-500/60 bg-red-500/5",
};

type Props = {
  job: ProductionJobDto;
  onClick: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
};

export function ProductionJobCard({ job, onClick, draggable, onDragStart }: Props) {
  const size =
    job.widthCm > 0 && job.heightCm > 0 ? `${job.widthCm}×${job.heightCm} cm` : "—";

  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className={`w-full text-left rounded-lg border bg-white/5 p-3 hover:bg-white/[0.08] transition-colors ${PRIORITY_COLOR[job.priority] ?? PRIORITY_COLOR.NORMAL}`}
    >
      <div className="flex items-start gap-2">
        {draggable && <GripVertical className="h-4 w-4 text-ena-text-muted shrink-0 mt-0.5 cursor-grab" />}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono font-semibold text-emerald-600">{job.jobNumber}</span>
            <span className="text-[10px] text-ena-text-muted">{PRODUCTION_PRIORITY_LABELS[job.priority]}</span>
          </div>
          <p className="text-sm font-medium text-ena-text truncate">{job.productType}</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-ena-text-muted">
            <span>Ölçü: {size}</span>
            <span>×{job.quantity}</span>
            <span className="truncate col-span-2">Bayi: {job.dealerName || "—"}</span>
            <span>{PRODUCTION_SOURCE_LABELS[job.orderSource] ?? job.orderSource}</span>
            <span className="text-right">{PRODUCTION_STATUS_LABELS[job.status] ?? job.status}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export function ProductionJobCardGrid({
  jobs,
  onSelect,
}: {
  jobs: ProductionJobDto[];
  onSelect: (job: ProductionJobDto) => void;
}) {
  if (!jobs.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ena-text-muted">
        <Package className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">Üretim işi bulunamadı</p>
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {jobs.map((job) => (
        <ProductionJobCard key={job.id} job={job} onClick={() => onSelect(job)} />
      ))}
    </div>
  );
}
