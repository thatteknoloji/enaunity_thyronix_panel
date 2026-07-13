import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { action, productIds, groupName, options, filterOption, price, stock } = await req.json();
    if (!action || !productIds?.length) {
      return NextResponse.json({ success: false, error: "Eksik veri" }, { status: 400 });
    }

    let updated = 0;

    switch (action) {
      case "generate": {
        if (!groupName || !options?.length) {
          return NextResponse.json({ success: false, error: "Grup adı ve seçenekler gerekli" }, { status: 400 });
        }
        for (const pid of productIds) {
          const product = await prisma.product.findUnique({ where: { id: pid } });
          if (!product) continue;

          // Create or get existing group
          let group = await prisma.variantGroup.findFirst({ where: { productId: pid, name: groupName } });
          if (!group) {
            group = await prisma.variantGroup.create({
              data: { productId: pid, name: groupName },
            });
          }

          // Parse options (support both string[] and {value,price?,stock?}[])
          const parsedOpts = options.map((o: any) => typeof o === "string" ? { value: o } : o);
          const optPrices = new Map<string, {price?: number; stock?: number}>(parsedOpts.map((o: any) => [o.value, { price: o.price ?? price, stock: o.stock ?? stock }]));

          for (const opt of parsedOpts) {
            const existing = await prisma.variantOption.findFirst({ where: { groupId: group.id, value: opt.value } });
            if (!existing) {
              await prisma.variantOption.create({ data: { groupId: group.id, value: opt.value } });
            }
          }

          // Get all groups + options for this product
          const allGroups = await prisma.variantGroup.findMany({
            where: { productId: pid },
            include: { options: true },
            orderBy: { sortOrder: "asc" },
          });

          if (allGroups.every(g => g.options.length > 0)) {
            // Generate all combinations
            const existingVariants = await prisma.variant.findMany({ where: { productId: pid } });
            const existingOptsSet = new Set(existingVariants.map(v => v.options));

            const isNewGroup = !(await prisma.variantGroup.findFirst({ where: { productId: pid, name: groupName } }));
            const comboNames = new Set(parsedOpts.map((o: any) => o.value));

            const optionValues = allGroups.map(g => g.options.map(o => ({ groupId: g.id, groupName: g.name, optionId: o.id, value: o.value })));
            const combos = cartesian(optionValues);

            for (const combo of combos) {
              // Only generate combos that include at least one new option (if this is a new group on existing product)
              if (!isNewGroup && !combo.some((c: any) => comboNames.has(c.value))) continue;

              const optsStr = JSON.stringify(combo.map((c: any) => ({ group: c.groupName, value: c.value })));
              if (existingOptsSet.has(optsStr)) continue;

              // Use per-option price/stock from first matching new option
              let optPrice: number | undefined;
              let optStock: number | undefined;
              for (const c of combo) {
                const p = optPrices.get(c.value);
                if (p) { optPrice = p.price; optStock = p.stock; break; }
              }

              const sku = combo.map((c: any) => c.value).join("-").toUpperCase().replace(/\s+/g, "");
              await prisma.variant.create({
                data: {
                  productId: pid,
                  sku: `${product.sku || "VAR"}-${sku}`,
                  barcode: `2${Date.now().toString().slice(-11)}${Math.random().toString(36).slice(2, 5)}`,
                  price: optPrice ?? price ?? product.price ?? 0,
                  stock: optStock ?? stock ?? 0,
                  options: optsStr,
                },
              });
              updated++;
            }
          }
        }
        break;
      }

      case "edit": {
        if (!filterOption?.group || !filterOption?.value) {
          return NextResponse.json({ success: false, error: "Hedef varyant (grup+değer) gerekli" }, { status: 400 });
        }
        const updateData: Record<string, unknown> = {};
        if (price !== undefined) updateData.price = parseFloat(price);
        if (stock !== undefined) updateData.stock = parseInt(stock);

        if (Object.keys(updateData).length === 0) {
          return NextResponse.json({ success: false, error: "Değiştirilecek alan (fiyat/stok) gerekli" }, { status: 400 });
        }

        for (const pid of productIds) {
          const variants = await prisma.variant.findMany({ where: { productId: pid } });
          for (const v of variants) {
            let opts: any[] = [];
            try { opts = JSON.parse(v.options); } catch {}
            if (opts.some((o: any) => o.group === filterOption.group && o.value === filterOption.value)) {
              await prisma.variant.update({ where: { id: v.id }, data: updateData as any });
              updated++;
            }
          }
        }
        break;
      }

      case "delete": {
        if (!filterOption?.group || !filterOption?.value) {
          return NextResponse.json({ success: false, error: "Hedef varyant (grup+değer) gerekli" }, { status: 400 });
        }
        for (const pid of productIds) {
          const variants = await prisma.variant.findMany({ where: { productId: pid } });
          for (const v of variants) {
            let opts: any[] = [];
            try { opts = JSON.parse(v.options); } catch {}
            if (opts.some((o: any) => o.group === filterOption.group && o.value === filterOption.value)) {
              await prisma.variant.delete({ where: { id: v.id } });
              updated++;
            }
          }
        }
        break;
      }

      case "reset": {
        for (const pid of productIds) {
          await prisma.variant.deleteMany({ where: { productId: pid } });
          await prisma.variantOption.deleteMany({ where: { group: { productId: pid } } });
          await prisma.variantGroup.deleteMany({ where: { productId: pid } });
          updated++;
        }
        break;
      }

      default:
        return NextResponse.json({ success: false, error: "Geçersiz işlem" }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: { updated } });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
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
