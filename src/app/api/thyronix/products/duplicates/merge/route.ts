import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireThyronixDealerOrAdmin,
  thyronixErrorResponse,
  withTenantFilter,
} from "@/lib/thyronix/access";
import { buildDuplicateMergePlan } from "@/lib/thyronix/duplicate-merge";

export async function POST(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const body = await req.json();
    const masterId = String(body.masterId || "");
    const duplicateIds = Array.isArray(body.duplicateIds) ? body.duplicateIds.map(String).filter(Boolean) : [];
    const mode = body.mode === "preview" ? "preview" : "apply";

    if (!masterId || duplicateIds.length === 0) {
      return NextResponse.json({ success: false, error: "Master ve duplicate kayıtları gerekli" }, { status: 400 });
    }

    const ids = [...new Set([masterId, ...duplicateIds])];
    const products = await prisma.thyronixProduct.findMany({
      where: {
        AND: [
          withTenantFilter(user, {}),
          { id: { in: ids } },
        ],
      },
      select: {
        id: true,
        sourceId: true,
        name: true,
        description: true,
        brand: true,
        category: true,
        barcode: true,
        stockCode: true,
        modelCode: true,
        externalId: true,
        price: true,
        discountedPrice: true,
        costPrice: true,
        stock: true,
        image: true,
        images: true,
        weight: true,
        dimensions: true,
        vatRate: true,
        deliveryTime: true,
        manufacturer: true,
        warranty: true,
        shippingCost: true,
        productUrl: true,
        currency: true,
        status: true,
        metadataJson: true,
        createdAt: true,
        source: {
          select: { id: true, name: true },
        },
      },
    });

    if (products.length !== ids.length) {
      return NextResponse.json({ success: false, error: "Bazı ürünler bulunamadı veya yetkisiz" }, { status: 403 });
    }

    const plan = buildDuplicateMergePlan(products, masterId);
    if (mode === "preview") {
      return NextResponse.json({ success: true, data: plan });
    }

    const snapshot = await prisma.thyronixSnapshot.create({
      data: {
        label: `Duplicate merge öncesi - ${masterId.slice(0, 8)}`,
        type: "bulk",
        sourceId: products.find((product) => product.id === masterId)?.sourceId || null,
        productCount: products.length,
        activeCount: products.filter((product) => product.status === "active").length,
        passiveCount: products.filter((product) => product.status !== "active").length,
        errorCount: 0,
        warningCount: plan.duplicateIds.length,
        snapshotData: JSON.stringify(products),
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.thyronixProduct.update({
        where: { id: masterId },
        data: plan.mergedData as never,
      });

      await tx.thyronixProduct.updateMany({
        where: { id: { in: plan.duplicateIds } },
        data: { status: "excluded" },
      });

      await tx.thyronixSyncLog.create({
        data: {
          type: "duplicate_merge",
          referenceId: masterId,
          status: "success",
          message: `${plan.duplicateIds.length} duplicate kayıt birleştirildi, ana kayıt ${masterId}`,
          productCount: products.length,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        snapshotId: snapshot.id,
        masterId,
        excludedCount: plan.duplicateIds.length,
        changedFields: plan.changedFields,
      },
    });
  } catch (error) {
    return thyronixErrorResponse(error);
  }
}
