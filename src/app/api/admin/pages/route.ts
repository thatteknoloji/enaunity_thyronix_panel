import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { normalizePageTemplate } from "@/lib/pages/types";

export async function GET() {
  try {
    await requireAdmin();
    const pages = await prisma.page.findMany({ orderBy: { order: "asc" } });
    return NextResponse.json({ success: true, data: pages });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { title, slug, content, template, active, order } = await req.json();
    const page = await prisma.page.create({
      data: {
        title,
        slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        content: content || "",
        template: normalizePageTemplate(template),
        active: active !== false,
        order: order || 0,
      },
    });
    return NextResponse.json({ success: true, data: page }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ success: false, error: "Bu slug zaten kullanımda" }, { status: 400 });
    return NextResponse.json({ success: false, error: "Hata" }, { status: 400 });
  }
}
