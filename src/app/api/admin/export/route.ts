import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "products";

    let data: Record<string, unknown>[] = [];
    let filename = "";

    if (type === "products") {
      const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
      data = products.map((p) => ({
        ID: p.id,
        "Ürün Adı": p.name,
        Kategori: p.category,
        "Alt Kategori": p.subcategory,
        Fiyat: p.price,
        Stok: p.stock,
        "Min Sipariş": p.minOrderQuantity,
        "Oluşturma": p.createdAt.toISOString(),
      }));
      filename = "urunler.xlsx";
    } else if (type === "orders") {
      const orders = await prisma.order.findMany({
        include: { user: { select: { name: true, email: true } }, dealer: { select: { company: true } } },
        orderBy: { createdAt: "desc" },
      });
      data = orders.map((o) => ({
        ID: o.id,
        Müşteri: o.user.name,
        Email: o.user.email,
        Bayi: o.dealer?.company || "-",
        Toplam: o.total,
        Durum: o.status,
        Adres: o.address,
        Tarih: o.createdAt.toISOString(),
      }));
      filename = "siparisler.xlsx";
    } else if (type === "dealers") {
      const dealers = await prisma.dealer.findMany({ orderBy: { company: "asc" } });
      data = dealers.map((d) => ({
        ID: d.id,
        Firma: d.company,
        İsim: d.name,
        Email: d.email,
        Telefon: d.phone,
        Grup: d.group,
        "İndirim %": d.discountRate,
        "Kredi Limiti": d.creditLimit,
        "Açılış Bakiyesi": d.openingBalance,
        Durum: d.status,
        Tarih: d.createdAt.toISOString(),
      }));
      filename = "bayiler.xlsx";
    } else if (type === "stock") {
      const movements = await prisma.stockMovement.findMany({
        include: { product: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 1000,
      });
      data = movements.map((m) => ({
        ID: m.id,
        Ürün: m.product.name,
        Tür: m.type === "entry" ? "Giriş" : m.type === "exit" ? "Çıkış" : m.type === "return" ? "İade" : "Düzeltme",
        Miktar: m.quantity,
        Not: m.note,
        Tarih: m.createdAt.toISOString(),
      }));
      filename = "stok-hareketleri.xlsx";
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Veri");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
