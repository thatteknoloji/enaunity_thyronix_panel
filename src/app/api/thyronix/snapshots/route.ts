import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireThyronixAdmin, thyronixErrorResponse } from "@/lib/thyronix/access";

export async function GET() {
  try { await requireThyronixAdmin();
    const items = await prisma.thyronixSnapshot.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json({ success: true, data: items });
  } catch (e) { return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 }); }
}

export async function POST(req: Request) {
  try { await requireThyronixAdmin();
    const body = await req.json();

    // Count current state
    const [productCount, activeCount, passiveCount, errorCount] = await Promise.all([
      prisma.thyronixProduct.count(),
      prisma.thyronixProduct.count({ where: { status: "active" } }),
      prisma.thyronixProduct.count({ where: { status: { not: "active" } } }),
      prisma.thyronixProduct.count({ where: { status: "excluded" } }),
    ]);

    // Capture product data as snapshot
    let snapshotData = null;
    if (body.includeData) {
      const products = await prisma.thyronixProduct.findMany({
        select: { id: true, name: true, price: true, stock: true, brand: true, category: true, status: true, barcode: true },
        take: 50000,
      });
      snapshotData = JSON.stringify(products);
    }

    const snapshot = await prisma.thyronixSnapshot.create({
      data: {
        label: body.label || `Snapshot ${new Date().toLocaleString("tr-TR")}`,
        type: body.type || "manual",
        feedId: body.feedId || null,
        sourceId: body.sourceId || null,
        productCount,
        activeCount,
        passiveCount,
        errorCount,
        warningCount: 0,
        snapshotData,
      },
    });

    return NextResponse.json({ success: true, data: snapshot });
  } catch (e) { return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 }); }
}
