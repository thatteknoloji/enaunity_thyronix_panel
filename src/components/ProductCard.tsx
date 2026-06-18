import Link from "next/link";
import { formatPrice } from "@/lib/utils";

export default function ProductCard({ product, campaign }: { product: any; campaign?: { badge: string; badgeColor: string; endsAt: string } | null }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group rounded-lg border border-ena-border bg-ena-card/50 overflow-hidden hover:border-ena-primary/30 hover:shadow-lg hover:shadow-ena-red/5 transition-all duration-300 relative"
    >
      {campaign?.badge && (
        <span className="absolute top-2 right-2 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: campaign.badgeColor || "#e50914" }}>
          {campaign.badge}
        </span>
      )}
      {product.stock <= product.minStockLevel && product.stock > 0 && (
        <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full">Sınırlı Stok</span>
      )}
      {product.minOrderQuantity > 1 && (
        <span className="absolute bottom-2 left-2 bg-purple-500/80 text-white text-[10px] px-2 py-0.5 rounded-full">Toplu Ürün</span>
      )}
      <div className="aspect-[2/3] bg-ena-gray relative overflow-hidden">
        <img
          src={product.image || "/placeholder.svg"}
          alt={product.name}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="p-3">
        <p className="text-xs text-ena-light/60 uppercase tracking-wider">{product.category}</p>
        <h3 className="text-sm font-semibold text-ena-text mt-1 line-clamp-2 group-hover:text-ena-primary transition-colors">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-lg font-bold text-ena-primary">{formatPrice(product.price)}</span>
        </div>
      </div>
    </Link>
  );
}
