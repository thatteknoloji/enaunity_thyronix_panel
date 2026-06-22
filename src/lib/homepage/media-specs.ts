export const BANNER_DISPLAY_MODES = [
  { value: "single", label: "Tekli", desc: "Yalnızca ilk banner gösterilir." },
  { value: "carousel", label: "Carousel", desc: "Bannerlar sırayla döner. Birden fazla kampanya için ideal." },
  { value: "grid", label: "Izgara (Grid)", desc: "2–3 banner yan yana aynı anda görünür." },
  { value: "strip", label: "Yatay Şerit", desc: "Tüm bannerlar yatay kaydırmalı şeritte." },
] as const;

export const PAGE_PLACEMENTS = [
  { value: "after_hero", label: "Hero videosu altı" },
  { value: "after_features", label: "Özellik kartları altı" },
  { value: "after_search", label: "Arama bölümü altı" },
  { value: "before_category", label: "Kategori satırı üstü (belirli kategori)" },
  { value: "after_category", label: "Kategori satırı altı (belirli kategori)" },
  { value: "between_categories", label: "Kategori satırları arası (ortada)" },
  { value: "before_ecosystem", label: "Ekosistem vitrini öncesi" },
  { value: "before_partners", label: "İş ortakları öncesi" },
  { value: "before_cta", label: "Alt e-posta CTA öncesi" },
] as const;

export const SLOT_CONTENT_ALIGNS = [
  { value: "left", label: "Sola hizala" },
  { value: "center", label: "Ortala" },
  { value: "right", label: "Sağa hizala" },
] as const;

export const SLOT_MOBILE_LAYOUTS = [
  { value: "default", label: "Mobil: varsayılan" },
  { value: "full", label: "Mobil: tam genişlik" },
  { value: "hidden", label: "Mobilde gizle" },
] as const;

export const BANNER_MEDIA_TYPES = [
  { value: "image", label: "Görsel" },
  { value: "video", label: "Video" },
] as const;

export const MEDIA_SPECS = {
  banner: {
    desktop: { width: 1920, height: 640, ratio: "3:1", maxKb: 400, formats: ["WebP", "JPEG"] },
    tablet: { width: 1200, height: 480, ratio: "5:2", maxKb: 280, formats: ["WebP", "JPEG"] },
    mobile: { width: 750, height: 940, ratio: "4:5", maxKb: 200, formats: ["WebP", "JPEG"] },
  },
  hero: {
    videoDesktop: { maxMb: 15, formats: ["MP4 (H.264)"], resolution: "1920×1080", duration: "≤30 sn" },
    videoMobile: { maxMb: 8, formats: ["MP4 (H.264)"], resolution: "720×1280", duration: "≤20 sn" },
    poster: { width: 1920, height: 1080, maxKb: 250, formats: ["WebP", "JPEG"] },
  },
} as const;

export function formatSpecLine(spec: { width?: number; height?: number; maxKb?: number; maxMb?: number; formats?: readonly string[]; ratio?: string; resolution?: string; duration?: string }) {
  const parts: string[] = [];
  if (spec.width && spec.height) parts.push(`${spec.width}×${spec.height}px`);
  if (spec.ratio) parts.push(`oran ${spec.ratio}`);
  if (spec.resolution) parts.push(spec.resolution);
  if (spec.maxKb) parts.push(`≤${spec.maxKb} KB`);
  if (spec.maxMb) parts.push(`≤${spec.maxMb} MB`);
  if (spec.duration) parts.push(spec.duration);
  if (spec.formats) parts.push(spec.formats.join(" / "));
  return parts.join(" · ");
}
