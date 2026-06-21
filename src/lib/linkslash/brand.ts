/** LinkSlash görsel kimlik ve pazarlama sabitleri — ürün adı her yerde LinkSlash */

export const LINKSLASH_BRAND = {
  name: "LinkSlash",
  tagline: "Gördüğün her şeyi kaybetmeden kaydet.",
  subtitle:
    "LinkSlash; web, X, Instagram, YouTube, Reddit, WhatsApp, Telegram, Threads ve daha fazlasından linkleri tek tuşla kaydeder, yapay zekayla özetler ve cihazların arasında senkronize eder.",
  colors: {
    primary: "#22d3ee",
    primaryHover: "#06b6d4",
    accent: "#a855f7",
    accentMuted: "#7c3aed",
    dark: "#0b0d14",
    darkGradient: "linear-gradient(135deg, #0b0d14 0%, #111827 50%, #0f172a 100%)",
    cardBg: "rgba(255,255,255,0.05)",
    cardBorder: "rgba(255,255,255,0.1)",
  },
  routes: {
    gateway: "/gateway/linkslash",
    downloads: "/linkslash/downloads",
    mobileWeb: "/linkslash/mobile/",
    checkout: "/payment/checkout?type=module&moduleKey=LINKSLASH&planKey=starter",
    extensionManifest: "/linkslash/extension/manifest.json",
    extensionZip: "/downloads/linkslash/linkslash-extension.zip",
    androidApk: "/api/linkslash/download/android",
    extensionRelease: "/linkslash/extension/RELEASE.md",
    androidRelease: "/mobile/linkslash/RELEASE.md",
  },
} as const;

export const LINKSLASH_FEATURES = [
  { title: "Tek tıkla kayıt", desc: "Herhangi bir sayfadan veya paylaşım menüsünden anında kayıt." },
  { title: "Chrome Extension", desc: "Tarayıcıda tek tıkla yakalama ve ENAUNITY oturumu ile güvenli bağlantı." },
  { title: "Android Paylaş", desc: "WhatsApp, Instagram, Chrome ve daha fazlasından paylaşım menüsü ile kayıt." },
  { title: "Cloud Sync", desc: "Tüm cihazlarda aynı kütüphane — çakışma çözümü dahil." },
  { title: "AI Özet", desc: "Kaydedilen içeriği yapay zeka ile kısa özete dönüştürün." },
  { title: "AI Etiketleme", desc: "Otomatik kategori ve etiket önerileri." },
  { title: "SEO Brief", desc: "Linklerden SEO brief ve içerik fikri üretin." },
  { title: "Sosyal medya taslakları", desc: "X, LinkedIn ve diğer kanallar için taslak metinler." },
  { title: "Offline queue", desc: "Bağlantı yokken kayıt — senkron olunca otomatik gönderim." },
  { title: "Kişisel araştırma hafızası", desc: "Araştırma linklerinizi kaybetmeden arşivleyin." },
] as const;

export const LINKSLASH_SOURCES = [
  "Instagram",
  "Instagram Reels",
  "Threads",
  "X",
  "Reddit",
  "YouTube",
  "YouTube Shorts",
  "Chrome",
  "WhatsApp",
  "Telegram",
  "LinkedIn",
  "Facebook",
  "TikTok",
  "GitHub",
  "Medium",
  "Substack",
  "PDF",
  "Google Docs",
  "Notion",
  "Genel Web",
] as const;

export const LINKSLASH_USE_CASES = [
  { title: "İçerik üreticileri", desc: "İlham kaynaklarını, referansları ve trend linklerini kaybetmeden arşivleyin." },
  { title: "Ajanslar", desc: "Müşteri araştırmalarını, rakip analizlerini tek kütüphanede toplayın." },
  { title: "SEO uzmanları", desc: "Rakip ve kaynak linklerinden brief ve içerik fikri üretin." },
  { title: "E-ticaretçiler", desc: "Trend, ürün ve rakip linklerini kategorize edin." },
  { title: "Öğrenciler", desc: "Ders, makale ve kaynak linklerini AI ile özetleyin." },
  { title: "Araştırmacılar", desc: "Kaynakları etiketleyin, arayın ve senkronize edin." },
] as const;

export const LINKSLASH_FLOW = [
  "Paylaş / Kaydet",
  "LinkSlash",
  "AI analiz",
  "Cloud Sync",
  "İçerik fikri / SEO brief / sosyal taslak",
] as const;
