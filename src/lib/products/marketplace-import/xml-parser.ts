import { XMLParser } from "fast-xml-parser";
import type { FieldMapping, ParsedImportRow } from "./types";

function cell(obj: Record<string, unknown>, tag?: string): string {
  if (!tag || !obj[tag]) return "";
  const v = obj[tag];
  if (typeof v === "object" && v !== null && "#text" in (v as object)) {
    return String((v as { "#text": unknown })["#text"] ?? "").trim();
  }
  return String(v ?? "").trim();
}

function findItems(parsed: Record<string, unknown>): Record<string, unknown>[] {
  for (const val of Object.values(parsed)) {
    if (!val || typeof val !== "object") continue;
    const obj = val as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      const lower = k.toLowerCase();
      if (lower.includes("product") || lower === "item" || lower === "urun") {
        if (Array.isArray(v)) return v as Record<string, unknown>[];
        if (v && typeof v === "object") return [v as Record<string, unknown>];
      }
    }
    const nested = findItems(obj);
    if (nested.length) return nested;
  }
  return [];
}

/** Parse marketplace XML export into flat import rows (one row per variant item). */
export function parseXmlImportRows(xml: string, mapping: FieldMapping): ParsedImportRow[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseTagValue: false,
    trimValues: true,
  });

  const parsed = parser.parse(xml) as Record<string, unknown>;
  const items = findItems(parsed);
  const rows: ParsedImportRow[] = [];

  const variantAxisEntries = Object.entries(mapping.variantAxes || {});

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const variantOptions = variantAxisEntries
      .map(([group, tag]) => ({ group, value: cell(item, tag) }))
      .filter((o) => o.value);

    const images: string[] = [];
    for (const col of mapping.images || (mapping.image ? [mapping.image] : [])) {
      const v = cell(item, col);
      if (v.startsWith("http")) images.push(v);
    }

    const modelCode = cell(item, mapping.modelCode);
    const sku = cell(item, mapping.sku);
    const barcode = cell(item, mapping.barcode);
    const errors: string[] = [];
    if (!modelCode) errors.push("Model Kodu eksik");
    if (!sku) errors.push("Stok Kodu eksik");
    if (!barcode) errors.push("Barkod eksik");

    rows.push({
      rowIndex: i + 1,
      name: cell(item, mapping.name) || modelCode,
      description: cell(item, mapping.description),
      brand: cell(item, mapping.brand),
      category: cell(item, mapping.category),
      modelCode,
      sku,
      barcode,
      price: parseFloat(cell(item, mapping.price).replace(",", ".")) || 0,
      stock: parseInt(cell(item, mapping.stock), 10) || 0,
      image: images[0] || cell(item, mapping.image),
      images,
      variantOptions,
      raw: item,
      errors,
      warnings: [],
    });
  }

  return rows;
}
