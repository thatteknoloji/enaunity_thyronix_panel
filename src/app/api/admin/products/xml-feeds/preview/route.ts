import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { previewXmlFeedSync } from "@/lib/products/xml-feed/sync-runner";
import { suggestCategoryMapping } from "@/lib/products/xml-feed/category-mapper";
import { DEFAULT_XML_FEED_RULES } from "@/lib/products/xml-feed/types";
import { DEFAULT_FIELD_MAPPINGS, DEFAULT_VARIANT_MAPPINGS } from "@/lib/products/xml-feed/templates";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const feedUrl = String(body.feedUrl || "").trim();
    const rootCategory = String(body.rootCategory || "").trim();
    const templateId = String(body.templateId || "leyna_v2").trim();

    if (!feedUrl || !rootCategory) {
      return NextResponse.json(
        { success: false, error: "Feed URL ve kök kategori zorunlu" },
        { status: 400 },
      );
    }

    const mappingJson = JSON.stringify(
      body.mappingJson ?? DEFAULT_FIELD_MAPPINGS[templateId as keyof typeof DEFAULT_FIELD_MAPPINGS] ?? {},
    );
    const variantMappingJson = JSON.stringify(
      body.variantMappingJson ?? DEFAULT_VARIANT_MAPPINGS[templateId as keyof typeof DEFAULT_VARIANT_MAPPINGS] ?? {},
    );
    const categoryMappingJson = body.categoryMappingJson
      ? JSON.stringify(body.categoryMappingJson)
      : "{}";
    const rulesJson = JSON.stringify(body.rulesJson ?? DEFAULT_XML_FEED_RULES);

    const preview = await previewXmlFeedSync({
      feedUrl,
      templateId,
      mappingJson,
      variantMappingJson,
      categoryMappingJson,
      rootCategory,
      rulesJson,
    });

    const storeCategories = await prisma.category.findMany({
      where: { active: true },
      select: { name: true },
      orderBy: { name: "asc" },
    });
    const suggestedMapping = suggestCategoryMapping(preview.categoryValues, storeCategories);

    return NextResponse.json({
      success: true,
      data: {
        ...preview,
        suggestedCategoryMapping: suggestedMapping,
        storeCategories: storeCategories.map((c) => c.name),
        variantMapping: DEFAULT_VARIANT_MAPPINGS[templateId as keyof typeof DEFAULT_VARIANT_MAPPINGS] ?? {},
        appliedRules: preview.appliedRules,
        appliedMapping: preview.appliedMapping,
        appliedVariantMapping: preview.appliedVariantMapping,
        parseErrors: preview.parseErrors,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Önizleme hatası" },
      { status: 500 },
    );
  }
}
