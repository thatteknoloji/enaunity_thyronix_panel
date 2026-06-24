import * as XLSX from "xlsx";
import { buildSourceMetadataJson } from "./source-metadata";

export interface ExcelParseResult {
  sheets: string[];
  selectedSheet: string;
  headerRow: number;
  columns: string[];
  previewRows: Record<string, any>[];
  allRows: Record<string, any>[];
  totalRows: number;
  errors: string[];
}

export interface ExcelProductRow {
  rowIndex: number;
  productName: string;
  externalId?: string;
  barcode?: string;
  stockCode?: string;
  modelCode?: string;
  brand?: string;
  category?: string;
  price: number;
  discountedPrice?: number;
  salePrice?: number;
  stock: number;
  currency?: string;
  description?: string;
  images?: string;
  vatRate?: number;
  status?: string;
  raw: Record<string, any>;
  metadataJson?: string;
  errors: string[];
  valid: boolean;
}

export interface ExcelValidationSummary {
  validRows: number;
  invalidRows: number;
  missingProductName: number;
  missingPrice: number;
  missingIdentity: number;
  invalidSamples: Array<{ row: number; name: string; errors: string[] }>;
}

function normalizeNumber(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number" && !isNaN(val)) return val;

  let s = String(val).trim();
  // Remove currency symbols and trailing text
  s = s.replace(/[₺$€£TL\s]/gi, "").replace(/"|'/g, "");
  // Turkish format: "1.299,90" → "1299.90"
  if (s.includes(",") && s.includes(".")) {
    // If both exist: check which is decimal
    const lastDot = s.lastIndexOf(".");
    const lastComma = s.lastIndexOf(",");
    if (lastComma > lastDot) {
      // Comma is decimal: 1.299,90 → remove dots, replace comma
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // Dot is decimal: 1,299.90 → remove commas
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    // Only comma: could be "1299,90" or "1,299"
    const after = s.split(",")[1] || "";
    if (after.length <= 2) s = s.replace(",", "."); // decimal
    else s = s.replace(/,/g, ""); // thousands
  }

  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function normalizeStock(val: any): { value: number; error?: string } {
  if (val === null || val === undefined || val === "") return { value: 0, error: "Boş" };
  if (typeof val === "number") return { value: Math.max(0, Math.floor(val)) };

  const s = String(val).toLowerCase().trim();
  if (["var", "mevcut", "stokta var", "evet", "true", "+"].includes(s)) return { value: 999, error: "Metin → 999 varsayıldı" };
  if (["yok", "tükendi", "stokta yok", "hayır", "false", "-", "0"].includes(s)) return { value: 0 };

  const n = normalizeNumber(val);
  if (n !== null) return { value: Math.max(0, Math.floor(n)) };
  return { value: 0, error: `Tanınamadı: "${String(val).substring(0, 20)}"` };
}

function normalizeFieldValue(value: any): number | null {
  return normalizeNumber(value);
}

function normalizeText(value: any): string {
  return String(value ?? "").trim();
}

function applyPrefix(value: string | undefined, prefix?: string): string | undefined {
  const current = normalizeText(value);
  const nextPrefix = normalizeText(prefix);
  if (!current) return current || undefined;
  if (!nextPrefix) return current;
  if (current.startsWith(nextPrefix)) return current;
  return `${nextPrefix}${current}`;
}

function applySuffix(value: string | undefined, suffix?: string): string | undefined {
  const current = normalizeText(value);
  const nextSuffix = normalizeText(suffix);
  if (!current) return current || undefined;
  if (!nextSuffix) return current;
  if (current.endsWith(nextSuffix)) return current;
  return `${current}${nextSuffix}`;
}

function applyReplacement(value: string | undefined, from?: string, to?: string): string | undefined {
  const current = normalizeText(value);
  const needle = normalizeText(from);
  if (!current || !needle) return current || undefined;
  return current.split(needle).join(normalizeText(to));
}

function roundToStep(value: number, step?: number): number {
  const normalizedStep = typeof step === "number" && step > 0 ? step : 0;
  if (!normalizedStep) return value;
  return Math.round(value / normalizedStep) * normalizedStep;
}

function normalizeExcelTransformSettings(fixedValues: Record<string, string>) {
  return {
    brandOverride: normalizeText(fixedValues.brandOverride),
    namePrefix: normalizeText(fixedValues.namePrefix),
    nameSuffix: normalizeText(fixedValues.nameSuffix),
    nameReplaceFrom: normalizeText(fixedValues.nameReplaceFrom),
    nameReplaceTo: normalizeText(fixedValues.nameReplaceTo),
    descriptionPrefix: normalizeText(fixedValues.descriptionPrefix),
    descriptionSuffix: normalizeText(fixedValues.descriptionSuffix),
    descriptionReplaceFrom: normalizeText(fixedValues.descriptionReplaceFrom),
    descriptionReplaceTo: normalizeText(fixedValues.descriptionReplaceTo),
    barcodePrefix: normalizeText(fixedValues.barcodePrefix),
    stockCodePrefix: normalizeText(fixedValues.stockCodePrefix),
    modelCodePrefix: normalizeText(fixedValues.modelCodePrefix),
    externalIdPrefix: normalizeText(fixedValues.externalIdPrefix),
    priceMultiplier: normalizeNumber(fixedValues.priceMultiplier) ?? 1,
    priceAdd: normalizeNumber(fixedValues.priceAdd) ?? 0,
    priceMin: normalizeNumber(fixedValues.priceMin),
    priceRoundTo: normalizeNumber(fixedValues.priceRoundTo),
    vatRateOverride: normalizeNumber(fixedValues.vatRateOverride ?? fixedValues.vatRate),
    stockFloor: normalizeNumber(fixedValues.stockFloor ?? fixedValues.safetyStock),
  };
}

function applyExcelTransforms(product: ExcelProductRow, fixedValues: Record<string, string>): ExcelProductRow {
  const cfg = normalizeExcelTransformSettings(fixedValues);
  const next = { ...product };

  next.brand = cfg.brandOverride || next.brand;
  next.productName = applySuffix(
    applyPrefix(applyReplacement(next.productName, cfg.nameReplaceFrom, cfg.nameReplaceTo), cfg.namePrefix),
    cfg.nameSuffix,
  ) || next.productName;
  next.description = applySuffix(
    applyPrefix(applyReplacement(next.description, cfg.descriptionReplaceFrom, cfg.descriptionReplaceTo), cfg.descriptionPrefix),
    cfg.descriptionSuffix,
  ) || next.description;
  next.barcode = applyPrefix(next.barcode, cfg.barcodePrefix);
  next.stockCode = applyPrefix(next.stockCode, cfg.stockCodePrefix);
  next.modelCode = applyPrefix(next.modelCode, cfg.modelCodePrefix);
  next.externalId = applyPrefix(next.externalId, cfg.externalIdPrefix) || next.externalId;

  let finalPrice = next.price;
  finalPrice = finalPrice * cfg.priceMultiplier + cfg.priceAdd;
  if (typeof cfg.priceMin === "number" && !Number.isNaN(cfg.priceMin)) {
    finalPrice = Math.max(finalPrice, cfg.priceMin);
  }
  finalPrice = roundToStep(finalPrice, cfg.priceRoundTo || undefined);
  next.price = Number.isFinite(finalPrice) ? finalPrice : next.price;
  if (typeof cfg.vatRateOverride === "number" && !Number.isNaN(cfg.vatRateOverride)) {
    next.vatRate = cfg.vatRateOverride;
  }
  if (typeof cfg.stockFloor === "number" && !Number.isNaN(cfg.stockFloor)) {
    next.stock = Math.max(next.stock, Math.floor(cfg.stockFloor));
  }

  return next;
}

function generateHash(row: Record<string, any>): string {
  const key = [row.productName, row.brand, row.category, row.price]
    .filter(Boolean).join("|");
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }
  return "EXCEL_" + Math.abs(hash).toString(36).toUpperCase().padStart(8, "0");
}

export function parseExcel(buffer: Buffer, sheetName?: string, headerRow = 1): ExcelParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheets = workbook.SheetNames;

  if (sheets.length === 0) return { sheets: [], selectedSheet: "", headerRow, columns: [], previewRows: [], allRows: [], totalRows: 0, errors: ["Çalışma kitabı boş"] };

  const selectedSheet = sheetName || sheets[0];
  const worksheet = workbook.Sheets[selectedSheet];
  if (!worksheet) return { sheets, selectedSheet, headerRow, columns: [], previewRows: [], allRows: [], totalRows: 0, errors: [`Sayfa "${selectedSheet}" bulunamadı`] };

  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

  if (rawData.length === 0) return { sheets, selectedSheet, headerRow, columns: [], previewRows: [], allRows: [], totalRows: 0, errors: ["Sayfa boş"] };

  // Determine header row (0-indexed)
  const headerIdx = Math.max(0, Math.min(headerRow - 1, rawData.length - 1));
  const headers = rawData[headerIdx].map((h: any) => String(h || "").trim());

  // Convert data rows to objects (rows after header)
  const allRows: Record<string, any>[] = [];
  for (let i = headerIdx + 1; i < rawData.length; i++) {
    const row: Record<string, any> = {};
    headers.forEach((h: string, j: number) => {
      row[h] = rawData[i]?.[j] ?? "";
    });
    // Skip completely empty rows
    if (Object.values(row).every(v => v === "" || v === null || v === undefined)) continue;
    allRows.push(row);
  }

  return {
    sheets,
    selectedSheet,
    headerRow,
    columns: headers.filter(h => h !== ""),
    previewRows: allRows.slice(0, 20),
    allRows,
    totalRows: allRows.length,
    errors: [],
  };
}

export function mapExcelToProducts(
  rows: Record<string, any>[],
  fieldMapping: Record<string, string>,
  fixedValues: Record<string, string>,
): ExcelProductRow[] {
  // Build reverse map: canonicalField → excelColumn
  const reverseMap: Record<string, string> = {};
  for (const [excelCol, canonical] of Object.entries(fieldMapping)) {
    if (canonical) reverseMap[canonical] = excelCol;
  }

  return rows.map((row, idx) => {
    const errors: string[] = [];

    const getVal = (field: string): string => {
      const col = reverseMap[field];
      return col ? String(row[col] ?? "") : "";
    };

    const productName = getVal("productName") || getVal("name") || "";
    if (!productName) errors.push("Ürün adı eksik");
    const externalId = getVal("externalId") || undefined;

    const price = normalizeNumber(getVal("price"));
    if (price === null || price <= 0) errors.push("Geçersiz fiyat");

      const stockResult = normalizeStock(getVal("stock"));
    if (stockResult.error) errors.push(`Stok: ${stockResult.error}`);

    // Identity fields
      const barcode = getVal("barcode") || undefined;
      const stockCode = getVal("stockCode") || getVal("stockCode") || undefined;
      const modelCode = getVal("modelCode") || undefined;
      const hasIdentity = barcode || stockCode || modelCode;
    if (!hasIdentity) errors.push("Kimlik alanı eksik (barkod/stok kodu/model kodu)");

    const discountedPrice = normalizeFieldValue(getVal("discountedPrice") || getVal("salePrice")) || undefined;

    const product: ExcelProductRow = {
      rowIndex: idx + 1,
      productName,
      externalId,
      barcode,
      stockCode,
      modelCode,
      brand: getVal("brand") || fixedValues.brand || undefined,
      category: getVal("category") || fixedValues.category || undefined,
      price: price || 0,
      discountedPrice,
      salePrice: normalizeNumber(getVal("salePrice")) || undefined,
      stock: stockResult.value,
      currency: getVal("currency") || fixedValues.currency || "TRY",
      description: getVal("description") || undefined,
      images: getVal("images") || undefined,
      vatRate: normalizeNumber(getVal("vatRate")) || undefined,
      status: getVal("status") || fixedValues.status || "active",
      raw: row,
      metadataJson: buildSourceMetadataJson({
        sourceType: "excel",
        raw: row,
        extra: { rowIndex: idx + 1, externalId: externalId || null },
      }),
      errors,
      valid: errors.length === 0,
    };

    return applyExcelTransforms(product, fixedValues);
  });
}

export function getIdentityKey(product: ExcelProductRow): { field: string; value: string } {
  if (product.barcode) return { field: "barcode", value: product.barcode };
  if (product.stockCode) return { field: "stockCode", value: product.stockCode };
  if (product.modelCode) return { field: "modelCode", value: product.modelCode };
  if (product.externalId) return { field: "externalId", value: product.externalId };
  return { field: "externalId", value: generateHash(product.raw) };
}
