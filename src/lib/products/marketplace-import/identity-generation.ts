import {
  buildVariantIdentityCodes,
  type ProductIdentityGenerationSettings,
} from "@/lib/products/product-identity-generation";
import type { ParsedImportRow } from "./types";

function text(value: unknown) {
  return String(value ?? "").trim();
}

export function applyImportIdentityGeneration(
  rows: ParsedImportRow[],
  settings: ProductIdentityGenerationSettings & { autoSeo?: boolean } = {},
) {
  if (!settings.enabled) return rows;

  const grouped = new Map<string, ParsedImportRow[]>();
  for (const row of rows) {
    const key = row.modelCode || row.sku || row.barcode || `row-${row.rowIndex}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  const nextRows = [...rows];
  const rowIndexMap = new Map(rows.map((row, index) => [row, index]));

  for (const groupRows of grouped.values()) {
    const base = groupRows[0];
    const generated = buildVariantIdentityCodes({
      baseSku: settings.skuPrefix || base.modelCode || base.sku,
      baseModelCode: base.modelCode,
      productName: base.name,
      variants: groupRows.map((row) => ({
        sku: row.sku,
        barcode: row.barcode,
        options: row.variantOptions,
      })),
      settings,
    });

    groupRows.forEach((row, localIndex) => {
      const globalIndex = rowIndexMap.get(row);
      if (globalIndex === undefined) return;
      const codes = generated[localIndex];
      const next = { ...row };
      if (!text(next.sku)) next.sku = codes?.sku || next.sku;
      if (!text(next.barcode)) next.barcode = codes?.barcode || next.barcode;
      next.errors = next.errors.filter((error) => {
        if (next.sku && error.includes("Stok Kodu")) return false;
        if (next.barcode && error.includes("Barkod")) return false;
        return true;
      });
      if (settings.autoSeo) {
        next.seoTitle = next.seoTitle || next.name;
        next.seoDescription = next.seoDescription || next.description || `${next.name} ürününü ENA Unity B2B kataloğunda inceleyin.`;
        next.seoKeywords = next.seoKeywords || [next.brand, next.category, next.modelCode].filter(Boolean).join(", ");
        next.aeoAnswerSummary = next.aeoAnswerSummary || next.description || next.name;
      }
      nextRows[globalIndex] = next;
    });
  }

  return nextRows;
}

