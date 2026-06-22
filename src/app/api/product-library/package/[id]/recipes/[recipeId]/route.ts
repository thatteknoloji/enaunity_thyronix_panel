import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string; recipeId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await requireDealer();
    const { id, recipeId } = await params;
    const body = await req.json();
    const recipe = await prisma.productPackageRecipe.findFirst({
      where: { id: recipeId, packageId: id, dealerId: user.dealerId!, status: "ACTIVE" },
    });
    if (!recipe) {
      return NextResponse.json({ success: false, error: "Reçete bulunamadı" }, { status: 404 });
    }

    let connectionId = String(body.connectionId ?? recipe.connectionId);
    let connectionLabel = recipe.connectionLabel;
    let storeName = String(body.storeName ?? recipe.storeName).trim();
    if (connectionId) {
      const connection = await prisma.marketplaceConnection.findFirst({
        where: { id: connectionId, dealerId: user.dealerId! },
        select: { platform: true, sellerId: true, storeId: true },
      });
      if (!connection) {
        return NextResponse.json({ success: false, error: "Mağaza bağlantısı bulunamadı" }, { status: 404 });
      }
      connectionLabel = `${connection.platform} / ${connection.storeId || connection.sellerId || "Mağaza"}`;
      if (!storeName) storeName = connectionLabel;
    }

    const updated = await prisma.productPackageRecipe.update({
      where: { id: recipeId },
      data: {
        name: String(body.name || recipe.name).trim(),
        connectionId,
        connectionLabel,
        storeName,
        format: String(body.format || recipe.format).toUpperCase(),
        valuesJson: JSON.stringify(body.values || {}),
        lastPreviewJson: JSON.stringify(body.lastPreview || {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Reçete güncellenemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await requireDealer();
    const { id, recipeId } = await params;
    const recipe = await prisma.productPackageRecipe.findFirst({
      where: { id: recipeId, packageId: id, dealerId: user.dealerId!, status: "ACTIVE" },
    });
    if (!recipe) {
      return NextResponse.json({ success: false, error: "Reçete bulunamadı" }, { status: 404 });
    }

    await prisma.productPackageRecipe.update({
      where: { id: recipeId },
      data: { status: "DELETED" },
    });
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch {
    return NextResponse.json({ success: false, error: "Silme başarısız" }, { status: 400 });
  }
}
