import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    if (!slug) {
      return NextResponse.json({ success: false, error: "slug gerekli" }, { status: 400 });
    }

    const store = await prisma.dealerStore.findUnique({
      where: { slug },
      select: {
        id: true, name: true, slug: true, status: true,
        logo: true, coverImage: true, aboutText: true,
        contactEmail: true, contactPhone: true, themeJson: true,
      },
    });

    if (!store || store.status !== "ACTIVE") {
      return NextResponse.json({ success: false, error: "Mağaza bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: store });
  } catch (e) {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
