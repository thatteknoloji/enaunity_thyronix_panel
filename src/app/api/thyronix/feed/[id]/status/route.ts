import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const feed = await prisma.thyronixFeed.findUnique({ where: { id } });
    if (!feed) return NextResponse.json({ error: "Feed bulunamadı" }, { status: 404 });

    const sources = await prisma.thyronixSource.findMany({ where: { status: "active" } });
    const productCount = await prisma.thyronixProduct.count({ where: { sourceId: { in: sources.map(s => s.id) } } });

    const origin = _req.headers.get("host") ? `http://${_req.headers.get("host")}` : "";

    return NextResponse.json({
      success: true,
      data: {
        productCount,
        lastGeneratedAt: feed.lastPublished || null,
        supportedFormats: ["xml", "csv", "xlsx", "json"],
        maxRowsPerFormat: 50000,
        outputUrls: {
          xml: `/api/thyronix/feed/${id}/output.xml`,
          csv: `/api/thyronix/feed/${id}/output.csv`,
          xlsx: `/api/thyronix/feed/${id}/output.xlsx`,
          json: `/api/thyronix/feed/${id}/output.json`,
        },
        warnings: productCount > 50000 ? [`${productCount.toLocaleString("tr-TR")} ürün var. Büyük feed'ler için chunked pagination kullanılıyor.`] : [],
      },
    });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
