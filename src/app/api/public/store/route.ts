import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

function firstImageFromJson(imagesJson: string): string {
  try {
    const arr = JSON.parse(imagesJson || "[]");
    return Array.isArray(arr) && typeof arr[0] === "string" ? arr[0] : "";
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return Response.json({ success: false, error: "slug gerekli" }, { status: 400 });
    }

    const store = await prisma.dealerStore.findUnique({
      where: { slug, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        coverImage: true,
        aboutText: true,
        contactEmail: true,
        contactPhone: true,
        themeJson: true,
      },
    });

    if (!store) {
      return Response.json({ success: false, error: "Mağaza bulunamadı" }, { status: 404 });
    }

    const products = await prisma.storeProduct.findMany({
      where: { storeId: store.id, isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    const catalogItemIds = products.map((p) => p.productCatalogItemId);
    const catalogItems =
      catalogItemIds.length > 0
        ? await prisma.productCatalogItem.findMany({
            where: { id: { in: catalogItemIds } },
            select: {
              id: true,
              name: true,
              sku: true,
              imagesJson: true,
              category: true,
              price: true,
              salePrice: true,
              brand: true,
            },
          })
        : [];

    const catalogMap = Object.fromEntries(catalogItems.map((c) => [c.id, c]));

    return Response.json({
      success: true,
      data: {
        store,
        products: products.map((p) => {
          const catalogItem = catalogMap[p.productCatalogItemId];
          return {
            id: p.id,
            storeProductId: p.id,
            dealerPrice: p.dealerPrice,
            name: catalogItem?.name || "",
            sku: catalogItem?.sku || "",
            image: firstImageFromJson(catalogItem?.imagesJson || "[]"),
            imagesJson: catalogItem?.imagesJson || "[]",
            description: catalogItem?.brand ? `${catalogItem.brand} — ${catalogItem.name}` : "",
            category: catalogItem?.category || "",
            basePrice: catalogItem?.salePrice || catalogItem?.price || 0,
          };
        }),
      },
    });
  } catch {
    return Response.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, customerName, customerEmail, customerPhone, shippingAddress, city, district, zipCode, items, notes } = body;

    if (!slug || !customerName || !customerEmail || !shippingAddress || !items?.length) {
      return Response.json({ success: false, error: "Eksik bilgiler" }, { status: 400 });
    }

    const store = await prisma.dealerStore.findUnique({ where: { slug, status: "ACTIVE" } });
    if (!store) {
      return Response.json({ success: false, error: "Mağaza bulunamadı" }, { status: 404 });
    }

    const productIds = items.map((i: { storeProductId: string }) => i.storeProductId);
    const storeProducts = await prisma.storeProduct.findMany({
      where: { id: { in: productIds }, storeId: store.id, isActive: true },
    });

    const spMap = Object.fromEntries(storeProducts.map((sp) => [sp.id, sp]));
    let totalAmount = 0;
    const enrichedItems = items.map((i: { storeProductId: string; quantity: number }) => {
      const sp = spMap[i.storeProductId];
      if (!sp) throw new Error(`Ürün bulunamadı: ${i.storeProductId}`);
      const lineTotal = sp.dealerPrice * (i.quantity || 1);
      totalAmount += lineTotal;
      return { storeProductId: i.storeProductId, quantity: i.quantity || 1, unitPrice: sp.dealerPrice, lineTotal };
    });

    const order = await prisma.storeOrder.create({
      data: {
        storeId: store.id,
        customerName,
        customerEmail,
        customerPhone: customerPhone || "",
        shippingAddress,
        city: city || "",
        district: district || "",
        zipCode: zipCode || "",
        itemsJson: JSON.stringify(enrichedItems),
        totalAmount,
        notes: notes || "",
        status: "PENDING",
      },
    });

    await prisma.dealerStore.update({
      where: { id: store.id },
      data: { orderCount: { increment: 1 }, totalRevenue: { increment: totalAmount } },
    });

    return Response.json({ success: true, data: { id: order.id, totalAmount } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return Response.json({ success: false, error: msg }, { status: 400 });
  }
}
