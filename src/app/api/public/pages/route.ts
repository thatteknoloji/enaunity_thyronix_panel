import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const pages = await prisma.page.findMany({
      where: { active: true },
      select: { id: true, title: true, slug: true, order: true },
      orderBy: { order: "asc" },
    });
    return NextResponse.json({ success: true, data: pages });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
