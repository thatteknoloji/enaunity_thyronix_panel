import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { CatalogItemInput } from "./types";

export type FieldMapping = Record<string, string>;

const DEFAULT_MAP: FieldMapping = {
  barcode: "barcode",
  sku: "sku",
  name: "name",
  brand: "brand",
  category: "category",
  price: "price",
  salePrice: "salePrice",
  stock: "stock",
  vatRate: "vatRate",
};

export function parseSpreadsheetBuffer(buffer: Buffer, fileName: string): Record<string, string>[] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) {
    const text = buffer.toString("utf8");
    const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    return result.data || [];
  }
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
}

export function mapRowsToItems(rows: Record<string, string>[], mapping: FieldMapping = DEFAULT_MAP): CatalogItemInput[] {
  const m = { ...DEFAULT_MAP, ...mapping };
  return rows
    .map((row) => {
      const name = String(row[m.name] ?? row["name"] ?? row["Name"] ?? row["urun_adi"] ?? "").trim();
      if (!name) return null;
      const num = (key: string) => {
        const v = parseFloat(String(row[m[key]] ?? row[key] ?? "0"));
        return Number.isFinite(v) ? v : 0;
      };
      return {
        barcode: String(row[m.barcode] ?? "").trim(),
        sku: String(row[m.sku] ?? "").trim(),
        name,
        brand: String(row[m.brand] ?? "").trim(),
        category: String(row[m.category] ?? "").trim(),
        price: num("price"),
        salePrice: num("salePrice") || num("price"),
        stock: Math.round(num("stock")),
        vatRate: num("vatRate") || 20,
        imagesJson: "[]",
        attributesJson: JSON.stringify(row),
      } satisfies CatalogItemInput;
    })
    .filter(Boolean) as CatalogItemInput[];
}

export function itemsToCsv(items: { name: string; barcode: string; sku: string; brand: string; category: string; price: number; salePrice: number; stock: number; vatRate: number }[]): string {
  return Papa.unparse(items);
}

export function itemsToXlsxBuffer(items: { name: string; barcode: string; sku: string; brand: string; category: string; price: number; salePrice: number; stock: number; vatRate: number }[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(items);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

export function detectColumns(rows: Record<string, string>[]): string[] {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]);
}
