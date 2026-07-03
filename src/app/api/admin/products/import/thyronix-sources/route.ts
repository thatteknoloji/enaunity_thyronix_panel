import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const sources = await prisma.thyronixSource.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: sources.map((source) => ({
        id: source.id,
        name: source.name,
        type: source.type,
        inputFormat: source.inputFormat,
        status: source.status,
        productCount: source._count.products,
        lastSync: source.lastSync,
        tenantScope: source.tenantScope,
        ownerType: source.ownerType,
      })),
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}
