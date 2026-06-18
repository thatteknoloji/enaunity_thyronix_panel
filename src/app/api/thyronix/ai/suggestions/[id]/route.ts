import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireThyronixAdmin } from "@/lib/thyronix/access";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireThyronixAdmin();
    const { id } = await params;
    const body = await req.json();
    const { action } = body; // accept, reject, apply, lock

    const suggestion = await prisma.thyronixAiSuggestion.findUnique({ where: { id } });
    if (!suggestion) return NextResponse.json({ error: "Öneri bulunamadı" }, { status: 404 });

    const data: any = {};

    if (action === "accept") {
      data.status = "accepted";
    } else if (action === "reject") {
      data.status = "rejected";
      data.rejectedAt = new Date();
    } else if (action === "apply") {
      data.status = "applied";
      data.appliedAt = new Date();

      const product = await prisma.thyronixProduct.findUnique({ where: { id: suggestion.productId } });
      if (!product) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });

      const fieldMap: Record<string, string> = {
        title_optimize: "name",
        description_generate: "description",
        category_suggest: "category",
        attribute_extract: "variantData",
      };

      const field = fieldMap[suggestion.taskType];
      if (field) {
        await prisma.thyronixProduct.update({
          where: { id: suggestion.productId },
          data: { [field]: suggestion.suggestedValue },
        });
      }
    } else if (action === "lock") {
      data.fieldLocked = true;
    }

    const updated = await prisma.thyronixAiSuggestion.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireThyronixAdmin();
    const { id } = await params;
    await prisma.thyronixAiSuggestion.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
