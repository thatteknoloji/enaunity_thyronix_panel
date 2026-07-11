import { prisma } from "@/lib/db";
import { parsePagination, toSlug, type PaginatedResult } from "./pagination";

export async function listIndustries(searchParams: URLSearchParams): Promise<PaginatedResult<unknown>> {
  const { page, limit, search, activeOnly } = parsePagination(searchParams);
  const where = {
    ...(activeOnly ? { isActive: true } : {}),
    ...(search ? { OR: [{ name: { contains: search } }, { slug: { contains: search } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.industry.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { categories: true } } },
    }),
    prisma.industry.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function listIndustryCategories(searchParams: URLSearchParams) {
  const { page, limit, search, activeOnly } = parsePagination(searchParams);
  const industryId = searchParams.get("industryId") || "";
  const industrySlug = searchParams.get("industry") || searchParams.get("industrySlug") || "";

  let resolvedIndustryId = industryId;
  if (!resolvedIndustryId && industrySlug) {
    const ind = await prisma.industry.findFirst({ where: { slug: industrySlug } });
    resolvedIndustryId = ind?.id || "";
  }

  const where = {
    ...(resolvedIndustryId ? { industryId: resolvedIndustryId } : {}),
    ...(activeOnly ? { isActive: true } : {}),
    ...(search ? { name: { contains: search } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.industryCategory.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { industry: { select: { name: true, slug: true } } },
    }),
    prisma.industryCategory.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function upsertIndustry(data: {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
}) {
  const slug = data.slug || toSlug(data.name);
  const payload = {
    name: data.name.trim(),
    slug,
    description: data.description?.trim() || "",
    isActive: data.isActive ?? true,
  };
  if (data.id) return prisma.industry.update({ where: { id: data.id }, data: payload });
  return prisma.industry.upsert({ where: { slug }, create: payload, update: payload });
}

export async function upsertIndustryCategory(data: {
  id?: string;
  industryId: string;
  name: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
}) {
  const slug = data.slug || toSlug(data.name);
  const payload = {
    industryId: data.industryId,
    name: data.name.trim(),
    slug,
    description: data.description?.trim() || "",
    isActive: data.isActive ?? true,
  };
  if (data.id) return prisma.industryCategory.update({ where: { id: data.id }, data: payload });
  return prisma.industryCategory.upsert({
    where: { industryId_slug: { industryId: data.industryId, slug } },
    create: payload,
    update: payload,
  });
}

export async function deleteIndustry(id: string) {
  return prisma.industry.delete({ where: { id } });
}

export async function deleteIndustryCategory(id: string) {
  return prisma.industryCategory.delete({ where: { id } });
}

export async function listSearchIntents(searchParams: URLSearchParams) {
  const { page, limit, search, activeOnly } = parsePagination(searchParams);
  const where = {
    ...(activeOnly ? { isActive: true } : {}),
    ...(search ? { OR: [{ name: { contains: search } }, { slug: { contains: search } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.searchIntent.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * limit, take: limit }),
    prisma.searchIntent.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function upsertSearchIntent(data: {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
}) {
  const slug = data.slug || toSlug(data.name);
  const payload = {
    name: data.name.trim(),
    slug,
    description: data.description?.trim() || "",
    isActive: data.isActive ?? true,
  };
  if (data.id) return prisma.searchIntent.update({ where: { id: data.id }, data: payload });
  return prisma.searchIntent.upsert({ where: { slug }, create: payload, update: payload });
}

export async function deleteSearchIntent(id: string) {
  return prisma.searchIntent.delete({ where: { id } });
}

export async function listQuestionPatterns(searchParams: URLSearchParams) {
  const { page, limit, search, activeOnly } = parsePagination(searchParams, 100);
  const type = searchParams.get("type") || "";
  const where = {
    ...(activeOnly ? { isActive: true } : {}),
    ...(type ? { type } : {}),
    ...(search
      ? { OR: [{ title: { contains: search } }, { pattern: { contains: search } }] }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.questionPattern.findMany({ where, orderBy: { title: "asc" }, skip: (page - 1) * limit, take: limit }),
    prisma.questionPattern.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function upsertQuestionPattern(data: {
  id?: string;
  title: string;
  pattern: string;
  type?: string;
  isActive?: boolean;
}) {
  const payload = {
    title: data.title.trim(),
    pattern: data.pattern.trim(),
    type: data.type?.trim() || "general",
    isActive: data.isActive ?? true,
  };
  if (data.id) return prisma.questionPattern.update({ where: { id: data.id }, data: payload });
  return prisma.questionPattern.create({ data: payload });
}

export async function deleteQuestionPattern(id: string) {
  return prisma.questionPattern.delete({ where: { id } });
}

export async function getDataUniverseStats() {
  const [geo, industries, categories, intents, patterns] = await Promise.all([
    prisma.geoProvince.count(),
    prisma.industry.count(),
    prisma.industryCategory.count(),
    prisma.searchIntent.count(),
    prisma.questionPattern.count(),
  ]);
  return { geoProvinces: geo, industries, categories, intents, patterns };
}
