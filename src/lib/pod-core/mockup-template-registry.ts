import type { MockupTemplate } from "./pod-types";

function svgPlaceholder(label: string, w: number, h: number, accent: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#f1f5f9"/>
  <rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="12" fill="#e2e8f0" stroke="${accent}" stroke-width="3"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,sans-serif" font-size="18" fill="#64748b">${label}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const STUBS: Omit<MockupTemplate, "image">[] = [
  {
    id: "cam-tablo-front",
    name: "Cam Tablo",
    category: "Cam Tablo",
    printArea: { x: 60, y: 50, width: 280, height: 200 },
    bleed: 10,
    safeArea: 14,
    orientation: "landscape",
    variant: "front",
    width: 400,
    height: 300,
    pricingRuleCode: "GLASS_PRINT_M2_V1",
    materialCode: "GLASS_M2",
    variantId: "cam-tablo-front-v1",
    defaultSize: { widthCm: 300, heightCm: 180 },
    defaultQuantity: 1,
    formulaHint: "AREA",
  },
  {
    id: "canvas-front",
    name: "Canvas",
    category: "Canvas",
    printArea: { x: 40, y: 40, width: 320, height: 220 },
    bleed: 12,
    safeArea: 16,
    orientation: "landscape",
    variant: "front",
    width: 400,
    height: 300,
    pricingRuleCode: "CANVAS_M2_V1",
    materialCode: "CANVAS_M2",
    variantId: "canvas-front-v1",
    defaultSize: { widthCm: 100, heightCm: 70 },
    defaultQuantity: 1,
    formulaHint: "AREA",
  },
  {
    id: "mdf-front",
    name: "MDF",
    category: "MDF",
    printArea: { x: 50, y: 45, width: 300, height: 210 },
    bleed: 8,
    safeArea: 12,
    orientation: "landscape",
    variant: "front",
    width: 400,
    height: 300,
    pricingRuleCode: "MDF_PRINT_M2_V1",
    materialCode: "MDF_M2",
    variantId: "mdf-front-v1",
    defaultSize: { widthCm: 120, heightCm: 80 },
    defaultQuantity: 1,
    formulaHint: "AREA",
  },
  {
    id: "poster-portrait",
    name: "Poster",
    category: "Poster",
    printArea: { x: 35, y: 35, width: 230, height: 330 },
    bleed: 10,
    safeArea: 15,
    orientation: "portrait",
    variant: "front",
    width: 300,
    height: 400,
    pricingRuleCode: "POSTER_M2_V1",
    materialCode: "POSTER_M2",
    variantId: "poster-portrait-v1",
    defaultSize: { widthCm: 70, heightCm: 100 },
    defaultQuantity: 1,
    formulaHint: "AREA",
  },
  {
    id: "sticker-front",
    name: "Sticker",
    category: "Sticker",
    printArea: { x: 50, y: 50, width: 300, height: 200 },
    bleed: 5,
    safeArea: 8,
    orientation: "landscape",
    variant: "front",
    width: 400,
    height: 300,
    pricingRuleCode: "STICKER_M2_V1",
    materialCode: "STICKER_M2",
    variantId: "sticker-front-v1",
    defaultSize: { widthCm: 50, heightCm: 30 },
    defaultQuantity: 1,
    formulaHint: "AREA",
  },
  {
    id: "mug-front",
    name: "Kupa",
    category: "Kupa",
    printArea: { x: 90, y: 80, width: 220, height: 140 },
    bleed: 6,
    safeArea: 10,
    orientation: "landscape",
    variant: "front",
    width: 400,
    height: 320,
    pricingRuleCode: "MUG_PIECE_V1",
    materialCode: "MUG_PIECE",
    variantId: "mug-front-v1",
    defaultSize: { widthCm: 0, heightCm: 0 },
    defaultQuantity: 1,
    formulaHint: "PIECE",
  },
  {
    id: "tshirt-front",
    name: "Tişört",
    category: "Tişört",
    printArea: { x: 110, y: 90, width: 180, height: 200 },
    bleed: 8,
    safeArea: 12,
    orientation: "portrait",
    variant: "front",
    width: 400,
    height: 420,
    pricingRuleCode: "DTF_PIECE_V1",
    materialCode: "DTF_PIECE",
    variantId: "tshirt-front-v1",
    defaultSize: { widthCm: 0, heightCm: 0 },
    defaultQuantity: 1,
    formulaHint: "PIECE",
  },
];

const ACCENTS: Record<string, string> = {
  "Cam Tablo": "#38bdf8",
  Canvas: "#a78bfa",
  MDF: "#f59e0b",
  Poster: "#34d399",
  Sticker: "#eab308",
  Kupa: "#f472b6",
  Tişört: "#6366f1",
};

export const MOCKUP_TEMPLATE_REGISTRY: MockupTemplate[] = STUBS.map((s) => ({
  ...s,
  image: svgPlaceholder(s.name, s.width, s.height, ACCENTS[s.category] || "#94a3b8"),
}));

export function getMockupTemplate(id: string): MockupTemplate | undefined {
  return MOCKUP_TEMPLATE_REGISTRY.find((t) => t.id === id);
}

export function getDefaultMockupTemplate(): MockupTemplate {
  return MOCKUP_TEMPLATE_REGISTRY[0];
}

export function listMockupTemplates(): MockupTemplate[] {
  return [...MOCKUP_TEMPLATE_REGISTRY];
}
