import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    if (!productId) return NextResponse.json({ success: false, error: "productId gerekli" }, { status: 400 });

    const [groups, combinations] = await Promise.all([
      prisma.variantGroup.findMany({
        where: { productId },
        include: { options: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.variant.findMany({
        where: { productId },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return NextResponse.json({ success: true, data: { groups, combinations } });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

// Create variant group with options OR individual variant
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { productId, name, options, generateCombinations, generateBarcodes, sku, barcode, price, stock, active } = body;

    // Individual variant creation (no group name)
    if (productId && !name) {
      const v = await prisma.variant.create({
        data: {
          productId,
          sku: sku || "",
          barcode: barcode || "",
          price: parseFloat(price) || 0,
          stock: parseInt(stock) || 0,
          options: options || "[]",
          active: active !== false,
        },
      });
      return NextResponse.json({ success: true, data: { variant: v } });
    }

    if (!productId || !name) return NextResponse.json({ success: false, error: "Eksik veri" }, { status: 400 });

    const group = await prisma.variantGroup.create({
      data: {
        productId, name,
        options: {
          create: (options || []).map((v: string, i: number) => ({ value: v, sortOrder: i })),
        },
      },
      include: { options: true },
    });

    // Generate combinations if requested
    let combinations: any[] = [];
    if (generateCombinations) {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      const allGroups = await prisma.variantGroup.findMany({
        where: { productId }, include: { options: true }, orderBy: { sortOrder: "asc" },
      });

      const optionValues = allGroups.map(g => g.options.map(o => ({ groupId: g.id, groupName: g.name, optionId: o.id, value: o.value })));
      combinations = cartesian(optionValues);

      for (const combo of combinations) {
        const sku = combo.map((c: any) => c.value).join("-").toUpperCase().replace(/\s+/g, "");
        const barcode = generateBarcodes ? `2${Date.now().toString().slice(-11)}${Math.random().toString(36).slice(2, 5)}` : "";
        await prisma.variant.create({
          data: {
            productId,
            sku: `${product?.sku || product?.modelCode || "VAR"}-${sku}`,
            barcode,
            price: product?.price || 0,
            stock: 0,
            options: JSON.stringify(combo.map((c: any) => ({ group: c.groupName, value: c.value }))),
          },
        });
      }
    }

    return NextResponse.json({ success: true, data: { group, combinationsCount: combinations.length } });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { id, sku, barcode, price, stock, options, active } = await req.json();
    const update: Record<string, unknown> = {};
    if (sku !== undefined) update.sku = sku;
    if (barcode !== undefined) update.barcode = barcode;
    if (price !== undefined) update.price = parseFloat(price);
    if (stock !== undefined) update.stock = parseInt(stock);
    if (options !== undefined) update.options = options;
    if (active !== undefined) update.active = active;
    await prisma.variant.update({ where: { id }, data: update as any });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { id, type } = await req.json();
    if (type === "group") {
      await prisma.variantGroup.delete({ where: { id } });
      // Also delete all combinations
      await prisma.variant.deleteMany({ where: { productId: (await prisma.variantGroup.findUnique({ where: { id } }))?.productId || "" } });
    } else {
      await prisma.variant.delete({ where: { id } });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

function cartesian(arrays: any[][]): any[][] {
  if (arrays.length === 0) return [[]];
  const result: any[][] = [];
  const rest = cartesian(arrays.slice(1));
  for (const item of arrays[0]) {
    for (const r of rest) {
      result.push([item, ...r]);
    }
  }
  return result;
}
