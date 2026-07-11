import type { TopologyNode, ProductionType } from "./types";
import { buildGeoTree } from "./geo-engine";

function node(id: string, label: string, depth: number, parentId?: string): TopologyNode {
  return { id, label, depth, parentId };
}

/** Ürün ağacı — sektör kökünden varyantlara */
export function buildProductTree(sector: string): TopologyNode[] {
  const root = sector.trim() || "Ürün";
  const nodes: TopologyNode[] = [node("prod-root", root, 0)];

  const variants: Record<string, string[]> = {
    "cam tablo": ["Salon Cam Tablo", "Modern Cam Tablo", "Ofis Cam Tablo", "Çocuk Odası Cam Tablo"],
    default: ["Standart", "Premium", "Kurumsal", "Özel Ölçü"],
  };

  const key = root.toLowerCase();
  const list = variants[key] || variants.default;

  list.forEach((label, i) => {
    nodes.push(node(`prod-${i}`, label, 1, "prod-root"));
    nodes.push(node(`prod-${i}-mod`, `${label} — Modeller`, 2, `prod-${i}`));
  });

  return nodes;
}

/** Lokasyon ağacı — GEO katmanlarından türetilir */
export function buildLocationTree(country: string): TopologyNode[] {
  const { nodes: geoNodes } = buildGeoTree(country);
  return geoNodes.map((g) =>
    node(`loc-${g.id}`, g.name, g.layer === "il" ? 0 : g.layer === "ilce" ? 1 : 2, g.parentId ? `loc-${g.parentId}` : undefined)
  );
}

/** Soru ağacı — arama / SSS niyetleri */
export function buildQuestionTree(sector: string): TopologyNode[] {
  const root = sector.trim() || "Ürün";
  const questions = [
    `${root} nedir?`,
    `${root} fiyatları ne kadar?`,
    `${root} nasıl seçilir?`,
    `${root} ölçüleri nelerdir?`,
    `${root} hangi odada kullanılır?`,
  ];
  return [
    node("q-root", "Soru Ağacı", 0),
    ...questions.map((q, i) => node(`q-${i}`, q, 1, "q-root")),
  ];
}

/** Niyet ağacı — ticari / bilgi / karşılaştırma */
export function buildIntentTree(_sector: string): TopologyNode[] {
  return [
    node("int-root", "Niyet Ağacı", 0),
    node("int-info", "Bilgi Amaçlı", 1, "int-root"),
    node("int-buy", "Satın Alma", 1, "int-root"),
    node("int-compare", "Karşılaştırma", 1, "int-root"),
    node("int-local", "Yerel Arama", 1, "int-root"),
    node("int-brand", "Marka", 2, "int-buy"),
    node("int-price", "Fiyat", 2, "int-buy"),
  ];
}

export function buildAllTopologies(sector: string, country: string, productionType: ProductionType) {
  const topologies: Record<string, TopologyNode[]> = {
    location: buildLocationTree(country),
    product: buildProductTree(sector),
    question: buildQuestionTree(sector),
    intent: buildIntentTree(sector),
  };

  const includeGeo = productionType === "GEO" || productionType === "GEO_SEO" || productionType === "MIXED";
  if (includeGeo) {
    const geo = buildGeoTree(country);
    topologies.geo = geo.nodes.map((g) => node(`geo-${g.id}`, `${g.layer}: ${g.name}`, g.layer === "il" ? 0 : 1, g.parentId ? `geo-${g.parentId}` : undefined));
  }

  return topologies;
}
