import { parseExcel } from "@/lib/thyronix/excel-parser";
import type { FieldMapping, ParsedImportRow } from "./types";

function normalizeNumber(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number" && !isNaN(val)) return val;
  let s = String(val).trim().replace(/[₺$€£TL\s]/gi, "");
  if (s.includes(",") && s.includes(".")) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (s.includes(",")) {
    const after = s.split(",")[1] || "";
    s = after.length <= 2 ? s.replace(",", ".") : s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function normalizeStock(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return Math.max(0, Math.floor(val));
  const s = String(val).toLowerCase().trim();
  if (["var", "mevcut", "stokta var", "evet", "true", "+"].includes(s)) return 999;
  if (["yok", "tükendi", "stokta yok", "hayır", "false", "-"].includes(s)) return 0;
  return Math.max(0, Math.floor(normalizeNumber(val)));
}

function cell(row: Record<string, unknown>, col?: string): string {
  if (!col) return "";
  return String(row[col] ?? "").trim();
}

function collectImages(row: Record<string, unknown>, mapping: FieldMapping): string[] {
  const urls: string[] = [];
  const cols = mapping.images?.length ? mapping.images : mapping.image ? [mapping.image] : [];
  for (const col of cols) {
    const v = cell(row, col);
    if (v && (v.startsWith("http") || v.startsWith("//"))) urls.push(v.startsWith("//") ? `https:${v}` : v);
  }
  return [...new Set(urls)];
}

function findPriceColumn(row: Record<string, unknown>, mapping: FieldMapping): number {
  const candidates = [
    mapping.price,
    "Trendyol Satış Fiyatı",
    "Satış Fiyatı",
    "Fiyat",
    "Price",
    "listPrice",
  ].filter(Boolean) as string[];
  for (const col of candidates) {
    const n = normalizeNumber(row[col]);
    if (n > 0) return n;
  }
  return 0;
}

export function parseRowsFromBuffer(
  buffer: Buffer,
  mapping: FieldMapping,
  fileName: string,
): { rows: ParsedImportRow[]; columns: string[]; errors: string[] } {
  const parsed = parseExcel(buffer);
  if (parsed.errors.length) return { rows: [], columns: [], errors: parsed.errors };

  const rows: ParsedImportRow[] = [];
  for (let i = 0; i < parsed.allRows.length; i++) {
    const raw = parsed.allRows[i];
    const errors: string[] = [];
    const warnings: string[] = [];

    const name = cell(raw, mapping.name);
    const modelCode = cell(raw, mapping.modelCode);
    const sku = cell(raw, mapping.sku);
    const barcode = cell(raw, mapping.barcode);
    const price = findPriceColumn(raw, mapping);
    const stock = normalizeStock(raw[mapping.stock || ""]);

    if (!modelCode) errors.push("Model Kodu eksik");
    if (!sku) errors.push("Stok Kodu eksik");
    if (!barcode) errors.push("Barkod eksik");
    if (!name) warnings.push("Ürün adı boş");
    if (price <= 0) warnings.push("Fiyat 0 veya geçersiz");

    const variantOptions: { group: string; value: string }[] = [];
    for (const [groupName, col] of Object.entries(mapping.variantAxes || {})) {
      const value = cell(raw, col);
      if (value) variantOptions.push({ group: groupName, value });
    }

    const images = collectImages(raw, mapping);
    rows.push({
      rowIndex: i + 2,
      name: name || modelCode,
      description: cell(raw, mapping.description),
      brand: cell(raw, mapping.brand),
      category: cell(raw, mapping.category),
      modelCode,
      sku,
      barcode,
      price,
      stock,
      image: images[0] || "",
      images,
      variantOptions,
      raw,
      errors,
      warnings,
    });
  }

  return { rows, columns: parsed.columns, errors: [] };
}

export function parseCsvText(text: string, mapping: FieldMapping): ParsedImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const allRows: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, unknown> = {};
    headers.forEach((h, j) => { row[h] = vals[j] ?? ""; });
    allRows.push(row);
  }
  const rows: ParsedImportRow[] = [];
  for (let i = 0; i < allRows.length; i++) {
    const raw = allRows[i];
    const variantOptions: { group: string; value: string }[] = [];
    for (const [groupName, col] of Object.entries(mapping.variantAxes || {})) {
      const value = cell(raw, col);
      if (value) variantOptions.push({ group: groupName, value });
    }
    const images = collectImages(raw, mapping);
    rows.push({
      rowIndex: i + 2,
      name: cell(raw, mapping.name) || cell(raw, mapping.modelCode),
      description: cell(raw, mapping.description),
      brand: cell(raw, mapping.brand),
      category: cell(raw, mapping.category),
      modelCode: cell(raw, mapping.modelCode),
      sku: cell(raw, mapping.sku),
      barcode: cell(raw, mapping.barcode),
      price: findPriceColumn(raw, mapping),
      stock: normalizeStock(raw[mapping.stock || ""]),
      image: images[0] || "",
      images,
      variantOptions,
      raw,
      errors: [],
      warnings: [],
    });
  }
  return rows;
}
