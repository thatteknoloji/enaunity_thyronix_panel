import type { ProductionStatus } from "./types";

export type KanbanColumnId =
  | "NEW"
  | "PREPRESS"
  | "PRINTING"
  | "PACKAGING"
  | "SHIPPED"
  | "COMPLETED";

export type KanbanColumn = {
  id: KanbanColumnId;
  label: string;
  statuses: ProductionStatus[];
};

/** Sipariş → Production Pack → Üretim → Kargo → Tamamlandı */
export const PRODUCTION_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "NEW", label: "NEW", statuses: ["NEW"] },
  { id: "PREPRESS", label: "PREPRESS", statuses: ["PREPRESS"] },
  { id: "PRINTING", label: "PRINTING", statuses: ["PRINTING"] },
  { id: "PACKAGING", label: "PACKAGING", statuses: ["PACKAGING"] },
  { id: "SHIPPED", label: "SHIPPED", statuses: ["SHIPPED"] },
  { id: "COMPLETED", label: "COMPLETED", statuses: ["COMPLETED"] },
];

export function statusToKanbanColumn(status: string): KanbanColumnId | null {
  const col = PRODUCTION_KANBAN_COLUMNS.find((c) =>
    (c.statuses as readonly string[]).includes(status)
  );
  return col?.id ?? null;
}

export function kanbanColumnToStatus(columnId: KanbanColumnId): ProductionStatus {
  const col = PRODUCTION_KANBAN_COLUMNS.find((c) => c.id === columnId);
  return col?.statuses[0] ?? "NEW";
}

export const PRODUCTION_STATUS_LABELS: Record<string, string> = {
  NEW: "Yeni",
  PREPRESS: "Ön Baskı",
  PRINTING: "Baskıda",
  PACKAGING: "Paketleme",
  SHIPPED: "Kargoda",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

export const PRODUCTION_PRIORITY_LABELS: Record<string, string> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

export const PRODUCTION_SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Manuel",
  DEALER_ORDER: "Bayi Siparişi",
  CORE_ORDER: "Sipariş",
  POD_ORDER: "POD",
  MARKETPLACE: "Pazaryeri (Yakında)",
};
