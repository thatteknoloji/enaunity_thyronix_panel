import { itemsToXml } from "./xml";
import { itemsToCsv, itemsToXlsxBuffer } from "./excel";
import type { DistributionFormat } from "./types";

type ExportItem = {
  name: string;
  barcode: string;
  sku: string;
  brand: string;
  category: string;
  price: number;
  salePrice: number;
  stock: number;
  vatRate: number;
};

export function exportPackageItems(items: ExportItem[], format: DistributionFormat) {
  const normalized = items.map((i) => ({
    name: i.name,
    barcode: i.barcode || "",
    sku: i.sku || "",
    brand: i.brand || "",
    category: i.category || "",
    price: i.price ?? 0,
    salePrice: i.salePrice ?? i.price ?? 0,
    stock: i.stock ?? 0,
    vatRate: i.vatRate ?? 20,
  }));

  if (format === "XML") {
    const body = itemsToXml(normalized);
    return { contentType: "application/xml", body, extension: "xml" };
  }
  if (format === "CSV") {
    const body = itemsToCsv(normalized);
    return { contentType: "text/csv; charset=utf-8", body, extension: "csv" };
  }
  const buf = itemsToXlsxBuffer(normalized);
  return {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    body: buf,
    extension: "xlsx",
  };
}
