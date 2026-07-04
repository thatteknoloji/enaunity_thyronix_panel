import { NextResponse } from "next/server";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse } from "@/lib/thyronix/access";
import { buildSuggestedProductMapping, buildSuggestedVariantMapping } from "@/lib/thyronix/field-aliases";
import { fetchXmlText } from "@/lib/thyronix/feed-fetch";
import { buildVariantMappingReadiness } from "@/lib/thyronix/mapping-validation";
import { getTemplate } from "@/lib/thyronix/templates";
import { inspectXmlFeed } from "@/lib/thyronix/xml-parser";

export async function POST(req: Request) {
  try {
    await requireThyronixDealerOrAdmin();
    const { xmlUrl, inputFormat, variantMapping } = await req.json();
    if (!xmlUrl) return NextResponse.json({ success: false, error: "URL gerekli" }, { status: 400 });

    const xmlText = await fetchXmlText(xmlUrl, 60000);
    if (!xmlText || xmlText.length < 10) return NextResponse.json({ success: false, error: "Boş yanıt" }, { status: 400 });

    // Get template
    const template = getTemplate(inputFormat || "custom_xml");
    if (!template) {
      return NextResponse.json({ success: false, error: "Geçersiz şablon" }, { status: 400 });
    }
    const inspected = inspectXmlFeed(xmlText, template);
    const variantReadiness = buildVariantMappingReadiness(
      inspected.variantFields,
      variantMapping && typeof variantMapping === "object" ? variantMapping : {},
    );

    // Current template mapping - INVERTED: XML field → THYRONIX field
    const currentMapping: Record<string, string> = {};
    if (template) {
      for (const [thyronixField, xmlField] of Object.entries(template.fieldMap)) {
        if (xmlField) currentMapping[xmlField] = thyronixField;
      }
    }
    const suggestedMapping = { ...buildSuggestedProductMapping(inspected.detectedFields), ...currentMapping };
    const suggestedVariantMapping = buildSuggestedVariantMapping(inspected.variantFields);

    return NextResponse.json({
      success: true,
      data: {
        totalItems: inspected.totalItems,
        detectedFields: inspected.detectedFields,
        variantFields: inspected.variantFields,
        variantSampleValues: inspected.variantSampleValues,
        variantReadiness,
        sampleValues: inspected.sampleValues,
        currentMapping: suggestedMapping,
        suggestedMapping,
        suggestedVariantMapping,
        templateName: template?.name || "Unknown",
      },
    });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
