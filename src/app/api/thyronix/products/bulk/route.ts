import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireThyronixDealerOrAdmin,
  thyronixErrorResponse,
  withTenantFilter,
} from "@/lib/thyronix/access";

export async function POST(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const { action, ids, value, type, mode, category, brand } = await req.json();
    if (!action || !ids?.length) {
      return NextResponse.json({ success: false, error: "İşlem ve ürün ID'leri gerekli" }, { status: 400 });
    }

    const allowed = await prisma.thyronixProduct.findMany({
      where: withTenantFilter(user, { id: { in: ids } }),
      select: { id: true },
    });
    const allowedIds = allowed.map((p) => p.id);
    if (allowedIds.length === 0) {
      return NextResponse.json({ success: false, error: "Yetkisiz veya geçersiz ürün" }, { status: 403 });
    }

    let updated = 0;

    switch (action) {
      case "price": {
        const val = parseFloat(value);
        if (isNaN(val)) return NextResponse.json({ success: false, error: "Geçerli bir değer girin" }, { status: 400 });

        if (mode === "replace") {
          // Fast path: use updateMany
          await prisma.thyronixProduct.updateMany({
            where: { id: { in: allowedIds } },
            data: { price: Math.max(0, val) },
          });
          updated = allowedIds.length;
        } else {
          for (const id of allowedIds) {
            const product = await prisma.thyronixProduct.findUnique({ where: { id } });
            if (!product) continue;
            let newPrice: number;
            if (type === "percentage") {
              if (mode === "increase") newPrice = product.price * (1 + val / 100);
              else newPrice = product.price * (1 - val / 100);
            } else {
              if (mode === "increase") newPrice = product.price + val;
              else newPrice = Math.max(0, product.price - val);
            }
            await prisma.thyronixProduct.update({ where: { id }, data: { price: Math.max(0, parseFloat(newPrice.toFixed(2))) } });
            updated++;
          }
        }
        break;
      }

      case "stock": {
        const val = parseInt(value);
        if (isNaN(val)) return NextResponse.json({ success: false, error: "Geçerli bir stok değeri girin" }, { status: 400 });

        if (mode === "replace") {
          await prisma.thyronixProduct.updateMany({ where: { id: { in: allowedIds } }, data: { stock: val } });
          updated = allowedIds.length;
        } else {
          for (const id of allowedIds) {
            const product = await prisma.thyronixProduct.findUnique({ where: { id } });
            if (!product) continue;
            let newStock: number;
            if (mode === "increase") newStock = product.stock + val;
            else newStock = Math.max(0, product.stock - val);
            await prisma.thyronixProduct.update({ where: { id }, data: { stock: newStock } });
            updated++;
          }
        }
        break;
      }

      case "category": {
        if (!category) return NextResponse.json({ success: false, error: "Kategori adı girin" }, { status: 400 });
        await prisma.thyronixProduct.updateMany({
          where: { id: { in: allowedIds } },
          data: { category },
        });
        updated = allowedIds.length;
        break;
      }

      case "brand": {
        if (!brand) return NextResponse.json({ success: false, error: "Marka adı girin" }, { status: 400 });
        await prisma.thyronixProduct.updateMany({
          where: { id: { in: allowedIds } },
          data: { brand },
        });
        updated = allowedIds.length;
        break;
      }

      case "delete": {
        const result = await prisma.thyronixProduct.deleteMany({
          where: { id: { in: allowedIds } },
        });
        updated = result.count;
        break;
      }

      case "apply_rules": {
        // Apply all active rules to selected products
        const rules = await prisma.thyronixRule.findMany({
          where: withTenantFilter(user, { status: "active" }),
        });
        for (const id of allowedIds) {
          const product = await prisma.thyronixProduct.findUnique({ where: { id } });
          if (!product) continue;

          const update: any = {};
          for (const rule of rules) {
            const fieldVal = (product as any)[rule.field];
            let matches = false;

            switch (rule.operator) {
              case "lt": matches = fieldVal < parseFloat(rule.value); break;
              case "gt": matches = fieldVal > parseFloat(rule.value); break;
              case "eq": matches = String(fieldVal) === rule.value; break;
              case "contains": matches = String(fieldVal || "").toLowerCase().includes(rule.value.toLowerCase()); break;
              case "empty": matches = !fieldVal; break;
            }

            if (matches) {
              switch (rule.action) {
                case "setStatus": if (rule.actionValue) update.status = rule.actionValue; break;
                case "adjustPrice": if (rule.actionValue) update.price = parseFloat(rule.actionValue); break;
                case "setStock": if (rule.actionValue) update.stock = parseInt(rule.actionValue); break;
                case "exclude": update.status = "excluded"; break;
              }
              // Update rule affectedCount
              await prisma.thyronixRule.update({
                where: { id: rule.id },
                data: { affectedCount: (rule.affectedCount || 0) + 1 },
              });
            }
          }

          if (Object.keys(update).length > 0) {
            await prisma.thyronixProduct.update({ where: { id }, data: update as any });
            updated++;
          }
        }
        break;
      }

      default:
        return NextResponse.json({ success: false, error: "Geçersiz işlem: " + action }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: { updated } });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
