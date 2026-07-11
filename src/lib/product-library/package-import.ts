import { prisma } from "@/lib/db";
import { parseSpreadsheetBuffer, mapRowsToItems, detectColumns, type FieldMapping } from "./excel";
import { parseXmlProducts } from "./xml";
import { syncCatalogItems } from "./import-sync";
import { slugify, type CatalogItemInput } from "./types";
import { ensureUniqueSlug, syncPackageCounts } from "./access";
import { extractPackageColumns, buildDefaultFieldRules } from "./template-engine";
import { savePackageSourceFile } from "./source-storage";

type PreviewSourceInput =
  | { sourceType: "EXCEL" | "CSV"; fileName: string; buffer: Buffer; mapping?: FieldMapping }
  | { sourceType: "XML"; fileName?: string; buffer?: Buffer; xmlUrl?: string };

type CommitSourceInput = PreviewSourceInput & {
  packageMode: "NEW" | "EXISTING";
  packageId?: string;
  packageName?: string;
  description?: string;
  catalogId?: string;
  catalogName?: string;
  licenseLevel?: string;
  billingType?: string;
  isFree?: boolean;
  oneTimePrice?: number | null;
  monthlyPrice?: number;
  yearlyPrice?: number;
  badgeText?: string;
  status?: string;
  exportFormats?: string[];
  createdBy: string;
};

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

async function fetchXmlFromUrl(xmlUrl: string) {
  const res = await fetch(xmlUrl, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`XML indirilemedi: HTTP ${res.status}`);
  return res.text();
}

async function parseSourceRows(input: PreviewSourceInput) {
  if (input.sourceType === "XML") {
    let xml = "";
    if (input.buffer) xml = input.buffer.toString("utf8");
    if (!xml && input.xmlUrl) xml = await fetchXmlFromUrl(input.xmlUrl);
    if (!xml.trim()) throw new Error("XML içeriği boş");
    const items = parseXmlProducts(xml);
    const columns = items.length ? uniqueValues(items.flatMap((item) => Object.keys(JSON.parse(item.attributesJson || "{}")))) : [];
    return {
      items,
      rowCount: items.length,
      sampleRows: items.slice(0, 5),
      columns: uniqueValues(["barcode", "sku", "name", "brand", "category", "price", "salePrice", "stock", "vatRate", ...columns]),
      rawXml: xml,
    };
  }

  const rows = parseSpreadsheetBuffer(input.buffer, input.fileName);
  const items = mapRowsToItems(rows, input.mapping);
  return {
    items,
    rowCount: rows.length,
    sampleRows: rows.slice(0, 5),
    columns: detectColumns(rows),
    rawXml: "",
  };
}

function validateImportItems(items: CatalogItemInput[]) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const barcodeCounts = new Map<string, number>();
  const skuCounts = new Map<string, number>();

  for (const item of items) {
    if (!item.name?.trim()) errors.push("Boş ürün adı bulundu.");
    if (!item.barcode?.trim() && !item.sku?.trim()) warnings.push("Bazı satırlarda barkod ve model kodu birlikte boş.");
    if (item.salePrice != null && item.salePrice < 0) errors.push("Negatif satış fiyatı tespit edildi.");
    if (item.stock != null && item.stock < 0) warnings.push("Negatif stok içeren satırlar var.");
    if (item.barcode?.trim()) barcodeCounts.set(item.barcode.trim(), (barcodeCounts.get(item.barcode.trim()) || 0) + 1);
    if (item.sku?.trim()) skuCounts.set(item.sku.trim(), (skuCounts.get(item.sku.trim()) || 0) + 1);
  }

  const duplicateBarcodes = [...barcodeCounts.entries()].filter(([, count]) => count > 1).map(([code]) => code);
  const duplicateSkus = [...skuCounts.entries()].filter(([, count]) => count > 1).map(([code]) => code);

  if (duplicateBarcodes.length) warnings.push(`${duplicateBarcodes.length} tekrar eden barkod bulundu.`);
  if (duplicateSkus.length) warnings.push(`${duplicateSkus.length} tekrar eden model kodu bulundu.`);

  return {
    errors: uniqueValues(errors),
    warnings: uniqueValues(warnings),
    duplicateBarcodes,
    duplicateSkus,
    duplicateCount: duplicateBarcodes.length + duplicateSkus.length,
  };
}

export async function previewPackageSourceImport(input: PreviewSourceInput & { mapping?: FieldMapping }) {
  const parsed = await parseSourceRows(input);
  if (!parsed.items.length) throw new Error("Kaynakta ürün bulunamadı");
  const validation = validateImportItems(parsed.items);
  const mockItems = parsed.items.map((item) => ({
    ...item,
    id: `preview-${item.barcode || item.sku || slugify(item.name)}`,
    catalogId: "",
    supplierId: null,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    orderItems: [],
    coreOrderItems: [],
    warehouseMovements: [],
  }));
  const sourceColumns = extractPackageColumns(mockItems as any);
  const fieldRules = buildDefaultFieldRules(sourceColumns);

  return {
    sourceType: input.sourceType,
    rowCount: parsed.rowCount,
    itemCount: parsed.items.length,
    sampleRows: parsed.sampleRows,
    columns: parsed.columns,
    validation,
    sourceColumns,
    fieldRules,
  };
}

async function resolveCatalog(params: { catalogId?: string; catalogName?: string; packageName: string }) {
  if (params.catalogId) {
    const catalog = await prisma.productCatalog.findUnique({ where: { id: params.catalogId } });
    if (!catalog) throw new Error("Seçilen katalog bulunamadı");
    return catalog;
  }
  const name = params.catalogName?.trim() || params.packageName.trim();
  const slug = await ensureUniqueSlug(slugify(name), "catalog");
  return prisma.productCatalog.create({
    data: {
      name,
      slug,
      status: "ACTIVE",
      description: `${params.packageName.trim()} için otomatik oluşturuldu`,
    },
  });
}

async function resolvePackage(params: {
  input: CommitSourceInput;
  catalogId: string;
  sourceColumns: unknown[];
  fieldRules: unknown[];
}) {
  if (params.input.packageMode === "EXISTING") {
    if (!params.input.packageId) throw new Error("Güncellenecek paket seçilmedi");
    const existing = await prisma.productPackage.findUnique({ where: { id: params.input.packageId } });
    if (!existing) throw new Error("Paket bulunamadı");
    const catalogIds = uniqueValues([
      ...JSON.parse(existing.catalogIds || "[]"),
      params.catalogId,
    ]);
    return prisma.productPackage.update({
      where: { id: existing.id },
      data: {
        description: params.input.description ?? existing.description,
        catalogIds: JSON.stringify(catalogIds),
        sourceColumnsJson: JSON.stringify(params.sourceColumns),
        fieldRulesJson: JSON.stringify(params.fieldRules),
        exportFormatsJson: JSON.stringify(params.input.exportFormats || JSON.parse(existing.exportFormatsJson || "[\"EXCEL\",\"XML\",\"CSV\"]")),
        licenseLevel: params.input.licenseLevel || existing.licenseLevel,
        billingType: params.input.billingType || existing.billingType,
        isFree: params.input.isFree ?? existing.isFree,
        oneTimePrice: params.input.oneTimePrice ?? existing.oneTimePrice,
        monthlyPrice: params.input.monthlyPrice ?? existing.monthlyPrice,
        yearlyPrice: params.input.yearlyPrice ?? existing.yearlyPrice,
        badgeText: params.input.badgeText ?? existing.badgeText,
        status: params.input.status || existing.status,
      },
    });
  }

  if (!params.input.packageName?.trim()) throw new Error("Paket adı zorunlu");
  const slug = await ensureUniqueSlug(slugify(params.input.packageName), "package");
  return prisma.productPackage.create({
    data: {
      name: params.input.packageName.trim(),
      slug,
      description: params.input.description || "",
      catalogIds: JSON.stringify([params.catalogId]),
      licenseLevel: params.input.licenseLevel || "FREE",
      billingType: params.input.billingType || (params.input.isFree ? "FREE" : "ONE_TIME"),
      isFree: !!params.input.isFree,
      oneTimePrice: params.input.oneTimePrice ?? null,
      monthlyPrice: params.input.monthlyPrice ?? 0,
      yearlyPrice: params.input.yearlyPrice ?? 0,
      badgeText: params.input.badgeText || null,
      status: params.input.status || "ACTIVE",
      sourceColumnsJson: JSON.stringify(params.sourceColumns),
      fieldRulesJson: JSON.stringify(params.fieldRules),
      exportFormatsJson: JSON.stringify(params.input.exportFormats || ["EXCEL", "XML", "CSV"]),
    },
  });
}

export async function commitPackageSourceImport(input: CommitSourceInput & { mapping?: FieldMapping }) {
  const parsed = await parseSourceRows(input);
  if (!parsed.items.length) throw new Error("Kaynakta ürün bulunamadı");
  const validation = validateImportItems(parsed.items);
  if (validation.errors.length) {
    throw new Error(validation.errors[0] || "Kaynak doğrulaması başarısız");
  }

  const mockItems = parsed.items.map((item) => ({
    ...item,
    id: `preview-${item.barcode || item.sku || slugify(item.name)}`,
    catalogId: "",
    supplierId: null,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    orderItems: [],
    coreOrderItems: [],
    warehouseMovements: [],
  }));
  const sourceColumns = extractPackageColumns(mockItems as any);
  const fieldRules = buildDefaultFieldRules(sourceColumns);
  let derivedPackageName = input.packageName?.trim() || "";
  let derivedCatalogId = input.catalogId || "";

  if (input.packageMode === "EXISTING" && input.packageId) {
    const existing = await prisma.productPackage.findUnique({ where: { id: input.packageId } });
    if (!existing) throw new Error("Güncellenecek paket bulunamadı");
    if (!derivedPackageName) derivedPackageName = existing.name;
    if (!derivedCatalogId) {
      const catalogIds = JSON.parse(existing.catalogIds || "[]");
      derivedCatalogId = catalogIds[0] || "";
    }
  }

  if (!derivedPackageName) throw new Error("Paket adı zorunlu");
  const catalog = await resolveCatalog({ catalogId: derivedCatalogId, catalogName: input.catalogName, packageName: derivedPackageName });
  const pkg = await resolvePackage({ input, catalogId: catalog.id, sourceColumns, fieldRules });

  const report = await syncCatalogItems({
    catalogId: catalog.id,
    supplierId: null,
    items: parsed.items,
    sourceType: input.sourceType,
  });

  const latestVersion = await prisma.productPackageVersion.findFirst({
    where: { packageId: pkg.id },
    orderBy: { versionNo: "desc" },
  });
  const versionNo = (latestVersion?.versionNo || 0) + 1;

  let sourceName = input.sourceType === "XML" ? (input.fileName || "source.xml") : input.fileName;
  let sourcePath = "";
  let fileHash = "";
  if (input.sourceType === "XML" && input.xmlUrl) {
    const xml = parsed.rawXml || (await fetchXmlFromUrl(input.xmlUrl));
    const stored = await savePackageSourceFile({
      packageId: pkg.id,
      versionNo,
      fileName: sourceName,
      buffer: Buffer.from(xml, "utf8"),
    });
    sourcePath = stored.relativePath;
    fileHash = stored.fileHash;
  } else if (input.sourceType !== "XML") {
    const stored = await savePackageSourceFile({
      packageId: pkg.id,
      versionNo,
      fileName: input.fileName,
      buffer: input.buffer,
    });
    sourcePath = stored.relativePath;
    fileHash = stored.fileHash;
  }

  const version = await prisma.productPackageVersion.create({
    data: {
      packageId: pkg.id,
      catalogId: catalog.id,
      versionNo,
      sourceType: input.sourceType,
      sourceName,
      sourcePath,
      sourceUrl: input.sourceType === "XML" ? input.xmlUrl || "" : "",
      fileHash,
      rowCount: parsed.rowCount,
      itemCount: parsed.items.length,
      duplicateCount: validation.duplicateCount,
      columnsJson: JSON.stringify(parsed.columns),
      sampleJson: JSON.stringify(parsed.sampleRows),
      reportJson: JSON.stringify({ report, validation }),
      createdBy: input.createdBy,
    },
  });

  await prisma.productPackage.update({
    where: { id: pkg.id },
    data: { currentVersionId: version.id },
  });
  await syncPackageCounts(pkg.id);

  return {
    package: pkg,
    catalog,
    version,
    report,
    validation,
    sourceColumns,
    fieldRules,
  };
}
