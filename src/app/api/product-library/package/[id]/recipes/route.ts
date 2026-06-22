import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import { dealerCanAccessPackage } from "@/lib/product-library/access";
import { getPackageItems } from "@/lib/product-library/items";
import { prisma } from "@/lib/db";
import { resolvePackageTemplate } from "@/lib/product-library/template-engine";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireDealer();
    const { id } = await params;
    const access = await dealerCanAccessPackage(user.dealerId!, id);
    if (!access.ok) {
      return NextResponse.json({ success: false, error: "Erişim reddedildi" }, { status: 403 });
    }

    const [items, recipes, connections] = await Promise.all([
      getPackageItems(id),
      prisma.productPackageRecipe.findMany({
        where: { packageId: id, dealerId: user.dealerId!, status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.marketplaceConnection.findMany({
        where: { dealerId: user.dealerId!, active: true },
        orderBy: [{ platform: "asc" }, { updatedAt: "desc" }],
        select: { id: true, platform: true, sellerId: true, storeId: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        template: resolvePackageTemplate(access.pkg, items),
        recipes,
        connections: connections.map((connection) => ({
          ...connection,
          label: `${connection.platform} / ${connection.storeId || connection.sellerId || "Mağaza"}`,
        })),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await requireDealer();
    const { id } = await params;
    const access = await dealerCanAccessPackage(user.dealerId!, id);
    if (!access.ok) {
      return NextResponse.json({ success: false, error: "Erişim reddedildi" }, { status: 403 });
    }

    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ success: false, error: "Reçete adı zorunlu" }, { status: 400 });
    }

    const connectionId = String(body.connectionId || "");
    const format = String(body.format || "EXCEL").toUpperCase();
    let connectionLabel = "";
    let storeName = String(body.storeName || "").trim();

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

    const recipe = await prisma.productPackageRecipe.create({
      data: {
        packageId: id,
        dealerId: user.dealerId!,
        connectionId,
        connectionLabel,
        name,
        storeName,
        format,
        valuesJson: JSON.stringify(body.values || {}),
        lastPreviewJson: JSON.stringify(body.lastPreview || {}),
      },
    });

    return NextResponse.json({ success: true, data: recipe });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Reçete kaydedilemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
