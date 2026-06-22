import Papa from "papaparse";
import * as XLSX from "xlsx";
import { detectProductColumns, getDetectedColumnsSummary, type ProductColumnMapping } from "./column-detector";
import { cleanProductDescription } from "./description-cleaner";
import {
  buildDuplicateKey,
  generateProductSlug,
  normalizeProductName,
  parsePrice,
} from "./product-normalizer";

export type ImportRow = Record<string, string | number | null | undefined>;

export type ParsedProductRow = {
  rowIndex: number;
  rawName: string;
  normalizedName: string;
  slug: string;
  brand: string;
  barcode: string;
  stockCode: string;
  categoryPath: string;
  descriptionRaw: string;
  descriptionClean: string;
  price: number | null;
  currency: string;
  imageUrls: string[];
  duplicateKey: string;
};

export type ParseImportResult = {
  rows: ParsedProductRow[];
  columns: string[];
  mapping: ProductColumnMapping;
  detectedColumns: Record<string, string | string[]>;
  warnings: string[];
  errors: Array<{ row: number; message: string }>;
};

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

function pick(row: ImportRow, col?: string): string {
  if (!col) return "";
  return norm(row[col]);
}

export function parseImportFile(buffer: Buffer, fileName: string): ImportRow[] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".json")) {
    const parsed = JSON.parse(buffer.toString("utf8"));
    if (Array.isArray(parsed)) return parsed as ImportRow[];
    if (Array.isArray(parsed?.rows)) return parsed.rows as ImportRow[];
    if (Array.isArray(parsed?.data)) return parsed.data as ImportRow[];
    if (Array.isArray(parsed?.products)) return parsed.products as ImportRow[];
    throw new Error("JSON formatı geçersiz — dizi veya { rows: [] } bekleniyor");
  }
  if (lower.endsWith(".csv")) {
    const text = buffer.toString("utf8");
    const result = Papa.parse<ImportRow>(text, { header: true, skipEmptyLines: true });
    if (result.errors.length) throw new Error(result.errors[0]?.message || "CSV parse hatası");
    return result.data;
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) throw new Error("XLSX sayfası bulunamadı");
    return XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: "" });
  }
  throw new Error("Desteklenen formatlar: CSV, JSON, XLSX");
}

function extractImageUrls(row: ImportRow, imageColumns: string[]): string[] {
  const urls: string[] = [];
  for (const col of imageColumns) {
    const val = norm(row[col]);
    if (!val) continue;
    if (val.includes(",")) {
      val.split(",").map((u) => u.trim()).filter(Boolean).forEach((u) => urls.push(u));
    } else {
      urls.push(val);
    }
  }
  return [...new Set(urls.filter((u) => u.startsWith("http") || u.startsWith("//")))];
}

export function parseProductRows(
  rows: ImportRow[],
  customMapping?: Partial<ProductColumnMapping>
): ParseImportResult {
  const warnings: string[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  const columns = rows.length ? Object.keys(rows[0]!) : [];
  const mapping = detectProductColumns(columns, customMapping);
  const detectedColumns = getDetectedColumnsSummary(mapping);

  if (!mapping.name) {
    warnings.push("Ürün adı kolonu tespit edilemedi — ilk kolon kullanılacak");
    mapping.name = columns[0];
  }

  const parsed: ParsedProductRow[] = [];
  const slugCounts = new Map<string, number>();

  rows.forEach((row, idx) => {
    const rowIndex = idx + 2;
    const rawName = pick(row, mapping.name) || pick(row, columns[0]);
    if (!rawName) {
      errors.push({ row: rowIndex, message: "Ürün adı boş" });
      return;
    }

    const normalizedName = normalizeProductName(rawName);
    const brand = pick(row, mapping.brand);
    const barcode = pick(row, mapping.barcode);
    const stockCode = pick(row, mapping.stockCode);
    const categoryPath = pick(row, mapping.categoryPath);
    const descriptionRaw = pick(row, mapping.description);
    const descriptionClean = cleanProductDescription(descriptionRaw);
    const { price, currency } = parsePrice(mapping.price ? row[mapping.price] : null);
    const imageUrls = extractImageUrls(row, mapping.imageColumns);

    let slug = generateProductSlug(normalizedName);
    const count = slugCounts.get(slug) || 0;
    if (count > 0) slug = generateProductSlug(normalizedName, String(count + 1));
    slugCounts.set(generateProductSlug(normalizedName), count + 1);

    parsed.push({
      rowIndex,
      rawName,
      normalizedName,
      slug,
      brand,
      barcode,
      stockCode,
      categoryPath,
      descriptionRaw,
      descriptionClean,
      price,
      currency,
      imageUrls,
      duplicateKey: buildDuplicateKey({ barcode, normalizedName, brand, categoryPath }),
    });
  });

  if (!mapping.brand) warnings.push("Marka kolonu tespit edilemedi");
  if (!mapping.barcode) warnings.push("Barkod kolonu tespit edilemedi");
  if (!mapping.imageColumns.length) warnings.push("Görsel kolonu tespit edilemedi");

  return { rows: parsed, columns, mapping, detectedColumns, warnings, errors };
}
