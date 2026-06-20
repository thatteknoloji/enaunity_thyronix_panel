/** Sözleşme tipleri — bayi-atama dışındakiler /contracts listesinde görünür */
export const PUBLIC_CONTRACT_TYPES = ["public", "page", "legal"] as const;

export function isPublicContractType(type: string) {
  return (PUBLIC_CONTRACT_TYPES as readonly string[]).includes(type);
}
