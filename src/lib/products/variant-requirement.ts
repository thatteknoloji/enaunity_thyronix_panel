import { prisma } from "@/lib/db";

export async function productRequiresVariant(productId: string): Promise<boolean> {
  const count = await prisma.variant.count({
    where: { productId, active: true },
  });
  return count > 0;
}

export async function assertCartVariantSelection(
  items: Array<{ productId: string; variantId?: string | null; product?: { name?: string | null } }>,
) {
  for (const item of items) {
    const requires = await productRequiresVariant(item.productId);
    if (!requires) continue;
    if (!String(item.variantId || "").trim()) {
      const name = item.product?.name || "Ürün";
      throw new Error(`${name} için varyant seçimi zorunludur`);
    }
  }
}
