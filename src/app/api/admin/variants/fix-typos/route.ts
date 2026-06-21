import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { normalizeVariantOptionValue } from "@/lib/products/cam-tablo-ebat";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { productIds } = await req.json();
    const where = productIds?.length ? { productId: { in: productIds } } : {};

    const [options, variants] = await Promise.all([
      prisma.variantOption.findMany({
        where: productIds?.length
          ? { group: { productId: { in: productIds } } }
          : {},
        include: { group: { select: { productId: true } } },
      }),
      prisma.variant.findMany({ where }),
    ]);

    let fixed = 0;

    for (const opt of options) {
      const normalized = normalizeVariantOptionValue(opt.value);
      if (normalized !== opt.value) {
        await prisma.variantOption.update({
          where: { id: opt.id },
          data: { value: normalized },
        });
        fixed++;
      }
    }

    for (const v of variants) {
      let parsed: Array<{ group: string; value: string }> = [];
      try {
        parsed = JSON.parse(v.options || "[]");
      } catch {
        continue;
      }
      let changed = false;
      const next = parsed.map((o) => {
        const normalized = normalizeVariantOptionValue(o.value);
        if (normalized !== o.value) changed = true;
        return { ...o, value: normalized };
      });
      if (changed) {
        await prisma.variant.update({
          where: { id: v.id },
          data: { options: JSON.stringify(next) },
        });
        fixed++;
      }
    }

    return NextResponse.json({ success: true, data: { fixed } });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
