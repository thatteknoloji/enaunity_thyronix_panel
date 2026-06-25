import { NextResponse } from "next/server";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse } from "@/lib/thyronix/access";
import { getTemplate } from "@/lib/thyronix/templates";
import { inspectXmlFeed } from "@/lib/thyronix/xml-parser";

export async function POST(req: Request) {
  try {
    await requireThyronixDealerOrAdmin();
    const { xmlUrl, inputFormat } = await req.json();
    if (!xmlUrl) return NextResponse.json({ success: false, error: "URL gerekli" }, { status: 400 });

    // Fetch XML
    const res = await fetch(xmlUrl, {
      headers: { "User-Agent": "THYRONIX Test/1.0", Accept: "text/xml,application/xml,*/*" },
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return NextResponse.json({ success: false, error: `HTTP ${res.status}` }, { status: 400 });

    const xmlText = await res.text();
    if (!xmlText || xmlText.length < 10) return NextResponse.json({ success: false, error: "Boş yanıt" }, { status: 400 });

    // Get template
    const template = getTemplate(inputFormat || "custom_xml");
    if (!template) {
      return NextResponse.json({ success: false, error: "Geçersiz şablon" }, { status: 400 });
    }
    const inspected = inspectXmlFeed(xmlText, template);

    // Current template mapping - INVERTED: XML field → THYRONIX field
    const currentMapping: Record<string, string> = {};
    if (template) {
      for (const [thyronixField, xmlField] of Object.entries(template.fieldMap)) {
        if (xmlField) currentMapping[xmlField] = thyronixField;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalItems: inspected.totalItems,
        detectedFields: inspected.detectedFields,
        variantFields: inspected.variantFields,
        variantSampleValues: inspected.variantSampleValues,
        sampleValues: inspected.sampleValues,
        currentMapping,
        templateName: template?.name || "Unknown",
      },
    });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
