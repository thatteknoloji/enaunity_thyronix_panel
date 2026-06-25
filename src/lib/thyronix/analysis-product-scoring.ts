import type { AnalysisFeedQuality } from "@/lib/analysis/types";

export type ProductAnalysisInput = {
  title: string;
  description: string;
  brand: string;
  barcode: string;
  imageCount: number;
  attributeCount: number;
  feedQuality?: AnalysisFeedQuality | null;
};

export type ProductAnalysisResult = {
  total: number;
  risks: string[];
  strengths: string[];
  feedIssues: string[];
  dimensions: {
    title: number;
    description: number;
    images: number;
    identity: number;
    attributes: number;
    feedQuality: number;
  };
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function scoreProductAnalysis(input: ProductAnalysisInput): ProductAnalysisResult {
  const titleLen = input.title.trim().length;
  const descLen = input.description.trim().length;
  const imageCount = input.imageCount || 0;
  const attrCount = input.attributeCount || 0;

  const titleScore = clamp((titleLen / 70) * 20, 0, 20);
  const descScore = clamp((descLen / 220) * 20, 0, 20);
  const imageScore = clamp((imageCount / 6) * 15, 0, 15);
  const idScore = (input.brand.trim() ? 6 : 0) + (input.barcode.trim() ? 9 : 0);
  const attrScore = clamp((attrCount / 6) * 10, 0, 10);

  let feedScore = 10;
  const feedIssues: string[] = [];
  const fq = input.feedQuality;
  if (fq) {
    feedScore = 25;
    if (!fq.hasCategory) {
      feedScore -= 4;
      feedIssues.push("Kategori eksik — pazaryeri eşleştirmesi zayıflar.");
    }
    if (!fq.hasBarcode) {
      feedScore -= 5;
      feedIssues.push("Barkod eksik — ürün eşleştirme riski yüksek.");
    }
    if (!fq.hasStockCode) {
      feedScore -= 3;
      feedIssues.push("Stok kodu eksik — ERP/depo senkronu zorlaşır.");
    }
    if (!fq.hasVat) {
      feedScore -= 3;
      feedIssues.push("KDV oranı eksik — fiyat hesabı güvenilmez.");
    }
    if (!fq.hasCostPrice) {
      feedScore -= 3;
      feedIssues.push("Maliyet alanı boş — kârlılık analizi eksik kalır.");
    }
    if (fq.variantCount < 1) {
      feedScore -= 2;
      feedIssues.push("Varyant bilgisi yok — çoklu ebat/renk beslemesi zayıf.");
    }
    if (fq.imageCount < 3) {
      feedScore -= 2;
      feedIssues.push("Görsel seti zayıf — dönüşüm ve güven skoru düşer.");
    }
    feedScore = clamp(feedScore, 0, 25);
  }

  const total = Math.round(titleScore + descScore + imageScore + idScore + attrScore + feedScore);

  const risks = [
    titleLen < 45 ? "Başlık kısa, pazaryeri aramalarında zayıf kalabilir." : null,
    descLen < 120 ? "Açıklama yetersiz, dönüşüm oranı düşebilir." : null,
    imageCount < 4 ? "Görsel sayısı düşük, güven hissi azalır." : null,
    !input.barcode.trim() ? "Barkod eksik, eşleştirme ve yayın sorunları çıkabilir." : null,
    attrCount < 3 ? "Varyant/özellik alanı zayıf, kategori beslemesi eksik kalabilir." : null,
    ...feedIssues,
  ].filter(Boolean) as string[];

  const strengths = [
    titleLen >= 55 ? "Başlık uzunluğu güçlü." : null,
    descLen >= 180 ? "Açıklama doluluk seviyesi iyi." : null,
    imageCount >= 5 ? "Görsel zenginliği yeterli." : null,
    input.barcode.trim() ? "Kimlik alanı hazır." : null,
    attrCount >= 4 ? "Özellik seti güçlü." : null,
    fq && fq.missingFields.length === 0 ? "Besleme alanları tam — feed kalitesi yüksek." : null,
    fq && fq.hasCostPrice && fq.hasVat ? "Maliyet ve KDV alanları analize hazır." : null,
  ].filter(Boolean) as string[];

  return {
    total,
    risks: [...new Set(risks)],
    strengths: [...new Set(strengths)],
    feedIssues,
    dimensions: {
      title: Math.round(titleScore),
      description: Math.round(descScore),
      images: Math.round(imageScore),
      identity: Math.round(idScore),
      attributes: Math.round(attrScore),
      feedQuality: Math.round(feedScore),
    },
  };
}
