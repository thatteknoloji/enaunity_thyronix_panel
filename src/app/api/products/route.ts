import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireAdmin } from "@/lib/auth";
import { getDealerPrice } from "@/lib/dealer-pricing";
import {
  createProductEngineProfile,
  listProductEngineProfiles,
} from "@/lib/product-engine/profile-aggregator";
import type { CreateProductEngineInput } from "@/lib/product-engine/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.get("engine") === "1") {
      await requireAdmin();
      const products = await listProductEngineProfiles({
        category: searchParams.get("category") || undefined,
        productType: searchParams.get("productType") || undefined,
        active: searchParams.get("active") || undefined,
        pod: searchParams.get("pod") || undefined,
        dropship: searchParams.get("dropship") || undefined,
        production: searchParams.get("production") || undefined,
        search: searchParams.get("search") || undefined,
      });
      return NextResponse.json({ success: true, data: products });
    }

    const category = searchParams.get("category");
    const subcategory = searchParams.get("subcategory");
    const search = searchParams.get("search");
    const all = searchParams.get("all") === "true";

    const where: Record<string, unknown> = {};

    if (category && category !== "Tümü") where.category = category;
    if (subcategory) where.subcategory = subcategory;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { category: { contains: search } },
        { subcategory: { contains: search } },
      ];
    }

    let products = await prisma.product.findMany({
      where,
      include: {
        variants: {
          where: { active: true },
          select: { stock: true, options: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!all) {
      const session = await getSession();
      if (session?.dealerId) {
        const dealer = await prisma.dealer.findUnique({
          where: { id: session.dealerId },
          select: { id: true, group: true, discountRate: true },
        });
        if (dealer) {
          const restricted = await prisma.catalogRestriction.findMany({
            where: { group: dealer.group },
            select: { productId: true },
          });
          const restrictedIds = new Set(restricted.map((r) => r.productId));
          products = products.filter((p) => !restrictedIds.has(p.id));

          products = await Promise.all(
            products.map(async (p) => ({
              ...p,
              price: await getDealerPrice(p.id, p.price, dealer.group, dealer.discountRate, undefined, dealer.id),
            }))
          );
        }
      }
    }

    return NextResponse.json({ success: true, data: products });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sunucu hatası";
    const status = msg.includes("Yetkisiz") || msg.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json();

    if (searchParams.get("engine") === "1" || body.engine) {
      await requireAdmin();
      const product = await createProductEngineProfile(body as CreateProductEngineInput);
      return NextResponse.json({ success: true, data: product });
    }

    return NextResponse.json({ success: false, error: "Geçersiz istek" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sunucu hatası";
    const status = msg.includes("Yetkisiz") || msg.includes("Unauthorized") ? 401 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
