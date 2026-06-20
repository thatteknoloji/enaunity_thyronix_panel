/** Pazaryeri operasyon akışı — 5 adım */
export const OPERATION_STATUSES = ["NEW", "PICKING", "PACKED", "SHIPPED", "DELIVERED"] as const;
export type OperationStatus = (typeof OPERATION_STATUSES)[number];

const LEGACY_MAP: Record<string, OperationStatus> = {
  PROCESSING: "NEW",
  WAITING_FOR_PACKING: "NEW",
  PACKING: "PICKING",
  WAITING_FOR_SHIPMENT: "PACKED",
  READY_TO_SHIP: "PACKED",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
};

export function normalizeOperationStatus(status: string | null | undefined): OperationStatus {
  if (!status) return "NEW";
  const upper = status.toUpperCase();
  if (OPERATION_STATUSES.includes(upper as OperationStatus)) return upper as OperationStatus;
  return LEGACY_MAP[upper] || "NEW";
}

export function operationStatusLabel(status: string): string {
  const s = normalizeOperationStatus(status);
  const labels: Record<OperationStatus, string> = {
    NEW: "Yeni",
    PICKING: "Toplama",
    PACKED: "Paketlendi",
    SHIPPED: "Kargoya Verildi",
    DELIVERED: "Teslim",
  };
  return labels[s];
}

export function getNextOperationStatus(current: string): OperationStatus | null {
  const normalized = normalizeOperationStatus(current);
  const idx = OPERATION_STATUSES.indexOf(normalized);
  if (idx < 0 || idx >= OPERATION_STATUSES.length - 1) return null;
  return OPERATION_STATUSES[idx + 1];
}

export function canAdvanceOperationStatus(current: string): boolean {
  return getNextOperationStatus(current) !== null;
}
