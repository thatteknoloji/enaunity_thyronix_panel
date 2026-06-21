import { slugify } from "@/lib/utils";

export type PaginationInput = {
  page?: number;
  limit?: number;
  search?: string;
  activeOnly?: boolean;
};

export type ParsedPagination = {
  page: number;
  limit: number;
  search: string;
  activeOnly: boolean;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function parsePagination(searchParams: URLSearchParams, defaultLimit = 50): ParsedPagination {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || String(defaultLimit), 10) || defaultLimit));
  const search = searchParams.get("search")?.trim() || "";
  const activeOnly = searchParams.get("activeOnly") !== "false";
  return { page, limit, search, activeOnly };
}

export function toSlug(name: string, fallback = "item"): string {
  return slugify(name) || fallback;
}

export function paginate<T>(items: T[], page: number, limit: number): PaginatedResult<T> {
  const total = items.length;
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
