import type { GroupedProduct, ParsedImportRow } from "./types";

/** Pick parent title: most frequent name; tie → longest */
function pickParentName(rows: ParsedImportRow[]): string {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const n = r.name.trim();
    if (!n) continue;
    counts.set(n, (counts.get(n) || 0) + 1);
  }
  if (counts.size === 0) return rows[0]?.modelCode || "Ürün";

  let best = "";
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount || (count === bestCount && name.length > best.length)) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

/** Pick parent description: longest non-empty (richest content) */
function pickParentDescription(rows: ParsedImportRow[]): string {
  let best = "";
  for (const r of rows) {
    const d = r.description.trim();
    if (d.length > best.length) best = d;
  }
  return best;
}

function pickMostCommon(rows: ParsedImportRow[], field: keyof ParsedImportRow): string {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const v = String(r[field] || "").trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  for (const [val, count] of counts) {
    if (count > bestCount) { best = val; bestCount = count; }
  }
  return best;
}

/** Group rows by Model Kodu → one parent product per model code */
export function groupByModelCode(rows: ParsedImportRow[]): {
  groups: GroupedProduct[];
  ungroupedRows: ParsedImportRow[];
} {
  const byModel = new Map<string, ParsedImportRow[]>();
  const ungroupedRows: ParsedImportRow[] = [];

  for (const row of rows) {
    if (row.errors.some((e) => e.includes("Model Kodu"))) {
      ungroupedRows.push(row);
      continue;
    }
    const key = row.modelCode.trim();
    if (!key) { ungroupedRows.push(row); continue; }
    if (!byModel.has(key)) byModel.set(key, []);
    byModel.get(key)!.push(row);
  }

  const groups: GroupedProduct[] = [];
  for (const [modelCode, groupRows] of byModel) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const barcodes = new Set<string>();
    const skus = new Set<string>();

    for (const r of groupRows) {
      if (barcodes.has(r.barcode) && r.barcode) {
        warnings.push(`Satır ${r.rowIndex}: tekrarlayan barkod ${r.barcode}`);
      }
      barcodes.add(r.barcode);
      if (skus.has(r.sku) && r.sku) {
        warnings.push(`Satır ${r.rowIndex}: tekrarlayan stok kodu ${r.sku}`);
      }
      skus.add(r.sku);
      errors.push(...r.errors.map((e) => `Satır ${r.rowIndex}: ${e}`));
      warnings.push(...r.warnings.map((w) => `Satır ${r.rowIndex}: ${w}`));
    }

    const prices = groupRows.map((r) => r.price).filter((p) => p > 0);
    const allImages = [...new Set(groupRows.flatMap((r) => r.images))];

    groups.push({
      modelCode,
      name: pickParentName(groupRows),
      description: pickParentDescription(groupRows),
      brand: pickMostCommon(groupRows, "brand"),
      category: pickMostCommon(groupRows, "category"),
      image: allImages[0] || groupRows.find((r) => r.image)?.image || "",
      images: allImages,
      price: prices.length ? Math.min(...prices) : 0,
      stock: groupRows.reduce((s, r) => s + r.stock, 0),
      rows: groupRows,
      errors,
      warnings,
    });
  }

  return { groups, ungroupedRows };
}

export function extractCategoryValues(groups: GroupedProduct[]): string[] {
  const set = new Set<string>();
  for (const g of groups) {
    if (g.category.trim()) set.add(g.category.trim());
  }
  return [...set].sort();
}
