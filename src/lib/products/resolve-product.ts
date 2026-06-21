import { prisma } from "@/lib/db";

const productInclude = {
  tieredPrices: { orderBy: { minQuantity: "asc" as const } },
  variants: { where: { active: true }, orderBy: { createdAt: "asc" as const } },
};

export async function findProductByKey(key: string) {
  const trimmed = key.trim();
  if (!trimmed) return null;

  let product = await prisma.product.findUnique({
    where: { id: trimmed },
    include: productInclude,
  });
  if (product) return product;

  product = await prisma.product.findFirst({
    where: { slug: trimmed },
    include: productInclude,
  });
  if (product) return product;

  product = await prisma.product.findFirst({
    where: { OR: [{ barcode: trimmed }, { sku: trimmed }] },
    include: productInclude,
  });
  if (product) return product;

  const suffix = trimmed.split("-").pop();
  if (suffix && suffix.length >= 6) {
    product = await prisma.product.findFirst({
      where: {
        OR: [{ id: { endsWith: suffix } }, { slug: { endsWith: suffix } }],
      },
      include: productInclude,
    });
  }

  return product;
}
