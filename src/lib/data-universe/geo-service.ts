import { prisma } from "@/lib/db";
import { parsePagination, toSlug, type PaginatedResult } from "./pagination";

export type GeoFilters = {
  country?: string;
  province?: string;
  district?: string;
  q?: string;
  level?: string;
};

function extractGeoFilters(searchParams: URLSearchParams): GeoFilters {
  return {
    country: searchParams.get("country") || searchParams.get("countryCode") || undefined,
    province: searchParams.get("province") || searchParams.get("provinceSlug") || undefined,
    district: searchParams.get("district") || searchParams.get("districtSlug") || undefined,
    q: searchParams.get("q") || searchParams.get("search") || undefined,
    level: searchParams.get("level") || undefined,
  };
}

async function resolveCountry(code?: string) {
  const c = (code || "TR").toUpperCase();
  return prisma.geoCountry.findFirst({ where: { code: c } });
}

/** İl — id, slug, plaka veya tam ad ile */
export async function resolveProvinceFilter(value: string, countryCode = "TR") {
  if (!value.trim()) return null;
  const country = await resolveCountry(countryCode);
  if (!country) return null;
  const v = value.trim();
  if (v.length > 10 && /^c[a-z0-9]+$/i.test(v)) {
    const byId = await prisma.geoProvince.findFirst({ where: { id: v, countryId: country.id } });
    if (byId) return byId;
  }
  const byPlate = await prisma.geoProvince.findFirst({
    where: { countryId: country.id, plateCode: v.padStart(2, "0") },
  });
  if (byPlate) return byPlate;
  const bySlug = await prisma.geoProvince.findFirst({ where: { countryId: country.id, slug: toSlug(v) } });
  if (bySlug) return bySlug;
  return prisma.geoProvince.findFirst({ where: { countryId: country.id, name: v } });
}

/** İlçe — id, slug veya tam ad ile (provinceId zorunlu) */
export async function resolveDistrictFilter(value: string, provinceId: string) {
  if (!value.trim() || !provinceId) return null;
  const v = value.trim();
  if (v.length > 10 && /^c[a-z0-9]+$/i.test(v)) {
    const byId = await prisma.geoDistrict.findFirst({ where: { id: v, provinceId } });
    if (byId) return byId;
  }
  const bySlug = await prisma.geoDistrict.findFirst({ where: { provinceId, slug: toSlug(v) } });
  if (bySlug) return bySlug;
  return prisma.geoDistrict.findFirst({ where: { provinceId, name: v } });
}

async function resolveDistrictFromParams(searchParams: URLSearchParams) {
  const districtId = searchParams.get("districtId") || "";
  if (districtId) {
    return prisma.geoDistrict.findUnique({ where: { id: districtId } });
  }
  const districtParam = searchParams.get("district") || searchParams.get("districtSlug") || "";
  if (!districtParam) return null;
  const countryCode = searchParams.get("country") || searchParams.get("countryCode") || "TR";
  const provinceParam = searchParams.get("province") || searchParams.get("provinceSlug") || "";
  let provinceId = searchParams.get("provinceId") || "";
  if (!provinceId && provinceParam) {
    const p = await resolveProvinceFilter(provinceParam, countryCode);
    provinceId = p?.id || "";
  }
  if (!provinceId) return null;
  return resolveDistrictFilter(districtParam, provinceId);
}

export async function listGeoCountries(searchParams: URLSearchParams): Promise<PaginatedResult<unknown>> {
  const { page, limit, search, activeOnly } = parsePagination(searchParams);
  const where = {
    ...(activeOnly ? { isActive: true } : {}),
    ...(search ? { OR: [{ name: { contains: search } }, { code: { contains: search } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.geoCountry.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * limit, take: limit }),
    prisma.geoCountry.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function listGeoProvinces(searchParams: URLSearchParams) {
  const { page, limit, search, activeOnly } = parsePagination(searchParams);
  const countryCode = searchParams.get("country") || searchParams.get("countryCode") || "TR";
  const country = await prisma.geoCountry.findFirst({ where: { code: countryCode.toUpperCase() } });
  if (!country) return { items: [], total: 0, page, limit, totalPages: 1 };

  const where = {
    countryId: country.id,
    ...(activeOnly ? { isActive: true } : {}),
    ...(search ? { name: { contains: search } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.geoProvince.findMany({
      where,
      orderBy: { plateCode: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { country: { select: { code: true, name: true } } },
    }),
    prisma.geoProvince.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function listGeoDistricts(searchParams: URLSearchParams) {
  const { page, limit, search, activeOnly } = parsePagination(searchParams);
  const provinceId = searchParams.get("provinceId") || "";
  const provinceParam = searchParams.get("province") || searchParams.get("provinceSlug") || "";
  const districtParam = searchParams.get("district") || searchParams.get("districtSlug") || "";
  const countryCode = searchParams.get("country") || searchParams.get("countryCode") || "TR";

  let resolvedProvinceId = provinceId;
  if (!resolvedProvinceId && provinceParam) {
    const p = await resolveProvinceFilter(provinceParam, countryCode);
    resolvedProvinceId = p?.id || "";
  }

  let districtFilter: { slug?: string; name?: string } = {};
  if (districtParam && resolvedProvinceId) {
    const d = await resolveDistrictFilter(districtParam, resolvedProvinceId);
    if (d) districtFilter = { name: d.name };
    else districtFilter = { slug: toSlug(districtParam) };
  } else if (districtParam) {
    districtFilter = { slug: toSlug(districtParam) };
  }

  const where = {
    ...(resolvedProvinceId ? { provinceId: resolvedProvinceId } : {}),
    ...districtFilter,
    ...(activeOnly ? { isActive: true } : {}),
    ...(search ? { name: { contains: search } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.geoDistrict.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { province: { select: { name: true, plateCode: true, slug: true } } },
    }),
    prisma.geoDistrict.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function listGeoNeighborhoods(searchParams: URLSearchParams) {
  const { page, limit, search, activeOnly } = parsePagination(searchParams);
  const district = await resolveDistrictFromParams(searchParams);
  const where = {
    ...(district ? { districtId: district.id } : {}),
    ...(activeOnly ? { isActive: true } : {}),
    ...(search ? { name: { contains: search } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.geoNeighborhood.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { district: { select: { name: true, slug: true } } },
    }),
    prisma.geoNeighborhood.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function listGeoVillages(searchParams: URLSearchParams) {
  const { page, limit, search, activeOnly } = parsePagination(searchParams);
  const district = await resolveDistrictFromParams(searchParams);
  const where = {
    ...(district ? { districtId: district.id } : {}),
    ...(activeOnly ? { isActive: true } : {}),
    ...(search ? { name: { contains: search } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.geoVillage.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { district: { select: { name: true, slug: true } } },
    }),
    prisma.geoVillage.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/** Birleşik GEO API — level parametresi ile katman seçimi */
function normalizeGeoLevel(raw: string): string {
  const level = raw.toLowerCase();
  const map: Record<string, string> = {
    country: "countries",
    countries: "countries",
    province: "provinces",
    provinces: "provinces",
    il: "provinces",
    district: "districts",
    districts: "districts",
    ilce: "districts",
    neighborhood: "neighborhoods",
    neighborhoods: "neighborhoods",
    mahalle: "neighborhoods",
    village: "villages",
    villages: "villages",
    koy: "villages",
  };
  return map[level] || "countries";
}

export async function queryGeoTree(searchParams: URLSearchParams) {
  const levelKey = normalizeGeoLevel(searchParams.get("level") || "country");
  const filters = extractGeoFilters(searchParams);

  let result: PaginatedResult<unknown> & { level?: string };
  switch (levelKey) {
    case "countries":
      result = { level: "country", ...(await listGeoCountries(searchParams)) };
      break;
    case "provinces":
      result = { level: "province", ...(await listGeoProvinces(searchParams)) };
      break;
    case "districts":
      result = { level: "district", ...(await listGeoDistricts(searchParams)) };
      break;
    case "neighborhoods":
      result = { level: "neighborhood", ...(await listGeoNeighborhoods(searchParams)) };
      break;
    case "villages":
      result = { level: "village", ...(await listGeoVillages(searchParams)) };
      break;
    default:
      result = { level: "country", ...(await listGeoCountries(searchParams)) };
  }

  const counts = await getGeoStats();

  return {
    level: result.level,
    items: result.items,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    },
    counts: {
      countries: counts.countries,
      provinces: counts.provinces,
      districts: counts.districts,
      neighborhoods: counts.neighborhoods,
      villages: counts.villages,
    },
    filters,
  };
}

export async function upsertGeoCountry(data: { id?: string; code: string; name: string; isActive?: boolean }) {
  const code = data.code.toUpperCase();
  if (data.id) {
    return prisma.geoCountry.update({
      where: { id: data.id },
      data: { code, name: data.name.trim(), isActive: data.isActive ?? true },
    });
  }
  return prisma.geoCountry.upsert({
    where: { code },
    create: { code, name: data.name.trim(), isActive: data.isActive ?? true },
    update: { name: data.name.trim(), isActive: data.isActive ?? true },
  });
}

export async function upsertGeoProvince(data: {
  id?: string;
  countryId: string;
  plateCode: string;
  name: string;
  slug?: string;
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean;
}) {
  const slug = data.slug || toSlug(data.name);
  const payload = {
    countryId: data.countryId,
    plateCode: data.plateCode.padStart(2, "0"),
    name: data.name.trim(),
    slug,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    isActive: data.isActive ?? true,
  };
  if (data.id) return prisma.geoProvince.update({ where: { id: data.id }, data: payload });
  return prisma.geoProvince.upsert({
    where: { countryId_slug: { countryId: data.countryId, slug } },
    create: payload,
    update: payload,
  });
}

export async function upsertGeoDistrict(data: {
  id?: string;
  provinceId: string;
  name: string;
  slug?: string;
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean;
}) {
  const slug = data.slug || toSlug(data.name);
  const payload = {
    provinceId: data.provinceId,
    name: data.name.trim(),
    slug,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    isActive: data.isActive ?? true,
  };
  if (data.id) return prisma.geoDistrict.update({ where: { id: data.id }, data: payload });
  return prisma.geoDistrict.upsert({
    where: { provinceId_slug: { provinceId: data.provinceId, slug } },
    create: payload,
    update: payload,
  });
}

export async function upsertGeoNeighborhood(data: {
  id?: string;
  districtId: string;
  name: string;
  slug?: string;
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean;
}) {
  const slug = data.slug || toSlug(data.name);
  const payload = {
    districtId: data.districtId,
    name: data.name.trim(),
    slug,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    isActive: data.isActive ?? true,
  };
  if (data.id) return prisma.geoNeighborhood.update({ where: { id: data.id }, data: payload });
  return prisma.geoNeighborhood.upsert({
    where: { districtId_slug: { districtId: data.districtId, slug } },
    create: payload,
    update: payload,
  });
}

export async function upsertGeoVillage(data: {
  id?: string;
  districtId: string;
  name: string;
  slug?: string;
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean;
}) {
  const slug = data.slug || toSlug(data.name);
  const payload = {
    districtId: data.districtId,
    name: data.name.trim(),
    slug,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    isActive: data.isActive ?? true,
  };
  if (data.id) return prisma.geoVillage.update({ where: { id: data.id }, data: payload });
  return prisma.geoVillage.upsert({
    where: { districtId_slug: { districtId: data.districtId, slug } },
    create: payload,
    update: payload,
  });
}

export async function deleteGeoEntity(
  entity: "countries" | "provinces" | "districts" | "neighborhoods" | "villages",
  id: string
) {
  switch (entity) {
    case "countries":
      return prisma.geoCountry.delete({ where: { id } });
    case "provinces":
      return prisma.geoProvince.delete({ where: { id } });
    case "districts":
      return prisma.geoDistrict.delete({ where: { id } });
    case "neighborhoods":
      return prisma.geoNeighborhood.delete({ where: { id } });
    case "villages":
      return prisma.geoVillage.delete({ where: { id } });
  }
}

export async function getGeoStats() {
  const [countries, provinces, districts, neighborhoods, villages, streets] = await Promise.all([
    prisma.geoCountry.count(),
    prisma.geoProvince.count(),
    prisma.geoDistrict.count(),
    prisma.geoNeighborhood.count(),
    prisma.geoVillage.count(),
    prisma.geoStreet.count(),
  ]);
  return { countries, provinces, districts, neighborhoods, villages, streets };
}
