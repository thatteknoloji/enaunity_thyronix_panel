import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireThyronixDealerOrAdmin,
  tenantOwnerFields,
  thyronixErrorResponse,
  withTenantFilter,
} from "@/lib/thyronix/access";
import { resolveSourceFeedUrls } from "@/lib/thyronix/feed-fetch";
import { buildSourceMappingSummary } from "@/lib/thyronix/source-mapping-summary";
import { getThyronixSourceQualitySummaries } from "@/lib/thyronix/source-quality";
import { validateSourceMappingConfig } from "@/lib/thyronix/mapping-validation";
import { getTemplate } from "@/lib/thyronix/templates";

export async function GET() {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const [sources, qualitySummaries] = await Promise.all([
      prisma.thyronixSource.findMany({
        where: withTenantFilter(user, {}),
        orderBy: { createdAt: "desc" },
      }),
      getThyronixSourceQualitySummaries(user),
    ]);
    const data = sources.map((s) => ({
      ...s,
      feedUrls: resolveSourceFeedUrls(s.xmlUrl, s.fixedValues),
      mappingSummary: buildSourceMappingSummary(s),
      qualitySummary: qualitySummaries.get(s.id) || null,
    }));
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return thyronixErrorResponse(e, "Yetkisiz erişim");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const owner = tenantOwnerFields(user);
    const body = await req.json();
    const sourceType = body.type || "xml";
    const inputFormat = body.inputFormat || "custom_xml";
    const template = sourceType === "xml" ? getTemplate(inputFormat) : null;
    const validation = validateSourceMappingConfig({
      sourceType,
      fieldMapping: body.fieldMapping,
      variantMapping: body.variantMapping,
      fixedValues: body.fixedValues,
      templateFieldMap: template?.fieldMap as any,
    });
    if (!validation.ready) {
      return NextResponse.json({ success: false, error: validation.errors.join(" · ") }, { status: 400 });
    }
    const source = await prisma.thyronixSource.create({
      data: {
        name: body.name,
        xmlUrl: body.xmlUrl,
        type: sourceType,
        inputFormat,
        fieldMapping: body.fieldMapping || null,
        variantMapping: body.variantMapping || null,
        fixedValues: body.fixedValues || null,
        interval: body.interval || 720,
        status: body.status || "active",
        dealerId: owner.dealerId,
        tenantScope: owner.tenantScope,
        ownerType: owner.ownerType,
      },
    });
    return NextResponse.json({ success: true, data: source }, { status: 201 });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
