import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_XML_FEED_RULES } from "@/lib/products/xml-feed/types";
import { DEFAULT_FIELD_MAPPINGS, DEFAULT_VARIANT_MAPPINGS } from "@/lib/products/xml-feed/templates";

export async function GET() {
  try {
    await requireAdmin();
    const feeds = await prisma.productXmlFeed.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { productLinks: true, syncLogs: true } },
      },
    });
    return NextResponse.json({
      success: true,
      data: feeds.map((f) => ({
        id: f.id,
        name: f.name,
        feedUrl: f.feedUrl,
        rootCategory: f.rootCategory,
        status: f.status,
        templateId: f.templateId,
        syncIntervalHours: f.syncIntervalHours,
        lastSyncAt: f.lastSyncAt,
        nextSyncAt: f.nextSyncAt,
        lastSyncStatus: f.lastSyncStatus,
        productCount: f.productCount,
        linkCount: f._count.productLinks,
        syncLogCount: f._count.syncLogs,
        createdAt: f.createdAt,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Liste hatası" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const name = String(body.name || "").trim();
    const feedUrl = String(body.feedUrl || "").trim();
    const rootCategory = String(body.rootCategory || "").trim();
    const templateId = String(body.templateId || "leyna_v2").trim();

    if (!name || !feedUrl || !rootCategory) {
      return NextResponse.json(
        { success: false, error: "Ad, feed URL ve kök kategori zorunlu" },
        { status: 400 },
      );
    }

    const mappingJson = body.mappingJson ?? DEFAULT_FIELD_MAPPINGS[templateId as keyof typeof DEFAULT_FIELD_MAPPINGS] ?? {};
    const variantMappingJson =
      body.variantMappingJson ?? DEFAULT_VARIANT_MAPPINGS[templateId as keyof typeof DEFAULT_VARIANT_MAPPINGS] ?? {};
    const categoryMappingJson = body.categoryMappingJson ?? {};
    const rulesJson = body.rulesJson ?? DEFAULT_XML_FEED_RULES;
    const syncIntervalHours = Number(body.syncIntervalHours) > 0 ? Number(body.syncIntervalHours) : 12;

    const feed = await prisma.productXmlFeed.create({
      data: {
        name,
        feedUrl,
        rootCategory,
        templateId,
        mappingJson: JSON.stringify(mappingJson),
        variantMappingJson: JSON.stringify(variantMappingJson),
        categoryMappingJson: JSON.stringify(categoryMappingJson),
        rulesJson: JSON.stringify(rulesJson),
        syncIntervalHours,
        nextSyncAt: new Date(),
        createdBy: admin?.email || admin?.id || "",
      },
    });

    return NextResponse.json({ success: true, data: feed });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Oluşturma hatası" },
      { status: 500 },
    );
  }
}
