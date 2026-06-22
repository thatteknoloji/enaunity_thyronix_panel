import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logDistribution } from "@/lib/product-library/access";
import { buildDealerPackageExport } from "@/lib/product-library/dealer-export";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await requireDealer();
    const { id } = await params;
    const body = await req.json();
    const recipeId = String(body.recipeId || "");
    const prepared = await buildDealerPackageExport({
      dealerId: user.dealerId!,
      packageId: id,
      recipeId,
      format: String(body.format || "XML"),
    });

    await logDistribution({
      packageId: id,
      dealerId: user.dealerId!,
      format: prepared.format,
      recipeId,
      recipeName: prepared.recipeName,
      storeName: prepared.storeName,
      fileName: prepared.fileName,
      itemCount: prepared.itemCount,
      userId: user.id,
      userEmail: user.email,
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "",
      userAgent: req.headers.get("user-agent") || "",
    });

    if (prepared.recipe?.id) {
      await prisma.productPackageRecipe.update({
        where: { id: prepared.recipe.id },
        data: { lastDownloadedAt: new Date(), format: prepared.format },
      });
    }

    if (prepared.exported.extension === "xlsx") {
      const bytes = new Uint8Array(prepared.exported.body as Buffer);
      return new NextResponse(bytes, {
        headers: {
          "Content-Type": prepared.exported.contentType,
          "Content-Disposition": `attachment; filename="${prepared.fileName}"`,
        },
      });
    }

    return new NextResponse(prepared.exported.body as string, {
      headers: {
        "Content-Type": prepared.exported.contentType,
        "Content-Disposition": `attachment; filename="${prepared.fileName}"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "İndirme hatası";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
