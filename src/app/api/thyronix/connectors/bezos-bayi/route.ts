import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/db";
import {
  requireThyronixDealerOrAdmin,
  tenantOwnerFields,
  thyronixErrorResponse,
  withTenantFilter,
} from "@/lib/thyronix/access";
import {
  BEZOS_BAYI_MAPPING_DOC,
  BEZOS_BAYI_XML,
  buildBezosSourcePayload,
} from "@/lib/thyronix/connectors/bezos-bayi-xml";
import { getTemplate } from "@/lib/thyronix/templates";
import { parseXmlToProducts } from "@/lib/thyronix/xml-parser";
import { fetchAndParseXmlFeeds, resolveSourceFeedUrls } from "@/lib/thyronix/feed-fetch";

const CONNECTOR_SLUG = "bezos-bayi-xml";

function loadSampleXml() {
  const path = join(process.cwd(), "scripts/data/bezos-bayi-sample.xml");
  return readFileSync(path, "utf-8");
}

function parseSamplePreview() {
  const template = getTemplate("bezos");
  if (!template) return [];
  const products = parseXmlToProducts(loadSampleXml(), template);
  return products.map((p) => ({
    externalId: (p as { externalId?: string }).externalId || p.barcode || p.stockCode,
    name: p.name,
    brand: p.brand,
    category: p.category,
    subcategory: (p as { subcategory?: string }).subcategory,
    barcode: p.barcode,
    stockCode: p.stockCode,
    price: p.price,
    costPrice: p.costPrice,
    stock: p.stock,
    currency: p.currency,
    image: p.image,
    images: p.images,
    status: p.status,
  }));
}

export async function GET() {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const owner = tenantOwnerFields(user);

    const savedSource = await prisma.thyronixSource.findFirst({
      where: withTenantFilter(user, {
        inputFormat: "bezos",
        OR: [
          { name: { contains: "Bezos" } },
          { xmlUrl: { contains: "bezos.com.tr/xml-bayi" } },
        ],
      }),
      orderBy: { updatedAt: "desc" },
    });

    const template = getTemplate("bezos");
    const templateMapping: Record<string, string> = {};
    if (template) {
      for (const [thyronixField, xmlField] of Object.entries(template.fieldMap)) {
        if (xmlField) templateMapping[xmlField] = thyronixField;
      }
    }

    let savedFieldMapping: Record<string, string> = {};
    try {
      savedFieldMapping = JSON.parse(savedSource?.fieldMapping || "{}");
    } catch {
      savedFieldMapping = {};
    }

    let savedFixedValues: Record<string, unknown> = {};
    try {
      savedFixedValues = JSON.parse(savedSource?.fixedValues || "{}");
    } catch {
      savedFixedValues = {};
    }

    return NextResponse.json({
      success: true,
      data: {
        connector: {
          slug: CONNECTOR_SLUG,
          ...BEZOS_BAYI_XML,
          mappingDoc: BEZOS_BAYI_MAPPING_DOC,
          templateMapping,
        },
        savedSource: savedSource
          ? {
              id: savedSource.id,
              name: savedSource.name,
              xmlUrl: savedSource.xmlUrl,
              inputFormat: savedSource.inputFormat,
              status: savedSource.status,
              productCount: savedSource.productCount,
              lastSync: savedSource.lastSync,
              errorLog: savedSource.errorLog,
              fieldMapping: savedFieldMapping,
              fixedValues: savedFixedValues,
              feedUrls: resolveSourceFeedUrls(savedSource.xmlUrl, savedSource.fixedValues),
            }
          : null,
        samplePreview: parseSamplePreview(),
        dealerId: owner.dealerId,
      },
    });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}

/** Bezos BAYİ XML kaynağını oluştur veya güncelle */
export async function POST(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const owner = tenantOwnerFields(user);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "save";

    if (action === "test-live") {
      const urls: string[] = body.feedUrls || BEZOS_BAYI_XML.feedUrls;
      const template = getTemplate("bezos");
      if (!template) return NextResponse.json({ success: false, error: "Bezos şablonu bulunamadı" }, { status: 500 });
      const { products, feedStats } = await fetchAndParseXmlFeeds(urls, template, BEZOS_BAYI_XML.fieldMapping);
      return NextResponse.json({
        success: true,
        data: {
          total: products.length,
          feeds: feedStats,
          preview: products.slice(0, 5).map((p) => ({
            name: p.name,
            barcode: p.barcode,
            stockCode: p.stockCode,
            price: p.price,
            stock: p.stock,
          })),
        },
      });
    }

    const payload = buildBezosSourcePayload(body.dealerLabel || user.name || undefined);
    const existing = await prisma.thyronixSource.findFirst({
      where: withTenantFilter(user, {
        OR: [
          { name: payload.name },
          { xmlUrl: { contains: "bezos.com.tr/xml-bayi" } },
        ],
      }),
    });

    if (existing) {
      const updated = await prisma.thyronixSource.update({
        where: { id: existing.id },
        data: {
          name: payload.name,
          xmlUrl: payload.xmlUrl,
          type: payload.type,
          inputFormat: payload.inputFormat,
          fieldMapping: payload.fieldMapping,
          fixedValues: payload.fixedValues,
          interval: payload.interval,
          status: "active",
          errorLog: null,
        },
      });
      return NextResponse.json({ success: true, data: updated, created: false });
    }

    const created = await prisma.thyronixSource.create({
      data: {
        ...payload,
        dealerId: owner.dealerId,
        tenantScope: owner.tenantScope,
        ownerType: owner.ownerType,
      },
    });
    return NextResponse.json({ success: true, data: created, created: true }, { status: 201 });
  } catch (e) {
    return thyronixErrorResponse(e, e instanceof Error ? e.message : "Kayıt hatası");
  }
}
