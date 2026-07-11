import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { UniverseGeoLevel } from "@/lib/page-factory/types";

export type UniverseGeoNode = {
  id: string;
  level: UniverseGeoLevel | "street";
  name: string;
  path: string;
  slug: string;
  provinceName?: string;
  districtName?: string;
  hierarchyLevel: number;
};

export type UniverseGeoFilters = {
  geoLevel?: UniverseGeoLevel | "street";
  geoLimit?: number;
  provinceIds?: string[];
  districtIds?: string[];
  neighborhoodIds?: string[];
  villageIds?: string[];
};

const GEO_LEVEL_LIMITS: Record<string, number> = {
  province: 81,
  district: 973,
  neighborhood: 5000,
  village: 5000,
  street: 3000,
};

export function resolveGeoLevelLimit(level: string, requested?: number): number {
  const max = GEO_LEVEL_LIMITS[level] || 500;
  if (!requested || requested <= 0) return max;
  return Math.min(requested, max);
}

export async function getGeoCatalogCounts() {
  const stats = await prisma.geoProvince.count({ where: { isActive: true } }).then(async (provinces) => {
    const [districts, neighborhoods, villages, streets] = await Promise.all([
      prisma.geoDistrict.count({ where: { isActive: true } }),
      prisma.geoNeighborhood.count({ where: { isActive: true } }),
      prisma.geoVillage.count({ where: { isActive: true } }),
      prisma.geoStreet.count({ where: { isActive: true } }),
    ]);
    return { provinces, districts, neighborhoods, villages, streets };
  });
  return stats;
}

/** Türkiye GEO — DB'deki orijinal il/ilçe/mahalle/köy/cadde kayıtları */
export async function resolveUniverseGeoNodes(filters: UniverseGeoFilters): Promise<UniverseGeoNode[]> {
  const level = filters.geoLevel || "province";
  const take = resolveGeoLevelLimit(level, filters.geoLimit);
  const nodes: UniverseGeoNode[] = [];

  if (level === "province") {
    const provinces = await prisma.geoProvince.findMany({
      where: {
        isActive: true,
        ...(filters.provinceIds?.length ? { id: { in: filters.provinceIds } } : {}),
      },
      orderBy: { plateCode: "asc" },
      take,
    });
    for (const p of provinces) {
      nodes.push({
        id: p.id,
        level: "province",
        name: p.name,
        path: p.name,
        slug: p.slug || slugify(p.name),
        provinceName: p.name,
        hierarchyLevel: 1,
      });
    }
    return nodes;
  }

  if (level === "district") {
    const districts = await prisma.geoDistrict.findMany({
      where: {
        isActive: true,
        ...(filters.districtIds?.length ? { id: { in: filters.districtIds } } : {}),
        ...(filters.provinceIds?.length ? { provinceId: { in: filters.provinceIds } } : {}),
      },
      include: { province: { select: { name: true, slug: true } } },
      orderBy: [{ province: { plateCode: "asc" } }, { name: "asc" }],
      take,
    });
    for (const d of districts) {
      const path = `${d.province.name} > ${d.name}`;
      nodes.push({
        id: d.id,
        level: "district",
        name: d.name,
        path,
        slug: slugify(path),
        provinceName: d.province.name,
        districtName: d.name,
        hierarchyLevel: 2,
      });
    }
    return nodes;
  }

  if (level === "neighborhood") {
    const neighborhoods = await prisma.geoNeighborhood.findMany({
      where: {
        isActive: true,
        ...(filters.neighborhoodIds?.length ? { id: { in: filters.neighborhoodIds } } : {}),
        ...(filters.districtIds?.length ? { districtId: { in: filters.districtIds } } : {}),
      },
      include: { district: { include: { province: { select: { name: true } } } } },
      orderBy: { name: "asc" },
      take,
    });
    for (const n of neighborhoods) {
      const path = `${n.district.province.name} > ${n.district.name} > ${n.name}`;
      nodes.push({
        id: n.id,
        level: "neighborhood",
        name: n.name,
        path,
        slug: slugify(path),
        provinceName: n.district.province.name,
        districtName: n.district.name,
        hierarchyLevel: 3,
      });
    }
    return nodes;
  }

  if (level === "village") {
    const villages = await prisma.geoVillage.findMany({
      where: {
        isActive: true,
        ...(filters.villageIds?.length ? { id: { in: filters.villageIds } } : {}),
        ...(filters.districtIds?.length ? { districtId: { in: filters.districtIds } } : {}),
      },
      include: { district: { include: { province: { select: { name: true } } } } },
      orderBy: { name: "asc" },
      take,
    });
    for (const v of villages) {
      const path = `${v.district.province.name} > ${v.district.name} > ${v.name}`;
      nodes.push({
        id: v.id,
        level: "village",
        name: v.name,
        path,
        slug: slugify(path),
        provinceName: v.district.province.name,
        districtName: v.district.name,
        hierarchyLevel: 4,
      });
    }
    return nodes;
  }

  // street / cadde
  const streets = await prisma.geoStreet.findMany({
    where: {
      isActive: true,
      ...(filters.neighborhoodIds?.length ? { neighborhoodId: { in: filters.neighborhoodIds } } : {}),
    },
    include: {
      neighborhood: {
        include: { district: { include: { province: { select: { name: true } } } } },
      },
    },
    orderBy: { name: "asc" },
    take,
  });
  for (const s of streets) {
    const d = s.neighborhood.district;
    const path = `${d.province.name} > ${d.name} > ${s.neighborhood.name} > ${s.name}`;
    nodes.push({
      id: s.id,
      level: "street",
      name: s.name,
      path,
      slug: slugify(path),
      provinceName: d.province.name,
      districtName: d.name,
      hierarchyLevel: 5,
    });
  }
  return nodes;
}
