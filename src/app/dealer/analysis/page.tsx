"use client";

import ThyronixAnalysisPage, { type AnalysisWorkspaceConfig } from "@/app/thyronix/analysis/page";

const ENA_ANALYSIS_CONFIG: AnalysisWorkspaceConfig = {
  apiPath: "/api/dealer/analysis",
  badgeLabel: "ENA Analiz Merkezi",
  title: "Rakip, ürün ve kârlılık analizini bayi paneline taşı",
  description:
    "Bu alan artık ENA tarafında çalışıyor. Bayi kendi ürünlerini baz alarak fiyat, rakip ve ürün kalitesi kararlarını aynı panelden yönetebiliyor.",
  countCardLabel: "ENA Ürünü",
  productPickerLabel: "ENA ürününden doldur",
  productPickerButton: "Ürünü forma işle",
  productPickerHelp:
    "Bayi ürünlerinden seçim yapıp fiyat, içerik ve ürün kimliğini doğrudan kârlılık motoruna taşı.",
  productAnalysisPickerLabel: "ENA ürünü seç",
  productAnalysisPickerButton: "Analize taşı",
  productAnalysisPickerHelp:
    "Bayi ürünlerindeki başlık, açıklama ve görsel yapısını ürün analizi tarafına tek tıkla yükle.",
  loadingSourceLabel: "ENA ürünleri",
};

export default function DealerAnalysisPage() {
  return <ThyronixAnalysisPage config={ENA_ANALYSIS_CONFIG} />;
}
