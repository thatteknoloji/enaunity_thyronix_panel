import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { listAllLegalStripItems } from "@/lib/footer-legal-strip";

export async function GET() {
  try {
    await requireAdmin();
    const data = await listAllLegalStripItems();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const maxOrder = await prisma.footerLegalStripItem.aggregate({ _max: { sortOrder: true } });
    const item = await prisma.footerLegalStripItem.create({
      data: {
        label: String(body.label || "").trim(),
        imageUrl: String(body.imageUrl || "").trim(),
        linkUrl: String(body.linkUrl || "").trim(),
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        active: body.active !== false,
      },
    });
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
    for (let i = 0; i < ids.length; i++) {
      await prisma.footerLegalStripItem.update({
        where: { id: ids[i] },
        data: { sortOrder: i },
      });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
