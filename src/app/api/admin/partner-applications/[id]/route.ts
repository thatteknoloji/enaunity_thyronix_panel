import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { status } = await req.json();

    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ success: false, error: "Geçersiz durum" }, { status: 400 });
    }

    const application = await prisma.partnerApplication.update({
      where: { id },
      data: { status },
    });

    // Auto-create dealer + link user when bayii application is approved
    if (status === "approved" && application.partnerType === "bayii") {
      const existing = await prisma.dealer.findUnique({ where: { email: application.email } });
      let dealer;
      if (!existing) {
        dealer = await prisma.dealer.create({
          data: {
            name: application.name,
            title: application.title,
            email: application.email,
            phone: application.phone,
            company: application.company,
            website: application.website,
            location: application.location,
            companySize: application.companySize,
            markets: application.markets,
          },
        });
      } else {
        dealer = existing;
      }

      // Link existing user to dealer if they have an account
      const user = await prisma.user.findUnique({ where: { email: application.email } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "dealer", dealerId: dealer.id },
        });
      }
    }

    return NextResponse.json({ success: true, data: application });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
