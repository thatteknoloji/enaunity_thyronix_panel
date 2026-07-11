export const CONTRACT_TYPES = ["public", "dealer"] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  public: "Herkese Açık",
  dealer: "Bayi Sözleşmesi",
  legal: "Yasal (eski)",
  page: "Sayfa (eski)",
};

export function contractTypeLabel(type: string): string {
  return CONTRACT_TYPE_LABELS[type] || type;
}

export function isPublicContractListing(type: string): boolean {
  return type === "public" || type === "legal" || type === "page";
}
