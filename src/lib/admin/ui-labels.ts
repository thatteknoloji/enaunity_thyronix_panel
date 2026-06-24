/** Kullanıcıya görünen Türkçe etiketler — enum/DB/API isimleri değişmez */

export const CONTENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Taslak",
  REVIEW: "İncelemede",
  APPROVED: "Onaylandı",
  SCHEDULED: "Zamanlandı",
  PUBLISHED: "Yayında",
  ARCHIVED: "Arşivlendi",
  REJECTED: "Reddedildi",
  READY: "Hazır",
  RUNNING: "Çalışıyor",
  COMPLETED: "Tamamlandı",
  FAILED: "Başarısız",
  IMPORTED: "İçe aktarıldı",
  ANALYZED: "Analiz edildi",
  PLANNED: "Planlandı",
  GENERATED: "Üretildi",
  PENDING: "Beklemede",
};

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  BLOG: "Blog",
  PAGE: "Sayfa",
  PRODUCT: "Ürün",
  RECOVERY_PAGE: "Kurtarma Sayfası",
  GEO: "GEO",
};

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  KEYWORD: "Anahtar Kelime",
  KEYWORD_GROUP: "Anahtar Kelime Grubu",
  PRODUCT: "Ürün",
  CATEGORY: "Kategori",
  GEO: "GEO",
  COMPETITOR_STRUCTURE: "Rakip Yapısı",
};

export const MODULE_TITLES = {
  blogEngine: "Blog Merkezi",
  pageFactory: "Sayfa Merkezi",
  contentPlanning: "İçerik Planlama Merkezi",
  contentQuality: "İçerik Kalite Merkezi",
  publishingCenter: "Yayın Merkezi",
  contentOperations: "İçerik Operasyon Merkezi",
  legacyRecovery: "Link Kurtarma Merkezi",
  productUniverse: "Ürün Evreni",
  geoFactory: "GEO İçerik Fabrikası",
} as const;

export function labelContentStatus(status: string): string {
  return CONTENT_STATUS_LABELS[status] || status;
}

export function labelContentType(type: string): string {
  return CONTENT_TYPE_LABELS[type] || type;
}

export function labelSourceType(type: string): string {
  return SOURCE_TYPE_LABELS[type] || type;
}
