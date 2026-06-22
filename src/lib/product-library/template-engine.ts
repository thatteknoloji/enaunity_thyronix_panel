import type { ProductCatalogItem, ProductPackage } from "@prisma/client";
import type {
  DistributionFormat,
  ProductPackageColumn,
  ProductPackageFieldRule,
} from "./types";
import { DISTRIBUTION_FORMATS } from "./types";

const CORE_COLUMNS: Array<{ key: string; label: string; dataType: "text" | "number" }> = [
  { key: "barcode", label: "Barkod", dataType: "text" },
  { key: "sku", label: "Model Kodu", dataType: "text" },
  { key: "name", label: "Ürün Adı", dataType: "text" },
  { key: "brand", label: "Marka", dataType: "text" },
  { key: "category", label: "Kategori", dataType: "text" },
  { key: "price", label: "Liste Fiyatı", dataType: "number" },
  { key: "salePrice", label: "Satış Fiyatı", dataType: "number" },
  { key: "stock", label: "Stok", dataType: "number" },
  { key: "vatRate", label: "KDV", dataType: "number" },
];

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function isNumericColumn(values: string[]) {
  const cleaned = values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .slice(0, 8);
  if (cleaned.length === 0) return false;
  return cleaned.every((value) => Number.isFinite(Number(value.replace(",", "."))));
}

export function readItemAttributes(item: ProductCatalogItem): Record<string, string> {
  const raw = parseJson<Record<string, unknown>>(item.attributesJson, {});
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, value == null ? "" : String(value)])
  );
}

export function extractPackageColumns(items: ProductCatalogItem[]): ProductPackageColumn[] {
  const columns: ProductPackageColumn[] = CORE_COLUMNS.map((column) => ({
    key: column.key,
    label: column.label,
    source: "CORE",
    dataType: column.dataType,
    sampleValues: items.slice(0, 3).map((item) => String((item as Record<string, unknown>)[column.key] ?? "")),
  }));

  const seen = new Set(columns.map((column) => column.key.toLowerCase()));
  const attrSamples = new Map<string, { values: string[]; sourceKey: string }>();
  for (const item of items.slice(0, 50)) {
    const attrs = readItemAttributes(item);
    for (const [key, value] of Object.entries(attrs)) {
      if (!key.trim()) continue;
      if (seen.has(key.toLowerCase())) continue;
      const bucket = attrSamples.get(key) || { values: [], sourceKey: key };
      if (bucket.values.length < 5 && value) bucket.values.push(value);
      attrSamples.set(key, bucket);
    }
  }

  for (const [key, bucket] of [...attrSamples.entries()].sort((a, b) => a[0].localeCompare(b[0], "tr"))) {
    columns.push({
      key,
      label: key,
      source: "ATTRIBUTE",
      dataType: isNumericColumn(bucket.values) ? "number" : "text",
      sampleValues: bucket.values,
    });
  }

  return columns;
}

export function buildDefaultFieldRules(columns: ProductPackageColumn[]): ProductPackageFieldRule[] {
  return columns.map((column) => {
    let behavior: ProductPackageFieldRule["behavior"] = "LOCKED";
    if (column.key === "brand") behavior = "REPLACE";
    if (column.key === "barcode" || column.key === "sku") behavior = "PREFIX";
    if (column.key === "name") behavior = "SUFFIX";
    if (["price", "salePrice", "stock", "vatRate"].includes(column.key)) behavior = "NUMBER_FORMULA";

    return {
      key: column.key,
      label: column.label,
      exportKey: column.key,
      source: column.source,
      dataType: column.dataType,
      behavior,
      required: ["name", "salePrice"].includes(column.key),
      visible: true,
    };
  });
}

export function normalizeFieldRules(
  columns: ProductPackageColumn[],
  rawRules: ProductPackageFieldRule[] = []
) {
  const columnMap = new Map(columns.map((column) => [column.key, column]));
  const rules = rawRules
    .map((rule) => {
      const column = columnMap.get(rule.key);
      if (!column) return null;
      return {
        key: rule.key,
        label: rule.label || column.label,
        exportKey: rule.exportKey || rule.key,
        source: column.source,
        dataType: column.dataType,
        behavior: rule.behavior || "LOCKED",
        required: !!rule.required,
        visible: rule.visible !== false,
      } satisfies ProductPackageFieldRule;
    })
    .filter(Boolean) as ProductPackageFieldRule[];

  const known = new Set(rules.map((rule) => rule.key));
  for (const fallback of buildDefaultFieldRules(columns)) {
    if (!known.has(fallback.key)) rules.push(fallback);
  }
  return rules;
}

export function resolvePackageTemplate(
  pkg: Pick<ProductPackage, "sourceColumnsJson" | "fieldRulesJson" | "exportFormatsJson">,
  items: ProductCatalogItem[]
) {
  const fallbackColumns = extractPackageColumns(items);
  const sourceColumns = parseJson<ProductPackageColumn[]>(pkg.sourceColumnsJson, fallbackColumns);
  const normalizedColumns = sourceColumns.length ? sourceColumns : fallbackColumns;
  const savedRules = parseJson<ProductPackageFieldRule[]>(pkg.fieldRulesJson, []);
  const fieldRules = normalizeFieldRules(normalizedColumns, savedRules);
  const rawFormats = parseJson<DistributionFormat[]>(pkg.exportFormatsJson, ["EXCEL", "XML", "CSV"]);
  const exportFormats = rawFormats.filter((format) =>
    (DISTRIBUTION_FORMATS as readonly string[]).includes(format)
  );

  return {
    sourceColumns: normalizedColumns,
    fieldRules,
    exportFormats: exportFormats.length ? exportFormats : ["EXCEL", "XML", "CSV"],
  };
}
