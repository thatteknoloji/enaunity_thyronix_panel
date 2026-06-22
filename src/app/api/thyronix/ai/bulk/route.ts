import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { aiCall } from "@/lib/thyronix/ai-service";
import { checkAiLicense } from "@/lib/thyronix/ai-license";
import { requireThyronixDealerOrAdmin } from "@/lib/thyronix/access";
import { resolveDealerId } from "@/lib/thyronix/workspace";
import { resolveAiProviderId } from "@/lib/thyronix/ai-provider-resolve";

export async function POST(req: Request) {
  try {
    const licenseError = checkAiLicense();
    if (licenseError) return NextResponse.json({ error: licenseError.error }, { status: licenseError.status });
    const user = await requireThyronixDealerOrAdmin();

    const body = await req.json();
    const { jobId, taskType, productIds, providerId, batchSize = 10 } = body;

    if (!jobId || !taskType || !productIds?.length) {
      return NextResponse.json({ error: "jobId, taskType ve productIds zorunlu" }, { status: 400 });
    }

    const dealerId = await resolveDealerId(user);
    const resolvedProviderId = await resolveAiProviderId({ providerId, dealerId });
    if (!resolvedProviderId) {
      return NextResponse.json({
        error: "AI sağlayıcı tanımlı değil — Ayarlar → Yapay Zeka API veya /thyronix/ai → Sağlayıcılar",
      }, { status: 400 });
    }

    const job = await prisma.thyronixAiJob.findUnique({ where: { id: jobId } });
    if (!job) return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 });
    if (job.status !== "running") return NextResponse.json({ error: "Görev çalışmıyor" }, { status: 400 });

    const products = await prisma.thyronixProduct.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, description: true, brand: true, category: true, barcode: true, price: true, stock: true, variantData: true },
    });

    const results = [];
    let successCount = 0;
    let failedCount = 0;
    let totalTokens = 0;
    let totalCost = 0;

    for (const product of products) {
      try {
        const prompt = buildPrompt(taskType, product);
        const result = await aiCall({
          providerId: resolvedProviderId,
          task: taskType,
          productId: product.id,
          systemPrompt: getSystemPrompt(taskType),
          userPrompt: prompt,
          responseFormat: taskType === "category_suggest" || taskType === "attribute_extract" ? "json_object" : "text",
        });

        if (result.success) {
          await prisma.thyronixAiSuggestion.create({
            data: {
              productId: product.id,
              taskType,
              originalValue: getOriginalValue(taskType, product),
              suggestedValue: result.content,
              providerId: resolvedProviderId,
              model: result.model,
              tokenUsage: result.usage.totalTokens,
              cost: result.cost,
            },
          });
          successCount++;
          totalTokens += result.usage.totalTokens;
          totalCost += result.cost;
          results.push({ productId: product.id, status: "success", content: result.content });
        } else {
          failedCount++;
          results.push({ productId: product.id, status: "failed", error: result.error });
        }
      } catch (e: any) {
        failedCount++;
        results.push({ productId: product.id, status: "error", error: e.message });
      }
    }

    await prisma.thyronixAiJob.update({
      where: { id: jobId },
      data: {
        processedCount: { increment: products.length },
        successCount: { increment: successCount },
        failedCount: { increment: failedCount },
        actualTokens: { increment: totalTokens },
        actualCost: { increment: totalCost },
        status: job.processedCount + products.length >= job.totalProducts ? "completed" : "running",
        completedAt: job.processedCount + products.length >= job.totalProducts ? new Date() : undefined,
      },
    });

    return NextResponse.json({ success: true, data: { results, stats: { successCount, failedCount, totalTokens, totalCost } } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Sunucu hatası" }, { status: 500 });
  }
}

function getSystemPrompt(taskType: string): string {
  const prompts: Record<string, string> = {
    title_optimize: "You are a professional e-commerce product title optimizer. Optimize for SEO, GEO, readability, and CTR. Never invent features, specifications, or claims. Preserve model codes and brand names. Return ONLY the optimized title.",
    description_generate: "You are an e-commerce copywriter. Generate SEO-optimized product descriptions. Never invent features, specifications, or benefits. Only use provided information. Return ONLY the description.",
    category_suggest: "You are a product categorization expert. Suggest the most accurate category based on product data. Return JSON: {\"category\":\"...\",\"subcategory\":\"...\",\"confidence\":0.8}",
    attribute_extract: "You extract structured product attributes from titles and descriptions. Return JSON: {\"color\":\"\",\"size\":\"\",\"material\":\"\",\"gender\":\"\",\"usageType\":\"\",\"specs\":[]}",
    quality_improve: "You analyze product data quality and suggest improvements. Return JSON: {\"score\":75,\"issues\":[\"...\"],\"suggestions\":[\"...\"]}",
  };
  return prompts[taskType] || "You are a helpful AI assistant for product data management.";
}

function buildPrompt(taskType: string, product: any): string {
  switch (taskType) {
    case "title_optimize":
      return `Optimize this product title:
Title: ${product.name}
Brand: ${product.brand || ""}
Category: ${product.category || ""}
${product.variantData ? "Attributes: " + product.variantData.substring(0, 500) : ""}
Rules: Do not invent features. Preserve model codes.`;

    case "description_generate":
      return `Generate description for:
Title: ${product.name}
Brand: ${product.brand || ""}
Category: ${product.category || ""}
${product.description ? "Existing: " + product.description.substring(0, 300) : ""}`;

    case "category_suggest":
      return `Suggest category for:
Title: ${product.name}
Brand: ${product.brand || ""}
Current: ${product.category || ""}
${product.description ? "Desc: " + product.description.substring(0, 300) : ""}`;

    case "attribute_extract":
      return `Extract attributes from:
Title: ${product.name}
${product.description ? "Desc: " + product.description.substring(0, 500) : ""}`;

    case "quality_improve":
      return `Analyze quality for:
Title: ${product.name}
Brand: ${product.brand || ""}
Category: ${product.category || ""}
Price: ${product.price}
Stock: ${product.stock}
${product.description ? "Desc: " + product.description.substring(0, 300) : ""}`;

    default:
      return "";
  }
}

function getOriginalValue(taskType: string, product: any): string {
  switch (taskType) {
    case "title_optimize": return product.name || "";
    case "description_generate": return product.description || "";
    case "category_suggest": return product.category || "";
    case "attribute_extract": return product.variantData || "";
    default: return "";
  }
}
