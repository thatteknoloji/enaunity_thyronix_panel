import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getDealerPrice } from "@/lib/dealer-pricing";
import Link from "next/link";
import { ChevronLeft, Package } from "lucide-react";
import ProductCard from "@/components/ProductCard";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug }, include: { children: true } });

  if (!category) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ena-text">Kategori bulunamadı</h1>
        <Link href="/catalog" className="text-ena-primary hover:underline mt-4 inline-block">Tüm ürünlere dön</Link>
      </div>
    );
  }

  // Get all category names in this tree
  const catNames = [category.name, ...category.children.map(c => c.name)];

  let products = await prisma.product.findMany({
    where: { category: { in: catNames } },
    orderBy: { createdAt: "desc" },
  });

  // Apply dealer pricing
  const session = await getSession();
  if (session?.dealerId) {
    const dealer = await prisma.dealer.findUnique({ where: { id: session.dealerId }, select: { id: true, group: true, discountRate: true } });
    if (dealer) {
      const restricted = await prisma.catalogRestriction.findMany({ where: { group: dealer.group }, select: { productId: true } });
      const restrictedIds = new Set(restricted.map(r => r.productId));
      products = products.filter(p => !restrictedIds.has(p.id));

      products = await Promise.all(products.map(async p => ({
        ...p,
        price: await getDealerPrice(p.id, p.price, dealer.group, dealer.discountRate, undefined, dealer.id),
      } as any)));
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link href="/catalog" className="inline-flex items-center gap-1 text-sm text-ena-light hover:text-ena-text transition-colors mb-6">
        <ChevronLeft size={16} /> Tüm Kategoriler
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-black text-ena-text">{category.name}</h1>
        <p className="mt-2 text-ena-light">{products.length} ürün</p>
        {category.children.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            <Link href={`/categories/${category.slug}`} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-ena-primary text-white">
              Tümü
            </Link>
            {category.children.map(child => (
              <Link key={child.id} href={`/categories/${child.slug}`}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-ena-light border border-ena-border hover:text-white hover:border-white/30 transition-colors">
                {child.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-ena-border rounded-xl">
          <Package size={40} className="mx-auto text-ena-light/30" />
          <p className="mt-3 text-ena-light">Bu kategoride henüz ürün yok</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map(p => <ProductCard key={p.id} product={p as any} />)}
        </div>
      )}
    </div>
  );
}
