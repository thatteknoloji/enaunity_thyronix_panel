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

export function exportPackageItems(
  items: Array<ExportItem | Record<string, string | number>>,
  format: DistributionFormat
) {
  const normalized = items.map((item) => {
    if ("name" in item || "barcode" in item || "salePrice" in item) {
      const casted = item as ExportItem;
      return {
        name: casted.name,
        barcode: casted.barcode || "",
        sku: casted.sku || "",
        brand: casted.brand || "",
        category: casted.category || "",
        price: casted.price ?? 0,
        salePrice: casted.salePrice ?? casted.price ?? 0,
        stock: casted.stock ?? 0,
        vatRate: casted.vatRate ?? 20,
      };
    }
    return item;
  });

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
