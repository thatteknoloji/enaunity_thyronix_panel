import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import { dealerCanAccessPackage } from "@/lib/product-library/access";
import { getPackageItems } from "@/lib/product-library/items";
import { resolvePackageTemplate } from "@/lib/product-library/template-engine";
import { buildRecipePreview } from "@/lib/product-library/recipe-engine";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await requireDealer();
    const { id } = await params;
    const access = await dealerCanAccessPackage(user.dealerId!, id);
    if (!access.ok) {
      return NextResponse.json({ success: false, error: "Erişim reddedildi" }, { status: 403 });
    }

    const body = await req.json();
    const items = await getPackageItems(id);
    const template = resolvePackageTemplate(access.pkg, items);

    let recipeValues = body.values || {};
    if (body.recipeId) {
      const recipe = await prisma.productPackageRecipe.findFirst({
        where: { id: String(body.recipeId), packageId: id, dealerId: user.dealerId!, status: "ACTIVE" },
      });
      if (!recipe) {
        return NextResponse.json({ success: false, error: "Reçete bulunamadı" }, { status: 404 });
      }
      recipeValues = JSON.parse(recipe.valuesJson || "{}");
    }

    const preview = buildRecipePreview({
      items,
      fieldRules: template.fieldRules,
      recipeValues,
    });

    return NextResponse.json({ success: true, data: preview });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Önizleme alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
