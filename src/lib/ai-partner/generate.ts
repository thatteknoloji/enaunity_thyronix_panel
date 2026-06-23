import { resolveAiProviderId } from "@/lib/thyronix/ai-provider-resolve";

type GenerateTask =
  | "product_description"
  | "seo_title"
  | "category_suggest"
  | "social_post"
  | "trend_product_idea"
  | "pod_design_brief";

const TASK_PROMPTS: Record<GenerateTask, { system: string; user: (ctx: Record<string, string>) => string }> = {
  product_description: {
    system: "Türkçe e-ticaret ürün açıklaması yaz. Net, satış odaklı, 2-3 paragraf.",
    user: (c) => `Ürün: ${c.productName || "Ürün"}\nKategori: ${c.category || "-"}\nÖzellikler: ${c.features || "-"}`,
  },
  seo_title: {
    system: "Türkçe SEO başlığı ve meta açıklama üret. JSON: { title, metaDescription }",
    user: (c) => `Ürün: ${c.productName || "Ürün"}\nAnahtar kelimeler: ${c.keywords || "-"}`,
  },
  category_suggest: {
    system: "E-ticaret kategori önerisi ver. JSON: { categories: string[] }",
    user: (c) => `Ürün: ${c.productName || "Ürün"}\nAçıklama: ${c.description || "-"}`,
  },
  social_post: {
    system: "Instagram/LinkedIn için kısa Türkçe sosyal medya metni yaz.",
    user: (c) => `Ürün/marka: ${c.productName || "EnaUnity"}\nTon: ${c.tone || "profesyonel"}`,
  },
  trend_product_idea: {
    system: "Trend ürün fikri öner. JSON: { title, rationale, targetAudience }",
    user: (c) => `Niş: ${c.niche || "dekorasyon"}\nPazar: ${c.market || "Türkiye B2B"}`,
  },
  pod_design_brief: {
    system: "POD baskı tasarım briefi yaz. JSON: { concept, colors, placement, tags }",
    user: (c) => `Tema: ${c.theme || "minimal"}\nÜrün: ${c.productType || "t-shirt"}`,
  },
};

const FALLBACK: Record<GenerateTask, (ctx: Record<string, string>) => string> = {
  product_description: (c) =>
    `${c.productName || "Ürün"} — kaliteli malzeme ve hızlı teslimat ile EnaUnity bayi ağında. Detaylı bilgi için katalogu inceleyin.`,
  seo_title: (c) =>
    JSON.stringify({
      title: `${c.productName || "Ürün"} | EnaUnity Bayi`,
      metaDescription: `${c.productName || "Ürün"} toptan fiyatlarla EnaUnity'de.`,
    }),
  category_suggest: () => JSON.stringify({ categories: ["Dekorasyon", "Ev Tekstili", "Hediyelik"] }),
  social_post: (c) => `✨ ${c.productName || "Yeni ürün"} EnaUnity'de! Bayiler için özel fiyatlar — hemen keşfedin. #EnaUnity #B2B`,
  trend_product_idea: () =>
    JSON.stringify({ title: "Cam Tablo Setleri", rationale: "Kişiselleştirilebilir dekor trendi", targetAudience: "Bayi ve perakende" }),
  pod_design_brief: () =>
    JSON.stringify({ concept: "Minimal geometrik", colors: ["#0b0d14", "#22d3ee"], placement: "center", tags: ["minimal", "modern"] }),
};

export async function generateAiPartnerContent(
  task: GenerateTask,
  context: Record<string, string> = {},
  opts?: { dealerId?: string | null }
) {
  const prompt = TASK_PROMPTS[task];
  if (!prompt) {
    return { success: false as const, content: "", source: "error", error: "Geçersiz görev" };
  }

  try {
    const providerId = await resolveAiProviderId({ dealerId: opts?.dealerId });
    if (providerId) {
      const { aiCall } = await import("@/lib/thyronix/ai-service");
      const result = await aiCall({
        providerId,
        systemPrompt: prompt.system,
        userPrompt: prompt.user(context),
        task: `ai_partner_${task}`,
        responseFormat: task === "product_description" || task === "social_post" ? "text" : "json_object",
      });
      if (result.success && result.content) {
        return { success: true as const, content: result.content, source: "ai" as const };
      }
    }
  } catch {
    // fallback below
  }

  return {
    success: true as const,
    content: FALLBACK[task](context),
    source: "fallback" as const,
  };
}

export const AI_PARTNER_TASKS = Object.keys(TASK_PROMPTS) as GenerateTask[];
