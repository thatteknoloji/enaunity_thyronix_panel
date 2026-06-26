"use client";

import { Factory, Package, Printer, Truck, CheckCircle2, Clock } from "lucide-react";
import type { ProductionDashboardStats } from "@/lib/production-center/types";

type Props = {
  stats: ProductionDashboardStats;
  onNavigate: (filter: { status?: string }) => void;
};

const CARDS = [
  {
    key: "todayPending" as const,
    label: "Bugün Bekleyen",
    icon: Clock,
    color: "text-amber-500",
    filter: { status: "NEW" },
  },
  {
    key: "printing" as const,
    label: "Baskıda",
    icon: Printer,
    color: "text-blue-500",
    filter: { status: "PRINTING" },
  },
  {
    key: "packaging" as const,
    label: "Paketlenecek",
    icon: Package,
    color: "text-violet-500",
    filter: { status: "PACKAGING" },
  },
  {
    key: "toShip" as const,
    label: "Kargolanacak",
    icon: Truck,
    color: "text-orange-500",
    filter: { status: "SHIPPED" },
  },
  {
    key: "completed" as const,
    label: "Tamamlanan",
    icon: CheckCircle2,
    color: "text-emerald-500",
    filter: { status: "COMPLETED" },
  },
];

export function ProductionDashboard({ stats, onNavigate }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ena-border bg-white/5 p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <Factory className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ena-text">Üretim Hattı</p>
          <p className="text-xs text-ena-text-muted">
            Sipariş → Production Pack → Üretim → Kargo → Tamamlandı
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {CARDS.map(({ key, label, icon: Icon, color, filter }) => (
          <button
            key={key}
            type="button"
            onClick={() => onNavigate(filter)}
            className="rounded-xl border border-ena-border bg-ena-card/30 p-4 text-left hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <Icon className={`h-5 w-5 ${color}`} />
              <span className="text-2xl font-bold text-ena-text tabular-nums">{stats[key]}</span>
            </div>
            <p className="text-xs font-medium text-ena-text-muted">{label}</p>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-ena-border bg-white/[0.02] p-4 text-xs text-ena-text-muted">
        <p className="font-medium text-ena-text mb-1">Pazaryeri entegrasyonu</p>
        <p>Marketplace siparişleri için otomatik üretim işi — <span className="text-amber-500">Yakında</span></p>
      </div>
    </div>
  );
}
