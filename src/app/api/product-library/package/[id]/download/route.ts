import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import { dealerCanAccessPackage, logDistribution } from "@/lib/product-library/access";
import { getPackageItems } from "@/lib/product-library/items";
import { exportPackageItems } from "@/lib/product-library/export";
import type { DistributionFormat } from "@/lib/product-library/types";
import { prisma } from "@/lib/db";
import { resolvePackageTemplate } from "@/lib/product-library/template-engine";
import { buildRecipeExportRows } from "@/lib/product-library/recipe-engine";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await requireDealer();
    const { id } = await params;
    const body = await req.json();
    const format = (body.format || "XML").toUpperCase() as DistributionFormat;
    const recipeId = String(body.recipeId || "");

    const access = await dealerCanAccessPackage(user.dealerId!, id);
    if (!access.ok) {
      return NextResponse.json({ success: false, error: "Erişim reddedildi" }, { status: 403 });
    }

    const items = await getPackageItems(id);
    const template = resolvePackageTemplate(access.pkg, items);
    let exportRows: Array<Record<string, string | number>> | typeof items = items;
    let recipeName = "";
    let storeName = "";

    if (recipeId) {
      const recipe = await prisma.productPackageRecipe.findFirst({
        where: { id: recipeId, packageId: id, dealerId: user.dealerId!, status: "ACTIVE" },
      });
      if (!recipe) {
        return NextResponse.json({ success: false, error: "Reçete bulunamadı" }, { status: 404 });
      }
      recipeName = recipe.name;
      storeName = recipe.storeName || recipe.connectionLabel || "";
      const values = JSON.parse(recipe.valuesJson || "{}");
      exportRows = buildRecipeExportRows({
        items,
        fieldRules: template.fieldRules,
        recipeValues: values,
      }).rows;
      await prisma.productPackageRecipe.update({
        where: { id: recipe.id },
        data: { lastDownloadedAt: new Date(), format },
      });
    }

    const exported = exportPackageItems(exportRows, format);

    await logDistribution({
      packageId: id,
      dealerId: user.dealerId!,
      format,
      recipeId,
      recipeName,
      storeName,
      fileName: `${access.pkg.slug}.${exported.extension}`,
      itemCount: Array.isArray(exportRows) ? exportRows.length : 0,
      userId: user.id,
      userEmail: user.email,
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "",
      userAgent: req.headers.get("user-agent") || "",
    });

    const filename = recipeName
      ? `${access.pkg.slug}-${recipeName.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()}.${exported.extension}`
      : `${access.pkg.slug}.${exported.extension}`;
    if (exported.extension === "xlsx") {
      const bytes = new Uint8Array(exported.body as Buffer);
      return new NextResponse(bytes, {
        headers: {
          "Content-Type": exported.contentType,
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return new NextResponse(exported.body as string, {
      headers: {
        "Content-Type": exported.contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "İndirme hatası";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
