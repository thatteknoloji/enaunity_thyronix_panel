/** Kârlılık senaryoları — istemci tarafı kalıcı depolama (DB migration gerektirmez) */

export type ProfitScenarioSnapshot = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  marketplace: string;
  category: string;
  cost: string;
  vatRate: string;
  selectedCargo: string;
  shippingFee: string;
  packagingFee: string;
  extraFixedFee: string;
  paymentFeeRate: string;
  adRate: string;
  campaignRate: string;
  targetProfitTl: string;
  targetMarginRate: string;
  manualPrice: string;
  productTitle: string;
  linkedProductId?: string;
};

const STORAGE_PREFIX = "ena-analysis-profit-scenarios:";

function storageKey(scope: string): string {
  return `${STORAGE_PREFIX}${scope}`;
}

export function listProfitScenarios(scope: string): ProfitScenarioSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProfitScenarioSnapshot[];
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : [];
  } catch {
    return [];
  }
}

export function saveProfitScenario(scope: string, scenario: ProfitScenarioSnapshot): ProfitScenarioSnapshot[] {
  if (typeof window === "undefined") return [];
  const items = listProfitScenarios(scope);
  const idx = items.findIndex((item) => item.id === scenario.id);
  const next = idx >= 0 ? items.map((item, i) => (i === idx ? scenario : item)) : [scenario, ...items];
  localStorage.setItem(storageKey(scope), JSON.stringify(next.slice(0, 20)));
  return next.slice(0, 20);
}

export function deleteProfitScenario(scope: string, id: string): ProfitScenarioSnapshot[] {
  if (typeof window === "undefined") return [];
  const next = listProfitScenarios(scope).filter((item) => item.id !== id);
  localStorage.setItem(storageKey(scope), JSON.stringify(next));
  return next;
}

export function createScenarioId(): string {
  return `ps-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
