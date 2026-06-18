import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const contracts = await prisma.contract.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ success: true, data: contracts });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { title, slug, content, type } = await req.json();
    const c = await prisma.contract.create({ data: { title, slug: slug || title.toLowerCase().replace(/\s+/g, "-"), content, type: type || "page" } });
    return NextResponse.json({ success: true, data: c });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
