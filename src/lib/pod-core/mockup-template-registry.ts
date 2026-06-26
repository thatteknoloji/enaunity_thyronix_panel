import type { MockupFormulaHint, MockupTemplate, MockupView, PodAreaRect, PodPrintAreaMode } from "./pod-types";
import {
  getPodProductProfile,
  getPodProductProfileByTemplateId,
  listPodProductProfiles,
} from "./product-profiles/pod-product-profile-registry";
import type { PodMockupType } from "./product-profiles/pod-product-profile-types";

function svgPlaceholder(label: string, w: number, h: number, accent: string, mockupType?: PodMockupType): string {
  const inner =
    mockupType === "GLASS_CIRCLE"
      ? `<circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 2 - 24}" fill="#e2e8f0" stroke="${accent}" stroke-width="4"/>`
      : mockupType === "CARPET_ROOM" || mockupType === "RUG_ROOM"
        ? `<rect x="24" y="${h * 0.45}" width="${w - 48}" height="${h * 0.35}" rx="8" fill="#d6d3d1" stroke="${accent}" stroke-width="3"/><rect x="40" y="28" width="${w - 80}" height="${h * 0.55}" rx="6" fill="#e7e5e4" stroke="#a8a29e" stroke-width="2"/>`
        : mockupType === "CURTAIN_WINDOW"
          ? `<rect x="30" y="20" width="${w - 60}" height="${h - 40}" rx="4" fill="#dbeafe" stroke="#64748b" stroke-width="2"/><rect x="50" y="30" width="${w - 100}" height="${h - 70}" rx="2" fill="#f8fafc" stroke="${accent}" stroke-width="3" stroke-dasharray="8 4"/>`
          : mockupType === "PILLOW"
            ? `<rect x="${w * 0.25}" y="${h * 0.25}" width="${w * 0.5}" height="${h * 0.5}" rx="18" fill="#fce7f3" stroke="${accent}" stroke-width="3"/>`
            : mockupType === "BEDDING_SET"
              ? `<rect x="40" y="60" width="${w - 80}" height="${h - 120}" rx="10" fill="#ede9fe" stroke="${accent}" stroke-width="3"/><rect x="60" y="80" width="${(w - 80) / 2 - 10}" height="${h - 160}" rx="6" fill="#f5f3ff" stroke="#a78bfa" stroke-width="2"/>`
              : mockupType === "PUZZLE_GRID"
                ? `<rect x="40" y="40" width="${w - 80}" height="${h - 80}" rx="8" fill="#fef3c7" stroke="${accent}" stroke-width="3"/><path d="M${w / 2} 40 V${h - 40} M40 ${h / 2} H${w - 40}" stroke="#d97706" stroke-width="2"/>`
                : mockupType === "MUG_WRAP"
                  ? `<ellipse cx="${w / 2}" cy="${h * 0.55}" rx="${w * 0.28}" ry="${h * 0.22}" fill="#f1f5f9" stroke="${accent}" stroke-width="3"/><rect x="${w * 0.58}" y="${h * 0.42}" width="24" height="40" rx="8" fill="none" stroke="${accent}" stroke-width="3"/>`
                  : `<rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="12" fill="#e2e8f0" stroke="${accent}" stroke-width="3"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#f1f5f9"/>
  ${inner}
  <text x="50%" y="${mockupType === "GLASS_CIRCLE" ? "88%" : "50%"}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,sans-serif" font-size="16" fill="#64748b">${label}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const PRINT_AREAS: Record<string, PodAreaRect> = {
  "cam-tablo-front": { x: 60, y: 50, width: 280, height: 200 },
  "cam-yuvarlak-front": { x: 80, y: 60, width: 240, height: 240 },
  "mdf-tablo-front": { x: 50, y: 45, width: 300, height: 210 },
  "mdf-puzzle-front": { x: 40, y: 40, width: 320, height: 320 },
  "perde-front": { x: 30, y: 20, width: 340, height: 360 },
  "hali-front": { x: 40, y: 40, width: 320, height: 220 },
  "kilim-front": { x: 50, y: 50, width: 300, height: 200 },
  "kirlent-front": { x: 120, y: 120, width: 160, height: 160 },
  "nevresim-set": { x: 40, y: 40, width: 320, height: 240 },
  "poster-portrait": { x: 35, y: 35, width: 230, height: 330 },
  "mug-front": { x: 90, y: 80, width: 220, height: 140 },
};

const CANVAS_DIMS: Record<string, { width: number; height: number; orientation: "landscape" | "portrait"; variant: MockupView }> = {
  "cam-tablo-front": { width: 400, height: 300, orientation: "landscape", variant: "front" },
  "cam-yuvarlak-front": { width: 400, height: 400, orientation: "portrait", variant: "front" },
  "mdf-tablo-front": { width: 400, height: 300, orientation: "landscape", variant: "front" },
  "mdf-puzzle-front": { width: 400, height: 400, orientation: "portrait", variant: "front" },
  "perde-front": { width: 400, height: 420, orientation: "portrait", variant: "front" },
  "hali-front": { width: 400, height: 300, orientation: "landscape", variant: "front" },
  "kilim-front": { width: 400, height: 300, orientation: "landscape", variant: "front" },
  "kirlent-front": { width: 400, height: 400, orientation: "portrait", variant: "front" },
  "nevresim-set": { width: 400, height: 320, orientation: "landscape", variant: "front" },
  "poster-portrait": { width: 300, height: 400, orientation: "portrait", variant: "front" },
  "mug-front": { width: 400, height: 320, orientation: "landscape", variant: "front" },
};

const ACCENTS: Record<string, string> = {
  "Cam Tablo": "#38bdf8",
  "Yuvarlak Cam": "#0ea5e9",
  "MDF Tablo": "#f59e0b",
  "MDF Puzzle": "#d97706",
  Perde: "#818cf8",
  Halı: "#14b8a6",
  Kilim: "#0d9488",
  Kırlent: "#f472b6",
  Nevresim: "#c084fc",
  Poster: "#34d399",
  Kupa: "#f472b6",
};

function buildTemplateFromProfile(profileId: string): MockupTemplate | null {
  const profile = getPodProductProfile(profileId);
  if (!profile) return null;
  const dims = CANVAS_DIMS[profile.templateId];
  const printArea = PRINT_AREAS[profile.templateId];
  if (!dims || !printArea) return null;

  return {
    id: profile.templateId,
    name: profile.name,
    category: profile.category,
    profileId: profile.id,
    printAreaMode: profile.printAreaMode as PodPrintAreaMode,
    mockupType: profile.mockupType,
    printArea,
    bleed: profile.mockupType === "PILLOW" ? 5 : profile.mockupType === "PUZZLE_GRID" ? 6 : 10,
    safeArea: profile.mockupType === "PILLOW" ? 8 : 12,
    orientation: dims.orientation,
    variant: dims.variant,
    width: dims.width,
    height: dims.height,
    pricingRuleCode: profile.pricingRuleCode,
    pricingCatalogId: profile.catalogId,
    materialCode: profile.materialCode,
    variantId: profile.variantId,
    defaultSize: profile.defaultSize,
    defaultQuantity: profile.defaultQuantity,
    formulaHint: profile.formulaHint as MockupFormulaHint,
    image: svgPlaceholder(profile.name, dims.width, dims.height, ACCENTS[profile.category] || "#94a3b8", profile.mockupType),
    warnings: profile.warnings,
  };
}

export const MOCKUP_TEMPLATE_REGISTRY: MockupTemplate[] = listPodProductProfiles()
  .map((p) => buildTemplateFromProfile(p.id))
  .filter((t): t is MockupTemplate => Boolean(t));

export function getMockupTemplate(id: string): MockupTemplate | undefined {
  return MOCKUP_TEMPLATE_REGISTRY.find((t) => t.id === id);
}

export function getDefaultMockupTemplate(): MockupTemplate {
  return MOCKUP_TEMPLATE_REGISTRY[0];
}

export function listMockupTemplates(): MockupTemplate[] {
  return [...MOCKUP_TEMPLATE_REGISTRY];
}

export { getPodProductProfileByTemplateId };
