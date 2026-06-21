import { prisma } from "@/lib/db";
import { parsePagination, toSlug, type PaginatedResult } from "./pagination";

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
  const provinceSlug = searchParams.get("province") || searchParams.get("provinceSlug") || "";
  const districtSlug = searchParams.get("district") || searchParams.get("districtSlug") || "";

  let resolvedProvinceId = provinceId;
  if (!resolvedProvinceId && provinceSlug) {
    const p = await prisma.geoProvince.findFirst({ where: { slug: provinceSlug } });
    resolvedProvinceId = p?.id || "";
  }

  const where = {
    ...(resolvedProvinceId ? { provinceId: resolvedProvinceId } : {}),
    ...(districtSlug ? { slug: districtSlug } : {}),
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
  const districtId = searchParams.get("districtId") || "";
  const where = {
    ...(districtId ? { districtId } : {}),
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
  const districtId = searchParams.get("districtId") || "";
  const where = {
    ...(districtId ? { districtId } : {}),
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
export async function queryGeoTree(searchParams: URLSearchParams) {
  const level = (searchParams.get("level") || "countries").toLowerCase();
  switch (level) {
    case "countries":
      return { level, ...(await listGeoCountries(searchParams)) };
    case "provinces":
    case "il":
      return { level: "provinces", ...(await listGeoProvinces(searchParams)) };
    case "districts":
    case "ilce":
      return { level: "districts", ...(await listGeoDistricts(searchParams)) };
    case "neighborhoods":
    case "mahalle":
      return { level: "neighborhoods", ...(await listGeoNeighborhoods(searchParams)) };
    case "villages":
    case "koy":
      return { level: "villages", ...(await listGeoVillages(searchParams)) };
    default:
      return { level: "countries", ...(await listGeoCountries(searchParams)) };
  }
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
