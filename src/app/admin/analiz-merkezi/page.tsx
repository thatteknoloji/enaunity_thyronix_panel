"use client";

import { ThyronixAnalysisWorkspace, type AnalysisWorkspaceConfig } from "@/app/thyronix/analysis/workspace";

const ADMIN_ANALYSIS_CONFIG: AnalysisWorkspaceConfig = {
  apiPath: "/api/admin/analysis",
  badgeLabel: "ENA Analiz Merkezi",
  title: "Kârlılık, ürün kalitesi ve rakip analizi",
  description:
    "Tüm platform ürünleri üzerinden pazaryeri komisyonu, kargo, reklam ve kampanya maliyetlerini hesaplayın. Ürün feed kalitesini ve rakip mağaza sinyallerini aynı ekrandan yönetin.",
  countCardLabel: "Katalog Ürünü",
  productPickerLabel: "Katalog ürününden doldur",
  productPickerButton: "Ürünü forma işle",
  productPickerHelp:
    "Canlı ürün kataloğundan maliyet, satış fiyatı ve kimlik alanlarını kârlılık motoruna taşıyın.",
  productAnalysisPickerLabel: "Katalog ürünü seç",
  productAnalysisPickerButton: "Analize taşı",
  productAnalysisPickerHelp:
    "Başlık, barkod, kategori ve görsel sayısını ürün analizi sekmesine tek tıkla aktarın.",
  loadingSourceLabel: "platform katalog ürünleri",
};

export default function AdminAnalizMerkeziPage() {
  return (
    <div className="p-4 md:p-6">
      <ThyronixAnalysisWorkspace config={ADMIN_ANALYSIS_CONFIG} />
    </div>
  );
}
