import type { ClusterChain } from "./types";
import { buildProductTree, buildLocationTree } from "./topology-engine";

const STYLE_MODIFIERS = ["", "Modern ", "Klasik ", "Minimal "];
const ROOM_MODIFIERS = ["Salon ", "Ofis ", "Yatak Odası "];

/** Cluster zinciri — içerik üretmez, hiyerarşik yol planlar */
export function buildClusterChains(sector: string, country: string, maxSamples = 24): ClusterChain[] {
  const productNodes = buildProductTree(sector).filter((n) => n.depth === 1);
  const locationNodes = buildLocationTree(country).filter((n) => n.depth <= 1);

  const chains: ClusterChain[] = [];
  let id = 0;

  const rootProduct = sector.trim() || "Ürün";

  for (const style of STYLE_MODIFIERS.slice(0, 2)) {
    for (const room of ROOM_MODIFIERS.slice(0, 2)) {
      const productLabel = `${style}${room}${rootProduct}`.trim();
      const path = [rootProduct, `${room.trim()}${rootProduct}`.trim(), productLabel];

      for (const loc of locationNodes.slice(0, 3)) {
        for (const subLoc of buildLocationTree(country).filter((n) => n.parentId === loc.id).slice(0, 2)) {
          const fullPath = [...path, productLabel, `${loc.label}`, `${subLoc.label}`];
          chains.push({
            id: `cluster-${id++}`,
            path: fullPath,
            fullLabel: fullPath.join(" → "),
            hierarchyLevel: fullPath.length - 1,
          });
          if (chains.length >= maxSamples) return chains;
        }

        const locPath = [...path, productLabel, loc.label];
        chains.push({
          id: `cluster-${id++}`,
          path: locPath,
          fullLabel: locPath.join(" → "),
          hierarchyLevel: locPath.length - 1,
        });
        if (chains.length >= maxSamples) return chains;
      }

      chains.push({
        id: `cluster-${id++}`,
        path,
        fullLabel: path.join(" → "),
        hierarchyLevel: path.length - 1,
      });
      if (chains.length >= maxSamples) return chains;
    }
  }

  // Örnek: Cam Tablo → Salon Cam Tablo → Modern Salon Cam Tablo → … İstanbul → Kadıköy
  if (chains.length === 0 && productNodes.length) {
    chains.push({
      id: "cluster-example",
      path: [
        rootProduct,
        `Salon ${rootProduct}`,
        `Modern Salon ${rootProduct}`,
        `Modern Salon ${rootProduct} İstanbul`,
        `Modern Salon ${rootProduct} İstanbul Kadıköy`,
      ],
      fullLabel: `${rootProduct} → Salon ${rootProduct} → Modern Salon ${rootProduct} → Modern Salon ${rootProduct} İstanbul → Modern Salon ${rootProduct} İstanbul Kadıköy`,
      hierarchyLevel: 4,
    });
  }

  return chains;
}

export function estimateClusterCount(sector: string, country: string): number {
  const products = buildProductTree(sector).filter((n) => n.depth >= 1).length || 4;
  const locations = buildLocationTree(country).length || 10;
  return Math.max(products * locations * STYLE_MODIFIERS.length, 1);
}
