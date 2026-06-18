import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse, withTenantFilter } from "@/lib/thyronix/access";

export async function GET(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const tenantWhere = withTenantFilter(user, {});
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "products";
    const format = searchParams.get("format") || "csv";

    let headers: string[];
    let rows: string[][];

    switch (type) {
      case "products": {
        const products = await prisma.thyronixProduct.findMany({
          where: tenantWhere,
          take: 100000,
          orderBy: { createdAt: "desc" },
        });
        headers = ["name", "barcode", "stockCode", "brand", "category", "price", "stock", "status", "createdAt"];
        rows = products.map((p) => [
          p.name, p.barcode || "", p.stockCode || "", p.brand || "", p.category || "",
          String(p.price), String(p.stock), p.status, String(p.createdAt),
        ]);
        break;
      }
      case "errors": {
        const products = await prisma.thyronixProduct.findMany({
          where: withTenantFilter(user, { OR: [{ price: 0 }, { stock: 0 }, { barcode: null }] }),
          take: 100000,
        });
        headers = ["name", "barcode", "price", "stock", "status", "issue"];
        rows = products.map((p) => {
          const issues = [];
          if (!p.price) issues.push("Fiyat sıfır");
          if (!p.stock) issues.push("Stok sıfır");
          if (!p.barcode) issues.push("Barkod eksik");
          return [p.name, p.barcode || "", String(p.price), String(p.stock), p.status, issues.join(", ")];
        });
        break;
      }
      case "stock": {
        const products = await prisma.thyronixProduct.findMany({
          where: tenantWhere,
          take: 100000,
          orderBy: { stock: "asc" },
        });
        headers = ["name", "barcode", "brand", "category", "stock", "price", "status"];
        rows = products.map((p) => [p.name, p.barcode || "", p.brand || "", p.category || "", String(p.stock), String(p.price), p.status]);
        break;
      }
      case "price": {
        const products = await prisma.thyronixProduct.findMany({
          where: tenantWhere,
          take: 100000,
          orderBy: { price: "desc" },
        });
        headers = ["name", "barcode", "brand", "category", "price", "stock", "status"];
        rows = products.map((p) => [p.name, p.barcode || "", p.brand || "", p.category || "", String(p.price), String(p.stock), p.status]);
        break;
      }
      default:
        return NextResponse.json({ success: false, error: "Geçersiz tip" }, { status: 400 });
    }

    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    return new Response("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=thyronix_${type}_${Date.now()}.csv`,
      },
    });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
