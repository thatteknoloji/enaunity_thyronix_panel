import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const page = await prisma.page.findUnique({ where: { slug, active: true } });
    if (!page) return NextResponse.json({ success: false, error: "Sayfa bulunamadı" }, { status: 404 });
    return NextResponse.json({ success: true, data: page });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
