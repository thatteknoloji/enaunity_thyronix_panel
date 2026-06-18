export async function plApi<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const d = await r.json();
  if (!r.ok || !d.success) throw new Error(d.error || `HTTP ${r.status}`);
  return d.data;
}

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
