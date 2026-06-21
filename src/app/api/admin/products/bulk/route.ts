import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { bulkAssignCampaigns } from "@/lib/products/campaign-assign";
import { normalizeVariantDisplayMode } from "@/lib/products/variant-display";

function genBarcode(): string { return `2${Date.now().toString().slice(-11)}${Math.random().toString(36).slice(2, 5)}`; }

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { ids, action, value, type, mode, categoryId, campaignId } = await req.json();
    if (!ids?.length) return NextResponse.json({ success: false, error: "Ürün seçilmedi" }, { status: 400 });

    const products = await prisma.product.findMany({ where: { id: { in: ids } } });
    let updated = 0;

    if (action === "assignCampaign" || action === "removeCampaign") {
      updated = await bulkAssignCampaigns(
        ids,
        campaignId || value,
        action === "removeCampaign" ? "remove" : (mode === "replace" ? "replace" : "add")
      );
      return NextResponse.json({ success: true, data: { updated } });
    }

    for (const p of products) {
      const update: Record<string, unknown> = {};

      if (action === "barcode") {
        update.barcode = mode === "prefix" ? `${value}${p.barcode}` : mode === "suffix" ? `${p.barcode}${value}` : genBarcode();
      } else if (action === "sku") {
        update.sku = mode === "prefix" ? `${value}${p.sku}` : mode === "suffix" ? `${p.sku}${value}` : `SKU-${Date.now().toString(36).slice(-6)}-${Math.random().toString(36).slice(2, 5)}`;
      } else if (action === "price") {
        const currentPrice = p.price;
        if (type === "percentage") {
          const change = currentPrice * (parseFloat(value) / 100);
          update.price = mode === "increase" ? currentPrice + change : currentPrice - change;
        } else {
          update.price = mode === "increase" ? currentPrice + parseFloat(value) : currentPrice - parseFloat(value);
        }
        update.price = Math.max(0, update.price as number);
      } else if (action === "vat") {
        const vatRate = parseFloat(value) || 0;
        if (mode === "apply") {
          update.price = p.price * (1 + vatRate / 100);
        } else if (mode === "remove") {
          update.price = p.price / (1 + vatRate / 100);
        }
      } else if (action === "name") {
        if (mode === "prefix") update.name = `${value} ${p.name}`;
        else if (mode === "suffix") update.name = `${p.name} ${value}`;
        else if (mode === "replace") update.name = value;
        else if (mode === "replaceFirst") update.name = p.name.replace(new RegExp(`^${value}`), "");
        else if (mode === "replaceLast") update.name = p.name.replace(new RegExp(`${value}$`), "");
      } else if (action === "description") {
        if (mode === "prefix") update.description = `${value}\n${p.description}`;
        else if (mode === "suffix") update.description = `${p.description}\n${value}`;
        else update.description = value;
      } else if (action === "category") {
        if (categoryId) {
          const cat = await prisma.category.findUnique({ where: { id: categoryId } });
          if (cat) { update.category = cat.name; update.subcategory = ""; }
        }
      } else if (action === "variantDisplay") {
        update.variantDisplayMode = normalizeVariantDisplayMode(value);
      } else if (action === "salePrice") {
        update.salePrice = Math.max(0, parseFloat(value) || 0);
      } else if (action === "discountLabel") {
        update.discountLabel = String(value || "");
      }

      if (Object.keys(update).length > 0) {
        await prisma.product.update({ where: { id: p.id }, data: update as any });
        updated++;
      }
    }

    return NextResponse.json({ success: true, data: { updated } });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
