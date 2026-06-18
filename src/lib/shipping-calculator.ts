const CARRIERS = ["Yurtiçi Kargo","Aras Kargo","Sürat Kargo","Trendyol Express","Hepsiburada Kargo","UPS","PTT Kargo","MNG Kargo","FedEx","Diğer"];

export function calculateDesi(weight: number, dimensions: string): number {
  if (!dimensions || !weight) return Math.max(1, Math.ceil(weight));
  const parts = dimensions.split("x").map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
  if (parts.length < 3) return Math.max(1, Math.ceil(weight));

  const [w, h, d] = parts;
  const volumeDesi = (w * h * d) / 3000; // cm³ to desi
  return Math.max(1, Math.ceil(Math.max(weight, volumeDesi)));
}

export function calculateShipping(desi: number, config: { basePrice: number; perDesi: number; manualPrice: number; freeShipping: boolean; freeOver: number }, cartTotal: number): number {
  if (config.freeShipping) return 0;
  if (config.freeOver > 0 && cartTotal >= config.freeOver) return 0;
  if (config.manualPrice > 0) return config.manualPrice;
  return config.basePrice + (desi * config.perDesi);
}

export { CARRIERS };
