import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addDealerBalance } from "@/lib/dealer-pricing";
import { notifyReturnStatus } from "@/lib/notifications";

export async function GET() {
  try {
    await requireAdmin();
    const requests = await prisma.returnRequest.findMany({
      include: {
        items: { include: { product: { select: { name: true } } } },
        dealer: { select: { id: true, company: true, name: true } },
        order: { select: { id: true, total: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: requests });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { id, status, adminNote } = await req.json();

    const request = await prisma.returnRequest.findUnique({
      where: { id },
      include: { items: true, order: true, dealer: { select: { email: true, name: true, phone: true } } },
    });
    if (!request) return NextResponse.json({ success: false, error: "Talep bulunamadı" }, { status: 404 });

    if (status === "approved") {
      // Return stock
      await Promise.all(request.items.map((item) =>
        prisma.stockMovement.create({
          data: { productId: item.productId, type: "return", quantity: item.quantity, note: `İade onay #${id.slice(0, 8)}` },
        })
      ));
      await Promise.all(request.items.map((item) =>
        prisma.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } })
      ));

      // Refund dealer balance
      const refundAmount = request.items.reduce((s, i) => s + i.price * i.quantity, 0);
      if (refundAmount > 0) {
        await addDealerBalance(request.dealerId, refundAmount, request.orderId || undefined, "return_credit", `İade onayı #${id.slice(0, 8)}`);
      }
    }

    await prisma.returnRequest.update({
      where: { id },
      data: { status, adminNote: adminNote || "" },
    });

    await notifyReturnStatus(
      request.dealerId, id, status, adminNote || "",
      request.dealer.email, request.dealer.name, request.dealer.phone
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
