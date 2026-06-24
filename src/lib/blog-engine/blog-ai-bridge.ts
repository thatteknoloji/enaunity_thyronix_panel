import { generateBlogArticle } from "@/lib/ai-writer/ai-content-writer";
import type { AiWriterMetadata } from "@/lib/ai-writer/types";
import { BLOG_ENGINE_VERSION, type BlogContentPayload, type BlogFaqItem, type BlogSourceType } from "./blog-types";

export type AiBlogResolved = {
  content: BlogContentPayload;
  faq: BlogFaqItem[];
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  schema?: Record<string, unknown>;
  aiMetadata: AiWriterMetadata;
  aiSuccess: boolean;
};

export async function resolveAiBlogContent(opts: {
  keyword: string;
  sourceType: BlogSourceType;
  category?: string | null;
  province?: string | null;
  district?: string | null;
  productName?: string | null;
  competitorStructure?: string | null;
  competitorUrl?: string | null;
  debugTemplateFallback?: boolean;
}): Promise<AiBlogResolved> {
  const aiResult = await generateBlogArticle({
    keyword: opts.keyword,
    sourceType: opts.sourceType,
    category: opts.category,
    province: opts.province,
    district: opts.district,
    productName: opts.productName,
    competitorStructure: opts.competitorStructure,
    competitorUrl: opts.competitorUrl,
    debugTemplateFallback: opts.debugTemplateFallback,
  });

  if (aiResult.data) {
    return {
      content: aiResult.data.content,
      faq: aiResult.data.faq,
      title: aiResult.data.title,
      seoTitle: aiResult.data.seoTitle,
      seoDescription: aiResult.data.seoDescription,
      schema: aiResult.data.schema,
      aiMetadata: aiResult.metadata,
      aiSuccess: aiResult.success,
    };
  }

  const placeholder: BlogContentPayload = {
    version: BLOG_ENGINE_VERSION,
    h1: opts.keyword,
    intro: `Bu içerik AI sağlayıcısı yapılandırılmadığı için üretilemedi. Hata: ${aiResult.error || "AI_PROVIDER_NOT_CONFIGURED"}`,
    sections: [],
    conclusion: "",
  };

  return {
    content: placeholder,
    faq: [],
    title: opts.keyword,
    aiMetadata: aiResult.metadata,
    aiSuccess: false,
  };
}
