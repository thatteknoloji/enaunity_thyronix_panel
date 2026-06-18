import { NextResponse } from "next/server";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse } from "@/lib/thyronix/access";
import { XMLParser } from "fast-xml-parser";
import { getTemplate } from "@/lib/thyronix/templates";

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

    // Parse
    const parser = new XMLParser({ ignoreAttributes: false, textNodeName: "#text", parseTagValue: false, trimValues: true });
    const parsed = parser.parse(xmlText);

    // Get template
    const template = getTemplate(inputFormat || "custom_xml");
    
    // Find items
    let items: any[] = [];
    if (template) {
      const root = (parsed as any)[template.rootElement];
      if (root) {
        const found = root[template.itemElement];
        if (found) items = Array.isArray(found) ? found : [found];
      }
    }
    
    // Fallback
    if (!items.length) {
      for (const val of Object.values(parsed as object)) {
        if (typeof val === "object" && val) {
          const subVals = Object.values(val);
          for (const sv of subVals) {
            if (Array.isArray(sv) && sv.length > 0 && typeof sv[0] === "object") { items = sv; break; }
          }
          if (items.length) break;
        }
      }
    }

    // Extract detected fields from first 3 items
    const allFields = new Set<string>();
    const samples: Record<string, string> = {};
    for (let i = 0; i < Math.min(3, items.length); i++) {
      const item = items[i];
      for (const key of Object.keys(item)) {
        if (key.startsWith("@") || key === "#text") continue;
        allFields.add(key);
        if (!samples[key]) {
          const val = item[key];
            const str = typeof val === "object" && val?.["#text"] ? val["#text"]
              : (typeof val === "object" && val !== null)
                ? (Array.isArray(val) ? `[${val.length} items]` : `{${Object.keys(val).filter(k=>!k.startsWith("@")).length} alt alan}`)
                : String(val || "");
          samples[key] = str.substring(0, 60);
        }
      }
    }

    // Current template mapping - INVERTED: XML field → THYRONIX field
    const currentMapping: Record<string, string> = {};
    if (template) {
      for (const [thyronixField, xmlField] of Object.entries(template.fieldMap)) {
        if (xmlField) currentMapping[xmlField] = thyronixField;
      }
    }

    // Extract variant sub-fields — auto-detect variant containers even without template
    const variantFields = new Set<string>();
    const variantSamples: Record<string, string> = {};
    
    const VARIANT_TAGS = ["variants","variant","Varyantlar","varyant","Variants","Variant","VARIANTS","variaciones","variations"];
    const variantItemTags = ["variant","Variant","item","varyant","Varyant","variation","Variation"];
    
    for (let i = 0; i < Math.min(3, items.length); i++) {
      const item = items[i];
      // Auto-detect variant container by tag name
      const vKey = Object.keys(item).find(k => VARIANT_TAGS.includes(k));
      if (!vKey) continue;
      
      const variantContainer = item[vKey];
      if (!variantContainer || typeof variantContainer !== "object") continue;
      
      // Find variant items inside the container
      const itemKey = Object.keys(variantContainer).find(k => variantItemTags.includes(k) || Array.isArray(variantContainer[k]));
      const variantItems = itemKey && Array.isArray(variantContainer[itemKey || ""])
        ? variantContainer[itemKey || ""]
        : (Array.isArray(variantContainer) ? variantContainer : [variantContainer]).filter(Boolean);
      
      for (const vi of variantItems) {
        if (!vi || typeof vi !== "object") continue;
        for (const key of Object.keys(vi)) {
          if (key.startsWith("@") || key === "#text") continue;
          variantFields.add(key);
          if (!variantSamples[key]) {
            const val = vi[key];
            const str = typeof val === "object" && val?.["#text"] ? val["#text"]
              : (typeof val === "object" && val !== null)
                ? (Array.isArray(val) ? `[${val.length} items]` : `{${Object.keys(val).filter(k=>!k.startsWith("@")).length} alt alan}`)
                : String(val || "");
            variantSamples[key] = str.substring(0, 60);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalItems: items.length,
        detectedFields: [...allFields],
        variantFields: [...variantFields],
        variantSampleValues: variantSamples,
        sampleValues: samples,
        currentMapping,
        templateName: template?.name || "Unknown",
      },
    });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
