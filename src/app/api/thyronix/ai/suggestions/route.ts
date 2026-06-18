import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireThyronixAdmin } from "@/lib/thyronix/access";

export async function GET(req: Request) {
  try {
    await requireThyronixAdmin();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const status = searchParams.get("status");
    const page = Number(searchParams.get("page") || "1");
    const size = Number(searchParams.get("size") || "50");

    const where: any = {};
    if (productId) where.productId = productId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.thyronixAiSuggestion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.thyronixAiSuggestion.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: { items, total, page, size } });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireThyronixAdmin();
    const body = await req.json();
    const { productId, taskType, originalValue, suggestedValue, providerId, model, tokenUsage, cost } = body;

    if (!productId || !taskType || !suggestedValue) {
      return NextResponse.json({ error: "productId, taskType ve suggestedValue zorunlu" }, { status: 400 });
    }

    const suggestion = await prisma.thyronixAiSuggestion.create({
      data: { productId, taskType, originalValue: originalValue || "", suggestedValue, providerId: providerId || "", model: model || "", tokenUsage: tokenUsage || 0, cost: cost || 0 },
    });

    return NextResponse.json({ success: true, data: suggestion });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Sunucu hatası" }, { status: 500 });
  }
}
