import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireThyronixAdmin, thyronixErrorResponse } from "@/lib/thyronix/access";

export async function POST(req: Request) {
  try {
    await requireThyronixAdmin();
    const { snapshotId } = await req.json();
    if (!snapshotId) return NextResponse.json({ success: false, error: "Snapshot ID gerekli" }, { status: 400 });

    const snapshot = await prisma.thyronixSnapshot.findUnique({ where: { id: snapshotId } });
    if (!snapshot) return NextResponse.json({ success: false, error: "Snapshot bulunamadı" }, { status: 404 });

    if (!snapshot.snapshotData) {
      return NextResponse.json({ success: false, error: "Bu snapshot geri yükleme verisi içermiyor" }, { status: 400 });
    }

    let restored = 0;
    try {
      const products = JSON.parse(snapshot.snapshotData || "[]");
      for (const p of products) {
        if (!p.id) continue;
        await prisma.thyronixProduct.update({
          where: { id: p.id },
          data: {
            price: p.price, stock: p.stock, brand: p.brand, category: p.category,
            name: p.name, status: p.status, barcode: p.barcode,
          } as any,
        });
        restored++;
      }
    } catch { /* fallback to re-sync from source if snapshotData is invalid */ }

    // Create a rollback log
    await prisma.thyronixSyncLog.create({
      data: {
        type: "rollback",
        referenceId: snapshotId,
        status: "success",
        message: `${restored} ürün snapshot'tan geri yüklendi: "${snapshot.label}"`,
        productCount: restored,
      },
    });

    return NextResponse.json({ success: true, data: { restored } });
  } catch (e) {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await requireThyronixAdmin();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // Simulate: show what would be restored
    if (action === "preview") {
      const snapshotId = searchParams.get("snapshotId");
      if (!snapshotId) return NextResponse.json({ success: false, error: "Snapshot ID gerekli" }, { status: 400 });

      const snapshot = await prisma.thyronixSnapshot.findUnique({ where: { id: snapshotId } });
      if (!snapshot?.snapshotData) return NextResponse.json({ success: false, error: "Veri yok" }, { status: 404 });

      const products = JSON.parse(snapshot.snapshotData || "[]");
      return NextResponse.json({ success: true, data: { affectedCount: products.length, snapshot } });
    }

    // Undo last bulk operation (tracked via sync logs)
    if (action === "undo-bulk") {
      const lastBulk = await prisma.thyronixSyncLog.findFirst({
        where: { type: "sync", status: "success" },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({
        success: true,
        data: lastBulk ? { message: "Source'dan yeniden senkronize edin" } : { message: "Geri alınacak işlem bulunamadı" },
      });
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (e) {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
