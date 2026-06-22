import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/db";
import {
  requireThyronixDealerOrAdmin,
  thyronixErrorResponse,
} from "@/lib/thyronix/access";
import {
  BEZOS_BAYI_MAPPING_DOC,
  BEZOS_BAYI_XML,
  buildBezosSourcePayload,
} from "@/lib/thyronix/connectors/bezos-bayi-xml";
import {
  canAccessBezosConnector,
  getBezosAllowedEmails,
} from "@/lib/thyronix/connectors/bezos-bayi-access";
import { getTemplate } from "@/lib/thyronix/templates";
import { parseXmlToProducts } from "@/lib/thyronix/xml-parser";
import { fetchAndParseXmlFeeds, resolveSourceFeedUrls } from "@/lib/thyronix/feed-fetch";

const CONNECTOR_SLUG = "bezos-bayi-xml";

async function resolveTargetDealer() {
  const dealerIdFromEnv = process.env.BEZOS_BAYI_TARGET_DEALER_ID?.trim();
  if (dealerIdFromEnv) {
    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerIdFromEnv },
      select: { id: true, name: true, company: true },
    });
    if (dealer) return dealer;
  }

  const allowedEmails = getBezosAllowedEmails();
  for (const email of allowedEmails) {
    const user = await prisma.user.findFirst({
      where: { email, dealerId: { not: null } },
      select: { dealerId: true },
    });
    if (user?.dealerId) {
      const dealer = await prisma.dealer.findUnique({
        where: { id: user.dealerId },
        select: { id: true, name: true, company: true },
      });
      if (dealer) return dealer;
    }
  }
  return null;
}

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
    if (!canAccessBezosConnector(user)) {
      return NextResponse.json({ success: false, error: "Bu entegrasyon yalnızca yetkili bayi için açıktır" }, { status: 403 });
    }
    const targetDealer = await resolveTargetDealer();
    if (!targetDealer) {
      return NextResponse.json({ success: false, error: "Hedef bayi bulunamadı (BEZOS_BAYI_TARGET_DEALER_ID/EMAILS kontrol edin)" }, { status: 500 });
    }

    const savedSource = await prisma.thyronixSource.findFirst({
      where: {
        dealerId: targetDealer.id,
        tenantScope: "DEALER",
        inputFormat: "bezos",
        OR: [
          { name: { contains: "Bezos" } },
          { xmlUrl: { contains: "bezos.com.tr/xml-bayi" } },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });

    let activeSource = savedSource;
    if (savedSource) {
      const currentFeeds = resolveSourceFeedUrls(savedSource.xmlUrl, savedSource.fixedValues);
      if (currentFeeds.length < BEZOS_BAYI_XML.feedUrls.length) {
        activeSource = await prisma.thyronixSource.update({
          where: { id: savedSource.id },
          data: {
            fixedValues: JSON.stringify(BEZOS_BAYI_XML.fixedValues),
            xmlUrl: BEZOS_BAYI_XML.primaryUrl,
          },
        });
      }
    }

    const template = getTemplate("bezos");
    const templateMapping: Record<string, string> = {};
    if (template) {
      for (const [thyronixField, xmlField] of Object.entries(template.fieldMap)) {
        if (xmlField) templateMapping[xmlField] = thyronixField;
      }
    }

    let savedFieldMapping: Record<string, string> = {};
    try {
      savedFieldMapping = JSON.parse(activeSource?.fieldMapping || "{}");
    } catch {
      savedFieldMapping = {};
    }

    let savedFixedValues: Record<string, unknown> = {};
    try {
      savedFixedValues = JSON.parse(activeSource?.fixedValues || "{}");
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
        savedSource: activeSource
          ? {
              id: activeSource.id,
              name: activeSource.name,
              xmlUrl: activeSource.xmlUrl,
              inputFormat: activeSource.inputFormat,
              status: activeSource.status,
              productCount: activeSource.productCount,
              lastSync: activeSource.lastSync,
              errorLog: activeSource.errorLog,
              fieldMapping: savedFieldMapping,
              fixedValues: savedFixedValues,
              feedUrls: resolveSourceFeedUrls(activeSource.xmlUrl, activeSource.fixedValues),
            }
          : null,
        samplePreview: parseSamplePreview(),
        dealerId: targetDealer.id,
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
    if (!canAccessBezosConnector(user)) {
      return NextResponse.json({ success: false, error: "Bu entegrasyon yalnızca yetkili bayi için açıktır" }, { status: 403 });
    }
    const targetDealer = await resolveTargetDealer();
    if (!targetDealer) {
      return NextResponse.json({ success: false, error: "Hedef bayi bulunamadı (BEZOS_BAYI_TARGET_DEALER_ID/EMAILS kontrol edin)" }, { status: 500 });
    }
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

    const payload = buildBezosSourcePayload(body.dealerLabel || targetDealer.name || user.name || undefined);
    const existing = await prisma.thyronixSource.findFirst({
      where: {
        dealerId: targetDealer.id,
        tenantScope: "DEALER",
        inputFormat: "bezos",
        OR: [
          { name: payload.name },
          { xmlUrl: { contains: "bezos.com.tr/xml-bayi" } },
        ],
      },
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
        dealerId: targetDealer.id,
        tenantScope: "DEALER",
        ownerType: "DEALER",
      },
    });
    return NextResponse.json({ success: true, data: created, created: true }, { status: 201 });
  } catch (e) {
    return thyronixErrorResponse(e, e instanceof Error ? e.message : "Kayıt hatası");
  }
}
