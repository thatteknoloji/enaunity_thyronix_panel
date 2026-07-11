"use client";

import { ThyronixAnalysisWorkspace } from "./workspace";

const DEFAULT_CONFIG = {
  apiPath: "/api/thyronix/analysis",
  badgeLabel: "THYRONIX Analiz Merkezi",
  title: "Rakip, ürün ve kârlılık kararlarını tek merkezde topla",
  description:
    "Bu fazda kârlılık motorunu çalışır şekilde açtım. Ürün analizi de hazır. Rakip analizi ise veri toplayıcı katmana bağlanacak şekilde hazırlanmış durumda.",
  countCardLabel: "Hazır Ürün",
  productPickerLabel: "THYRONIX ürününden doldur",
  productPickerButton: "Ürünü forma işle",
  productPickerHelp:
    "Son 40 ürün içinden maliyet, satış fiyatı ve içerik alanlarını tek tıkla bu motora taşı.",
  productAnalysisPickerLabel: "THYRONIX ürün seç",
  productAnalysisPickerButton: "Analize taşı",
  productAnalysisPickerHelp:
    "Görsel sayısı, başlık ve açıklama uzunluğu en son THYRONIX ürün verisiyle otomatik dolabilir.",
  loadingSourceLabel: "THYRONIX ürünleri",
} as const;

export default function ThyronixAnalysisPage() {
  return <ThyronixAnalysisWorkspace config={DEFAULT_CONFIG} />;
}
