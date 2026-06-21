import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function ensureProductSlug(
  name: string,
  sku?: string,
  excludeId?: string
): Promise<string> {
  const base = slugify(name) || slugify(sku || "") || "urun";
  let candidate = base;
  let i = 0;

  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    i += 1;
    candidate = `${base}-${i}`;
  }
}

export async function resolveProductSlug(
  productId: string,
  name: string,
  currentSlug?: string | null
): Promise<string> {
  const trimmed = (currentSlug || "").trim();
  if (trimmed) return trimmed;
  return ensureProductSlug(name, undefined, productId);
}
