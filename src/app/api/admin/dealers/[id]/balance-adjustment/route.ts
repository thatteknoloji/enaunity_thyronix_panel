import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { addDealerBalance, deductDealerBalance } from "@/lib/dealer-pricing";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id: dealerId } = await params;
    const { direction, amount, note } = await req.json();

    if (!direction || !amount || !note?.trim()) {
      return NextResponse.json(
        { success: false, error: "Yön, tutar ve açıklama zorunlu" },
        { status: 400 },
      );
    }

    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      return NextResponse.json({ success: false, error: "Geçerli tutar girin" }, { status: 400 });
    }

    const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
    if (!dealer) return NextResponse.json({ success: false, error: "Bayi bulunamadı" }, { status: 404 });

    const adminNote = `[${admin.name}] ${note.trim()}`;

    if (direction === "credit") {
      await addDealerBalance(dealerId, parsed, undefined, "MANUAL_ADJUSTMENT", adminNote);
    } else if (direction === "debit") {
      await deductDealerBalance(dealerId, parsed, undefined, "MANUAL_ADJUSTMENT", adminNote);
    } else {
      return NextResponse.json({ success: false, error: "Geçersiz yön" }, { status: 400 });
    }

    await createNotification({
      dealerId,
      title: direction === "credit" ? "Bakiye eklendi" : "Bakiye düşüldü",
      message: `${parsed.toLocaleString("tr-TR")} ₺ — ${note.trim()}`,
      type: "balance",
      link: "/dealer/balance",
    });

    return NextResponse.json({ success: true, message: "Bakiye güncellendi" });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "İşlem hatası" },
      { status: 400 },
    );
  }
}
