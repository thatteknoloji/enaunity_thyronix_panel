import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createNotification, sendEmail } from "@/lib/notifications";

export async function GET() {
  try {
    await requireAdmin();
    const quotes = await prisma.quote.findMany({
      include: {
        dealer: { select: { id: true, company: true, name: true, email: true } },
        items: { include: { product: { select: { name: true, image: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: quotes });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { id, status, adminNote, items } = await req.json();

    if (!["pending", "approved", "rejected", "countered"].includes(status)) {
      return NextResponse.json({ success: false, error: "Geçersiz durum" }, { status: 400 });
    }

    const quote = await prisma.quote.update({
      where: { id },
      data: {
        status,
        adminNote: adminNote || "",
        ...(items ? { items: { deleteMany: {}, create: items } } : {}),
      },
      include: { dealer: true, items: true },
    });

    const statusLabels: Record<string, string> = {
      pending: "Beklemede",
      approved: "Onaylandı",
      rejected: "Reddedildi",
      countered: "Karşı Teklif",
    };

    await createNotification({
      dealerId: quote.dealerId,
      title: "Teklif Güncellendi",
      message: `Teklifiniz "${statusLabels[status]}" olarak güncellendi.`,
      type: "info",
      link: "/dealer/quotes",
    });

    sendEmail({
      to: quote.dealer.email,
      subject: `Teklif Durumu: ${statusLabels[status]}`,
      html: `<h2>Merhaba ${quote.dealer.name},</h2><p>Teklifiniz <b>${statusLabels[status]}</b> olarak güncellendi.</p>${adminNote ? `<p>Not: ${adminNote}</p>` : ""}`,
    }).catch(() => {});

    return NextResponse.json({ success: true, data: quote });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
