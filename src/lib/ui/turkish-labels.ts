/**
 * Kullanıcıya görünen etiketler — backend enum/değerleri değiştirilmez.
 */

export function statusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  const map: Record<string, string> = {
    ACTIVE: "Aktif",
    INACTIVE: "Pasif",
    DRAFT: "Taslak",
    ARCHIVED: "Arşivlendi",
    PUBLISHED: "Yayında",
    PENDING: "Beklemede",
    PENDING_PAYMENT: "Ödeme Bekliyor",
    PENDING_APPROVAL: "Onay Bekliyor",
    MANUAL_REVIEW: "Manuel İnceleme",
    WAITING_PAYMENT: "Ödeme Bekliyor",
    PAID: "Ödendi",
    FAILED: "Başarısız",
    CANCELLED: "İptal Edildi",
    REFUNDED: "İade Edildi",
    TRIAL: "Deneme",
    SUSPENDED: "Askıya Alındı",
    EXPIRED: "Süresi Doldu",
    REVOKED: "İptal Edildi",
    COMPLETED: "Tamamlandı",
    RUNNING: "Çalışıyor",
    CONNECTED: "Bağlı",
    ERROR: "Hata",
    PROCESSED: "İşlendi",
    SHIPPED: "Kargoda",
    DELIVERED: "Teslim Edildi",
    WAITING_FOR_PACKING: "Paketleme Bekliyor",
    READY_TO_SHIP: "Kargoya Hazır",
    NEW: "Yeni",
    PACKED: "Paketlendi",
    HIGH: "Yüksek",
    MEDIUM: "Orta",
    LOW: "Düşük",
    LINKED: "Bağlı",
    DELETED: "Silindi",
  };
  return map[status] || status;
}

export function billingTypeLabel(type: string): string {
  const map: Record<string, string> = {
    FREE: "Ücretsiz",
    ONE_TIME: "Tek Seferlik",
    MONTHLY: "Aylık",
    YEARLY: "Yıllık",
  };
  return map[type] || type;
}

export function licenseLevelLabel(level: string): string {
  const map: Record<string, string> = {
    FREE: "Ücretsiz",
    STARTER: "Başlangıç",
    PRO: "Profesyonel",
    ENTERPRISE: "Kurumsal",
  };
  return map[level] || level;
}

export function packageFieldBehaviorLabel(behavior: string): string {
  const map: Record<string, string> = {
    LOCKED: "Kilitli",
    REPLACE: "Sabit Değer",
    PREFIX: "Önek Ekle",
    SUFFIX: "Sonek Ekle",
    FIND_REPLACE: "Metin Düzelt",
    NUMBER_FORMULA: "Sayı Formülü",
    HIDDEN: "Gizle",
  };
  return map[behavior] || behavior;
}

export function catalogFieldLabel(field: string): string {
  const map: Record<string, string> = {
    barcode: "Barkod",
    sku: "SKU",
    name: "Ürün Adı",
    brand: "Marka",
    category: "Kategori",
    price: "Fiyat",
    salePrice: "İndirimli Fiyat",
    stock: "Stok",
    vatRate: "KDV Oranı",
    description: "Açıklama",
    title: "Başlık",
    stockCode: "Stok Kodu",
  };
  return map[field] || field;
}

export const UI = {
  overview: "Genel Bakış",
  productLibraryAdmin: "Hazır Ürün Deposu",
  productLibraryDealer: "Hazır Ürünler",
  marketplaceHub: "Pazaryeri Merkezi",
  fulfillment: "Operasyon Merkezi",
  orders: "Siparişler",
  invoices: "Faturalar",
  payments: "Ödemeler",
  statements: "Ekstreler",
  warehouse: "Depo",
  shipments: "Sevkiyatlar",
  reports: "Raporlar",
  connections: "Bağlantılar",
  syncLogs: "Senkronizasyon Kayıtları",
  webhooks: "Bildirimler",
  distributionLogs: "İndirme Geçmişi",
  importJobs: "İçe Aktarım İşleri",
  packages: "Paketler",
  catalogs: "Kataloglar",
  suppliers: "Tedarikçiler",
  items: "Ürünler",
  costs: "Maliyetler",
  dealerAccounts: "Bayi Cari Hesapları",
  pickPack: "Toplama / Paketleme",
  products: "Ürünler",
  save: "Kaydet",
  cancel: "İptal",
  delete: "Sil",
  edit: "Düzenle",
  create: "Oluştur",
  update: "Güncelle",
  refresh: "Yenile",
  download: "İndir",
  upload: "Yükle",
  import: "İçe Aktar",
  export: "Dışa Aktar",
  view: "Görüntüle",
  details: "Detaylar",
  settings: "Ayarlar",
  logs: "Kayıtlar",
  status: "Durum",
  ecosystem: "Ekosistem",
  productShowcase: "Ekosistem Vitrini",
  moduleLicenses: "Modül Lisansları",
  modulePayments: "Modül Ödemeleri",
  productLinks: "Ürün Bağlantıları",
  customerProducts: "Müşteri Ürünleri",
  myProducts: "Ürünlerim",
  enaCommerce: "ENA Ticaret",
  featured: "Öne Çıkan",
  bestSeller: "Çok Satan",
  newBadge: "Yeni",
} as const;
