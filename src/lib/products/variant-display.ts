export const VARIANT_DISPLAY_MODES = ["buttons", "select", "modal", "popup", "drawer", "grid"] as const;
export type VariantDisplayMode = (typeof VARIANT_DISPLAY_MODES)[number];

export const VARIANT_DISPLAY_LABELS: Record<VariantDisplayMode, string> = {
  buttons: "Buton (chip)",
  select: "Açılır liste (select)",
  modal: "Modal pencere",
  popup: "Açılır panel (popup)",
  drawer: "Yan çekmece (drawer)",
  grid: "Izgara kartları",
};

export function normalizeVariantDisplayMode(mode: unknown): VariantDisplayMode {
  if (typeof mode === "string" && VARIANT_DISPLAY_MODES.includes(mode as VariantDisplayMode)) {
    return mode as VariantDisplayMode;
  }
  return "buttons";
}
