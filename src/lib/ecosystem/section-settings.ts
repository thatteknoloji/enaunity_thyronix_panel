export type EcosystemShowcaseSettingsDTO = {
  id: string;
  enabled: boolean;
  badgeText: string;
  title: string;
  description: string;
  columns: number;
  anchorId: string;
  bgPrimaryColor: string;
  bgSecondaryColor: string;
  paddingTop: string;
  paddingBottom: string;
  updatedAt: string;
};

export const DEFAULT_ECOSYSTEM_SECTION: Omit<EcosystemShowcaseSettingsDTO, "id" | "updatedAt"> = {
  enabled: true,
  badgeText: "ENAUNITY Ecosystem",
  title: "Profesyonel ticaret ve büyüme ekosistemi",
  description:
    "Bir panele değil; B2B ticaret, ürün operasyonu ve dijital büyüme motorlarından oluşan entegre bir platforma giriyorsunuz.",
  columns: 3,
  anchorId: "ecosystem",
  bgPrimaryColor: "#3b82f6",
  bgSecondaryColor: "#8b5cf6",
  paddingTop: "24",
  paddingBottom: "28",
};
