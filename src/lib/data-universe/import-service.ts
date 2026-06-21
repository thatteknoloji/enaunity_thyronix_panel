import Papa from "papaparse";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { toSlug } from "./pagination";
import { normalizeImportRows } from "./import-normalize";

export const IMPORT_TYPES = ["province", "district", "neighborhood", "village", "street"] as const;
export type ImportType = (typeof IMPORT_TYPES)[number];

export const IMPORT_JOB_STATUS = ["PENDING", "RUNNING", "COMPLETED", "FAILED"] as const;
export type ImportJobStatus = (typeof IMPORT_JOB_STATUS)[number];

export type ImportRow = Record<string, string | number | null | undefined>;

export type ImportResult = {
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  errorRows: number;
  errors: Array<{ row: number; message: string }>;
  preview?: ImportRow[];
};

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

function num(v: unknown): number | null {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : null;
}

function pick(row: ImportRow, keys: string[]): string {
  for (const k of keys) {
    const val = norm(row[k]);
    if (val) return val;
  }
  return "";
}

export function parseImportFile(buffer: Buffer, fileName: string): ImportRow[] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".json")) {
    const parsed = JSON.parse(buffer.toString("utf8"));
    if (Array.isArray(parsed)) return parsed as ImportRow[];
    if (Array.isArray(parsed?.rows)) return parsed.rows as ImportRow[];
    if (Array.isArray(parsed?.data)) return parsed.data as ImportRow[];
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

async function getTrCountryId(): Promise<string> {
  const country = await prisma.geoCountry.upsert({
    where: { code: "TR" },
    create: { code: "TR", name: "Türkiye", isActive: true },
    update: {},
  });
  return country.id;
}

async function resolveProvince(countryId: string, row: ImportRow) {
  const plateCode = pick(row, ["provinceCode", "plateCode", "plate_code", "plaka", "il_kodu"]);
  const name = pick(row, ["province", "provinceName", "il", "il_adi", "name"]);
  if (plateCode) {
    const p = await prisma.geoProvince.findFirst({ where: { countryId, plateCode: plateCode.padStart(2, "0") } });
    if (p) return p;
  }
  if (name) {
    const byName = await prisma.geoProvince.findFirst({ where: { countryId, name } });
    if (byName) return byName;
    return prisma.geoProvince.findFirst({ where: { countryId, slug: toSlug(name) } });
  }
  return null;
}

async function resolveDistrict(provinceId: string, row: ImportRow) {
  const code = pick(row, ["districtCode", "ilce_kodu"]);
  const name = pick(row, ["district", "districtName", "ilce", "ilce_adi", "name"]);
  if (code) {
    const bySlug = await prisma.geoDistrict.findFirst({ where: { provinceId, slug: toSlug(code) } });
    if (bySlug) return bySlug;
  }
  if (!name) return null;
  const byName = await prisma.geoDistrict.findFirst({ where: { provinceId, name } });
  if (byName) return byName;
  return prisma.geoDistrict.findFirst({ where: { provinceId, slug: toSlug(name) } });
}

async function resolveNeighborhood(districtId: string, row: ImportRow) {
  const name = pick(row, ["neighborhood", "neighborhoodName", "mahalle", "mahalle_adi", "name"]);
  if (!name) return null;
  const byName = await prisma.geoNeighborhood.findFirst({ where: { districtId, name } });
  if (byName) return byName;
  return prisma.geoNeighborhood.findFirst({ where: { districtId, slug: toSlug(name) } });
}

export async function runDataUniverseImport(opts: {
  type: ImportType;
  rows: ImportRow[];
  dryRun: boolean;
  fileName: string;
  createdById?: string;
}): Promise<{ jobId: string; result: ImportResult }> {
  const normalizedRows = normalizeImportRows(opts.type, opts.rows);

  const job = await prisma.dataUniverseImportJob.create({
    data: {
      type: opts.type,
      status: "RUNNING",
      fileName: opts.fileName,
      dryRun: opts.dryRun,
      totalRows: normalizedRows.length,
      createdById: opts.createdById || "",
      metadataJson: JSON.stringify({ startedAt: new Date().toISOString() }),
    },
  });

  const result: ImportResult = {
    totalRows: normalizedRows.length,
    insertedRows: 0,
    updatedRows: 0,
    skippedRows: 0,
    errorRows: 0,
    errors: [],
    preview: opts.dryRun ? [] : undefined,
  };

  try {
    const countryId = await getTrCountryId();

    for (let i = 0; i < normalizedRows.length; i++) {
      const row = normalizedRows[i];
      try {
        const action = await processImportRow(opts.type, row, countryId, opts.dryRun);
        if (action === "insert") result.insertedRows += 1;
        else if (action === "update") result.updatedRows += 1;
        else if (action === "skip") result.skippedRows += 1;
        else result.skippedRows += 1;
        if (opts.dryRun && result.preview && result.preview.length < 10) {
          result.preview.push(row);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Satır hatası";
        if (!opts.dryRun && msg.includes("bulunamadı")) {
          result.skippedRows += 1;
          result.errors.push({ row: i + 1, message: msg });
        } else {
          result.errorRows += 1;
          result.errors.push({ row: i + 1, message: msg });
        }
      }
    }

    await prisma.dataUniverseImportJob.update({
      where: { id: job.id },
      data: {
        status: result.errorRows > 0 && result.insertedRows + result.updatedRows === 0 ? "FAILED" : "COMPLETED",
        insertedRows: result.insertedRows,
        updatedRows: result.updatedRows,
        skippedRows: result.skippedRows,
        errorRows: result.errorRows,
        completedAt: new Date(),
        metadataJson: JSON.stringify({
          errors: result.errors.slice(0, 100),
          dryRun: opts.dryRun,
          finishedAt: new Date().toISOString(),
        }),
      },
    });
  } catch (e) {
    await prisma.dataUniverseImportJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorRows: opts.rows.length,
        completedAt: new Date(),
        metadataJson: JSON.stringify({ fatal: e instanceof Error ? e.message : "Import başarısız" }),
      },
    });
    throw e;
  }

  return { jobId: job.id, result };
}

type RowAction = "insert" | "update" | "skip";

async function processImportRow(type: ImportType, row: ImportRow, countryId: string, dryRun: boolean): Promise<RowAction> {
  switch (type) {
    case "province":
      return importProvince(row, countryId, dryRun);
    case "district":
      return importDistrict(row, countryId, dryRun);
    case "neighborhood":
      return importNeighborhood(row, countryId, dryRun, "neighborhood");
    case "village":
      return importNeighborhood(row, countryId, dryRun, "village");
    case "street":
      return importStreet(row, countryId, dryRun);
    default:
      throw new Error("Geçersiz import tipi");
  }
}

async function importProvince(row: ImportRow, countryId: string, dryRun: boolean): Promise<RowAction> {
  const name = pick(row, ["province", "provinceName", "name", "il", "il_adi"]);
  if (!name) throw new Error("İl adı gerekli");
  const plateCode = (pick(row, ["provinceCode", "plateCode", "plate_code", "plaka", "il_kodu"]) || "00").padStart(2, "0");
  const slug = toSlug(name);
  const existing = await prisma.geoProvince.findFirst({ where: { countryId, name } });
  const payload = {
    countryId,
    plateCode,
    name,
    slug,
    latitude: num(row.latitude ?? row.lat),
    longitude: num(row.longitude ?? row.lng ?? row.lon),
    isActive: true,
  };
  if (dryRun) return existing ? "update" : "insert";
  if (existing) {
    await prisma.geoProvince.update({ where: { id: existing.id }, data: payload });
    return "update";
  }
  await prisma.geoProvince.create({ data: payload });
  return "insert";
}

async function importDistrict(row: ImportRow, countryId: string, dryRun: boolean): Promise<RowAction> {
  const name = pick(row, ["district", "districtName", "name", "ilce", "ilce_adi"]);
  if (!name) throw new Error("İlçe adı gerekli");
  const province = await resolveProvince(countryId, row);
  if (!province) throw new Error("İl bulunamadı — province/plateCode gerekli");
  const existing = await prisma.geoDistrict.findFirst({ where: { provinceId: province.id, name } });
  const payload = {
    provinceId: province.id,
    name,
    slug: toSlug(name),
    latitude: num(row.latitude ?? row.lat),
    longitude: num(row.longitude ?? row.lng ?? row.lon),
    isActive: true,
  };
  if (dryRun) return existing ? "update" : "insert";
  if (existing) {
    await prisma.geoDistrict.update({ where: { id: existing.id }, data: payload });
    return "update";
  }
  await prisma.geoDistrict.create({ data: payload });
  return "insert";
}

async function importNeighborhood(
  row: ImportRow,
  countryId: string,
  dryRun: boolean,
  kind: "neighborhood" | "village"
): Promise<RowAction> {
  const name =
    kind === "village"
      ? pick(row, ["village", "koy", "koy_adi", "name"])
      : pick(row, ["neighborhood", "neighborhoodName", "mahalle", "mahalle_adi", "name"]);
  if (!name) throw new Error(`${kind === "village" ? "Köy" : "Mahalle"} adı gerekli`);
  const province = await resolveProvince(countryId, row);
  if (!province) throw new Error("İl bulunamadı");
  const districtId = pick(row, ["districtId"]);
  const district = districtId
    ? await prisma.geoDistrict.findUnique({ where: { id: districtId } })
    : await resolveDistrict(province.id, row);
  if (!district) throw new Error("İlçe bulunamadı");
  const payload = {
    districtId: district.id,
    name,
    slug: toSlug(name),
    latitude: num(row.latitude ?? row.lat),
    longitude: num(row.longitude ?? row.lng ?? row.lon),
    isActive: true,
  };

  if (kind === "village") {
    const existing = await prisma.geoVillage.findFirst({ where: { districtId: district.id, name } });
    if (dryRun) return existing ? "update" : "insert";
    if (existing) {
      await prisma.geoVillage.update({ where: { id: existing.id }, data: payload });
      return "update";
    }
    await prisma.geoVillage.create({ data: payload });
    return "insert";
  }

  const existing = await prisma.geoNeighborhood.findFirst({ where: { districtId: district.id, name } });
  if (dryRun) return existing ? "update" : "insert";
  if (existing) {
    await prisma.geoNeighborhood.update({ where: { id: existing.id }, data: payload });
    return "update";
  }
  await prisma.geoNeighborhood.create({ data: payload });
  return "insert";
}

async function importStreet(row: ImportRow, countryId: string, dryRun: boolean): Promise<RowAction> {
  const name = pick(row, ["street", "sokak", "cadde", "streetName", "name"]);
  if (!name) throw new Error("Sokak/cadde adı gerekli");
  const neighborhoodId = pick(row, ["neighborhoodId"]);
  let neighborhood = neighborhoodId
    ? await prisma.geoNeighborhood.findUnique({ where: { id: neighborhoodId } })
    : null;
  if (!neighborhood) {
    const province = await resolveProvince(countryId, row);
    if (!province) throw new Error("İl bulunamadı");
    const district = await resolveDistrict(province.id, row);
    if (!district) throw new Error("İlçe bulunamadı");
    neighborhood = await resolveNeighborhood(district.id, row);
  }
  if (!neighborhood) throw new Error("Mahalle bulunamadı");
  const existing = await prisma.geoStreet.findFirst({ where: { neighborhoodId: neighborhood.id, name } });
  const payload = {
    neighborhoodId: neighborhood.id,
    name,
    slug: toSlug(name),
    latitude: num(row.latitude ?? row.lat),
    longitude: num(row.longitude ?? row.lng ?? row.lon),
    isActive: true,
  };
  if (dryRun) return existing ? "update" : "insert";
  if (existing) {
    await prisma.geoStreet.update({ where: { id: existing.id }, data: payload });
    return "update";
  }
  await prisma.geoStreet.create({ data: payload });
  return "insert";
}

export async function listImportJobs(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.dataUniverseImportJob.findMany({ orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.dataUniverseImportJob.count(),
  ]);
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getImportJob(id: string) {
  return prisma.dataUniverseImportJob.findUnique({ where: { id } });
}
