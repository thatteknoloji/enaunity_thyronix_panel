export function getModuleLabel(key: string): string {
  const labels: Record<string, string> = {
    ENA_COMMERCE: "ENA Ticaret",
    THYRONIX: "THYRONIX",
    HIVE: "HIVE",
    HIVE_PRO: "HIVE Pro",
    LINKSLASH: "LinkSlash",
    POD_CREATOR: "POD Creator",
    AI_PAGE_FACTORY: "AI Page Factory",
    AI_DROPSHIP: "ENA Dropship",
    PRODUCT_LIBRARY: "Hazır Ürün Deposu",
  };
  return labels[key] || key;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    INACTIVE: "Pasif",
    TRIAL: "Deneme",
    PENDING_PAYMENT: "Ödeme Bekliyor",
    PENDING_APPROVAL: "Onay Bekliyor",
    ACTIVE: "Aktif",
    SUSPENDED: "Askıya Alındı",
    CANCELLED: "İptal Edildi",
    EXPIRED: "Süresi Doldu",
  };
  return labels[status] || status;
}
