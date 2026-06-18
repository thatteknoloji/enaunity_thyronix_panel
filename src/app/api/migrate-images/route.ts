import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function imageSlug(cat: string): string {
  const map: Record<string, string> = {
    "Cam Tablo": "cam-tablo", "Mdf Tablo": "mdf-tablo", "Halı": "hali",
    "Kilim": "kilim", "Perde": "perde", "Nevresim": "nevresim",
    "Yastık Kılıfı": "yastik-kılıfı", "Minder": "minder",
    "Puzzle": "puzzle", "Hediyelik Ürünler": "hediyelik-urunler",
  };
  return map[cat] || cat.toLowerCase().replace(/\s+/g, "-");
}

export async function POST() {
  try {
    const products = await prisma.product.findMany();
    let updated = 0;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const slug = imageSlug(product.category);
      const idx = (i % 5) + 1;
      const nextIdx = ((i + 1) % 5) + 1;

      await prisma.product.update({
        where: { id: product.id },
        data: {
          image: `/images/products/${slug}-${idx}.jpg`,
          images: JSON.stringify([
            `/images/products/${slug}-${idx}.jpg`,
            `/images/products/${slug}-${nextIdx}.jpg`,
          ]),
        },
      });
      updated++;
    }

    return NextResponse.json({
      success: true,
      data: { updated },
    });
  } catch (e: any) {
    console.error("Migrate error:", e);
    return NextResponse.json({ success: false, error: e.message || "Migration failed" }, { status: 500 });
  }
}
