import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse, withTenantFilter } from "@/lib/thyronix/access";

export async function GET(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const size = Math.min(parseInt(searchParams.get("size") || "50"), 200);
    const search = searchParams.get("search") || "";
    const sourceId = searchParams.get("sourceId") || "";
    const category = searchParams.get("category") || "";
    const status = searchParams.get("status") || "";
    const barcode = searchParams.get("barcode") || "";
    const stockCode = searchParams.get("stockCode") || "";
    const modelCode = searchParams.get("modelCode") || "";
    const brand = searchParams.get("brand") || "";
    const priceMin = searchParams.get("priceMin") || "";
    const priceMax = searchParams.get("priceMax") || "";
    const stockMin = searchParams.get("stockMin") || "";
    const stockMax = searchParams.get("stockMax") || "";

    const filters: any = {};
    if (sourceId) filters.sourceId = sourceId;

    // Smart search: parse advanced syntax from search query
    let cleanSearch = search;
    if (search) {
      // Parse brand:nike, category:shoes, source:leyna, status:active patterns
      const smartPatterns = [
        { key: "brand", regex: /\bbrand:(\S+)/i },
        { key: "category", regex: /\bcategory:(\S+)/i },
        { key: "source", regex: /\bsource:(\S+)/i },
        { key: "status", regex: /\bstatus:(\S+)/i },
      ];
      for (const p of smartPatterns) {
        const match = search.match(p.regex);
        if (match) {
          if (p.key === "source") {
            // Look up sourceId by name
            const src = await prisma.thyronixSource.findFirst({
              where: withTenantFilter(user, { name: { contains: match[1] } }),
            });
            if (src) filters.sourceId = src.id;
          } else {
            filters[p.key] = { contains: match[1] };
          }
          cleanSearch = cleanSearch.replace(match[0], "").trim();
        }
      }

      // Parse stock<5, stock>10, price<100, price>1000 patterns
      const rangePatterns = [
        { key: "stock", regex: /\bstock\s*(<|>|<=|>=)\s*(\d+)/i },
        { key: "price", regex: /\bprice\s*(<|>|<=|>=)\s*(\d+(?:\.\d+)?)/i },
      ];
      for (const p of rangePatterns) {
        const match = search.match(p.regex);
        if (match) {
          const op = match[1];
          const val = parseFloat(match[2]);
          if (op === "<") filters[p.key] = { ...filters[p.key], lt: val };
          else if (op === ">") filters[p.key] = { ...filters[p.key], gt: val };
          else if (op === "<=") filters[p.key] = { ...filters[p.key], lte: val };
          else if (op === ">=") filters[p.key] = { ...filters[p.key], gte: val };
          cleanSearch = cleanSearch.replace(match[0], "").trim();
        }
      }
    }

    if (category) filters.category = { contains: category };
    if (status) filters.status = status;
    if (barcode) filters.barcode = { contains: barcode };
    if (stockCode) filters.stockCode = { contains: stockCode };
    if (modelCode) filters.modelCode = { contains: modelCode };
    if (brand) filters.brand = { contains: brand };
    if (priceMin) filters.price = { ...filters.price, gte: parseFloat(priceMin) };
    if (priceMax) filters.price = { ...filters.price, lte: parseFloat(priceMax) };
    if (stockMin) filters.stock = { ...filters.stock, gte: parseInt(stockMin) };
    if (stockMax) filters.stock = { ...filters.stock, lte: parseInt(stockMax) };
    if (cleanSearch) {
      filters.OR = [
        { name: { contains: cleanSearch } },
        { description: { contains: cleanSearch } },
        { brand: { contains: cleanSearch } },
        { category: { contains: cleanSearch } },
        { barcode: { contains: cleanSearch } },
        { stockCode: { contains: cleanSearch } },
        { modelCode: { contains: cleanSearch } },
        { externalId: { contains: cleanSearch } },
        { manufacturer: { contains: cleanSearch } },
        { variantData: { contains: cleanSearch } },
        { metadataJson: { contains: cleanSearch } },
        { source: { name: { contains: cleanSearch } } },
      ];
    }

    const where = withTenantFilter(user, filters);

    const [total, products] = await Promise.all([
      prisma.thyronixProduct.count({ where }),
      prisma.thyronixProduct.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * size,
        take: size,
        select: {
          id: true, sourceId: true, externalId: true,
          name: true, description: true, brand: true, category: true,
          barcode: true, stockCode: true, modelCode: true,
          price: true, discountedPrice: true, costPrice: true,
          stock: true, currency: true, image: true, images: true,
          weight: true, dimensions: true, vatRate: true, deliveryTime: true,
          manufacturer: true, warranty: true, shippingCost: true, productUrl: true,
          variantData: true, metadataJson: true, status: true,
          createdAt: true, updatedAt: true,
          source: { select: { name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { items: products, total, page, size, totalPages: Math.ceil(total / size) },
    });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
