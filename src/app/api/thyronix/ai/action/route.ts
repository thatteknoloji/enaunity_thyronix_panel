import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { aiCall } from "@/lib/thyronix/ai-service";
import { checkAiLicense } from "@/lib/thyronix/ai-license";
import { requireThyronixAdmin } from "@/lib/thyronix/access";

// Safety layer - blocked patterns
const BLOCKED_PATTERNS = [
  /invent (a )?price/i, /fabricate (a )?price/i, /generate (a )?price/i,
  /invent (a )?stock/i, /fabricate stock/i,
  /invent (a )?barcode/i, /generate (a )?barcode/i,
  /invent (a )?specification/i, /fabricate spec/i,
  /invent (a )?certification/i,
  /invent (a )?medical/i, /fabricate medical/i,
  /invent (a )?warranty/i,
];

// Safety check
function safetyCheck(prompt: string): string | null {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(prompt)) return "Güvenlik: AI fiyat, stok, barkod veya teknik özellik icat edemez";
  }

  // Extreme short prompts are suspicious
  if (prompt.length < 10) return "Güvenlik: Prompt çok kısa";

  return null;
}

export async function POST(req: Request) {
  try {
    const licenseError = checkAiLicense();
    if (licenseError) return NextResponse.json({ error: licenseError.error }, { status: licenseError.status });
    await requireThyronixAdmin();

    const body = await req.json();
    const { providerId, task, productId, prompt, responseFormat, temperature, maxTokens } = body;

    // Safety check first
    const safetyError = safetyCheck(prompt);
    if (safetyError) return NextResponse.json({ error: safetyError }, { status: 400 });

    if (!providerId || !task || !prompt) {
      return NextResponse.json({ error: "providerId, task ve prompt zorunlu" }, { status: 400 });
    }

    // AI call
    const result = await aiCall({
      providerId,
      task,
      productId: productId || "",
      systemPrompt: getSystemPrompt(task),
      userPrompt: prompt,
      responseFormat: responseFormat || "text",
      temperature,
      maxTokens,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "AI çağrısı başarısız" });
    }

    return NextResponse.json({
      success: true,
      content: result.content,
      usage: result.usage,
      cost: result.cost,
      duration: result.duration,
      model: result.model,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Sunucu hatası" }, { status: 500 });
  }
}

function getSystemPrompt(task: string): string {
  const prompts: Record<string, string> = {
    title_optimize: "You are a professional e-commerce product title optimizer. Optimize for SEO, GEO, readability, and CTR. Never invent features, specifications, or claims. Preserve model codes and brand names.",
    description_generate: "You are an e-commerce copywriter. Generate SEO-optimized product descriptions. Never invent features, specifications, or benefits. Only use provided information.",
    category_suggest: "You are a product categorization expert. Suggest the most accurate category based on product data. Return valid JSON only.",
    attribute_extract: "You extract structured product attributes from titles and descriptions. Return valid JSON only. Never guess or invent.",
    quality_score: "You analyze product data quality. Score 0-100 based on completeness, accuracy, and market readiness.",
    private_label: "You rewrite product content for a different brand. Maintain factual accuracy. Never invent features.",
    bulk_action: "You perform bulk product optimization. Follow the exact instructions. Never invent data.",
    feed_optimize: "You analyze product feed quality. Identify issues and suggest improvements. Return JSON.",
    rule_assistant: "You convert natural language rules into structured IF/THEN format. Return JSON with field, operator, value, action.",
    mapping_assist: "You suggest field mappings from XML/CSV fields to standard product fields. Return JSON array.",
    feed_consultant: "You are a product data consultant. Analyze feed statistics and give actionable advice in Turkish. Be specific and practical.",
    test_connection: "You are a helpful assistant. Your only job is to confirm the connection works.",
  };
  return prompts[task] || "You are a helpful AI assistant for product data management. Never invent or hallucinate product data.";
}
