import { slugify } from "@/lib/utils";
import { BLOG_ENGINE_VERSION, type BlogContentPayload, type BlogContentSection, type BlogFaqItem } from "@/lib/blog-engine/blog-types";
import {
  buildCategoryContent,
  buildCompetitorStructureContent,
  buildGeoContent,
  buildKeywordContent,
  buildProductContent,
  buildSchemaJson,
  buildSeoDescription,
  buildSeoTitle,
  extractCompetitorStructure,
} from "@/lib/blog-engine/blog-content-builder";
import { BANNED_PHRASES, MIN_WORD_COUNTS, WRITER_VERSION } from "./constants";
import { callAiProvider, getProviderStatus, hashPrompt } from "./ai-provider";
import { recordWriterError, recordWriterSuccess } from "./writer-telemetry";
import type {
  AiGenerateResult,
  AiWriterMetadata,
  BlogArticleInput,
  BlogArticleOutput,
  ContentValidationResult,
  PageContentInput,
  PageContentOutput,
  RecoveryContentInput,
} from "./types";

const SYSTEM_PROMPT = `Sen ENA Unity için Türkçe içerik yazan uzman bir editörsün.
Kurallar:
- Gerçek, bilgilendirici, özgün içerik üret
- Şablon veya boş genel cümleler kullanma
- Yasaklı ifadeler kullanma: "SEO, GEO ve AEO perspektifinden", "içerik tamamen özgün üretilmiştir", "rakip metinlerden kopyalama yapılmaz", "daha fazla bilgi için iletişime geçin"
- Rakip metinleri asla kopyalama; yalnızca yapı ilhamı al
- GEO içeriklerde şehir bazlı özgün senaryolar yaz
- Yanıtı yalnızca geçerli JSON olarak ver`;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractTextBlocks(content: {
  h1?: string;
  intro?: string;
  sections?: Array<{ heading?: string; body?: string; content?: string }>;
  conclusion?: string;
}): string[] {
  const blocks: string[] = [];
  if (content.h1) blocks.push(content.h1);
  if (content.intro) blocks.push(content.intro);
  for (const s of content.sections || []) {
    const body = s.body || s.content || "";
    if (body.trim()) blocks.push(body.trim());
  }
  if (content.conclusion) blocks.push(content.conclusion);
  return blocks;
}

function hasDuplicateParagraphs(blocks: string[]): boolean {
  const normalized = blocks.map((b) => b.toLowerCase().replace(/\s+/g, " ").trim()).filter(Boolean);
  return new Set(normalized).size < normalized.length;
}

function findBannedPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.filter((p) => lower.includes(p));
}

function emptyMetadata(promptHash = "", error: string | null = "AI_PROVIDER_NOT_CONFIGURED"): AiWriterMetadata {
  return {
    writerVersion: WRITER_VERSION,
    provider: null,
    model: null,
    generatedAt: new Date().toISOString(),
    promptHash,
    wordCount: 0,
    aiGenerated: false,
    fallbackUsed: false,
    generationStatus: "FAILED",
    generationError: error,
  };
}

function successMetadata(
  provider: string,
  model: string,
  promptHash: string,
  wordCount: number,
  validationIssues?: string[]
): AiWriterMetadata {
  return {
    writerVersion: WRITER_VERSION,
    provider: provider as AiWriterMetadata["provider"],
    model,
    generatedAt: new Date().toISOString(),
    promptHash,
    wordCount,
    aiGenerated: true,
    fallbackUsed: false,
    generationStatus: "SUCCESS",
    generationError: null,
    validationIssues,
  };
}

function fallbackMetadata(promptHash: string, wordCount: number, error: string): AiWriterMetadata {
  return {
    writerVersion: WRITER_VERSION,
    provider: null,
    model: null,
    generatedAt: new Date().toISOString(),
    promptHash,
    wordCount,
    aiGenerated: false,
    fallbackUsed: true,
    generationStatus: "FAILED",
    generationError: error,
  };
}

function toSection(type: BlogContentSection["type"], heading: string, body: string): BlogContentSection {
  return { id: slugify(heading) || type, type, heading, body };
}

function parseJsonResponse<T>(raw: string): T | null {
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

type LlmArticleShape = {
  title?: string;
  h1?: string;
  intro?: string;
  sections?: Array<{ heading: string; body: string; type?: string }>;
  conclusion?: string;
  faq?: Array<{ question: string; answer: string }>;
  seoTitle?: string;
  seoDescription?: string;
  internalLinks?: Array<{ title: string; href: string; reason: string }>;
};

function mapLlmToBlogPayload(parsed: LlmArticleShape, keyword: string): BlogArticleOutput {
  const h1 = parsed.h1 || parsed.title || `${keyword} Rehberi`;
  const sections: BlogContentSection[] = (parsed.sections || []).map((s, i) =>
    toSection((s.type as BlogContentSection["type"]) || "guide", s.heading || `Bölüm ${i + 1}`, s.body || "")
  );
  const content: BlogContentPayload = {
    version: BLOG_ENGINE_VERSION,
    h1,
    intro: parsed.intro || "",
    sections,
    conclusion: parsed.conclusion || sections[sections.length - 1]?.body || "",
  };
  const faq: BlogFaqItem[] = (parsed.faq || []).filter((f) => f.question && f.answer);
  const seoTitle = parsed.seoTitle || buildSeoTitle(h1, keyword);
  const seoDescription = parsed.seoDescription || buildSeoDescription(content.intro, keyword);
  const schema = generateJsonLd({ title: h1, description: seoDescription, slug: slugify(keyword), faq });
  return {
    title: h1,
    content,
    faq,
    seoTitle,
    seoDescription,
    schema,
    internalLinkSuggestions: parsed.internalLinks || [],
    excerpt: content.intro.slice(0, 200),
  };
}

function buildTemplateBlogFallback(input: BlogArticleInput): BlogArticleOutput {
  let content: BlogContentPayload;
  if (input.sourceType === "PRODUCT" && input.productName) {
    content = buildProductContent(input.productName, input.category || undefined);
  } else if (input.sourceType === "CATEGORY" && input.category) {
    content = buildCategoryContent(input.category);
  } else if (input.sourceType === "GEO" && input.province) {
    content = buildGeoContent(input.keyword, input.province, input.district);
  } else if (input.sourceType === "COMPETITOR_STRUCTURE" && input.competitorStructure) {
    const structure = extractCompetitorStructure(input.competitorStructure);
    content = buildCompetitorStructureContent(input.keyword, structure);
  } else {
    content = buildKeywordContent(input.keyword);
  }
  const seoTitle = buildSeoTitle(content.h1, input.keyword);
  const seoDescription = buildSeoDescription(content.intro, input.keyword);
  const faq: BlogFaqItem[] = [
    { question: `${input.keyword} nedir?`, answer: `${input.keyword} hakkında temel bilgiler bu rehberde yer almaktadır.` },
    { question: `${input.keyword} nasıl seçilir?`, answer: `İhtiyacınıza uygun seçenekleri değerlendirin.` },
    { question: `${input.keyword} fiyatları ne kadar?`, answer: `Fiyatlar ürün ve hizmet kapsamına göre değişir.` },
  ];
  return {
    title: content.h1,
    content,
    faq,
    seoTitle,
    seoDescription,
    schema: generateJsonLd({ title: content.h1, description: seoDescription, slug: slugify(input.keyword), faq }),
    internalLinkSuggestions: [],
    excerpt: content.intro.slice(0, 200),
  };
}

function buildBlogPrompt(input: BlogArticleInput): string {
  const loc = input.province
    ? input.district
      ? `${input.province} / ${input.district}`
      : input.province
    : null;
  return JSON.stringify({
    task: "blog_article",
    keyword: input.keyword,
    sourceType: input.sourceType,
    category: input.category,
    location: loc,
    productName: input.productName,
    competitorStructureHint: input.competitorStructure ? "Yalnızca başlık yapısı ve FAQ mantığından ilham al" : null,
    requirements: {
      minWords: MIN_WORD_COUNTS.BLOG,
      minSections: 5,
      minFaq: 3,
      language: "tr",
      include: ["güçlü giriş", "gerçek fayda", "örnekler", "karşılaştırma", "avantaj/dezavantaj", "uygulanabilir öneriler", "sonuç"],
    },
    outputSchema: {
      title: "string",
      h1: "string",
      intro: "string",
      sections: [{ heading: "string", body: "string", type: "guide|comparison|benefits|purchase|usage|conclusion" }],
      conclusion: "string",
      faq: [{ question: "string", answer: "string" }],
      seoTitle: "string",
      seoDescription: "string",
      internalLinks: [{ title: "string", href: "string", reason: "string" }],
    },
  });
}

export function validateGeneratedContent(opts: {
  contentType: "BLOG" | "PAGE" | "GEO" | "RECOVERY";
  h1?: string;
  intro?: string;
  sections?: Array<{ heading?: string; body?: string; content?: string }>;
  conclusion?: string;
  faq?: BlogFaqItem[];
  seoTitle?: string;
  seoDescription?: string;
  schema?: Record<string, unknown> | null;
  keyword?: string;
}): ContentValidationResult {
  const blocks = extractTextBlocks(opts);
  const fullText = blocks.join("\n");
  const wordCount = countWords(fullText);
  const minWords = MIN_WORD_COUNTS[opts.contentType === "GEO" ? "GEO" : opts.contentType === "PAGE" ? "PAGE" : "BLOG"];
  const sectionCount = (opts.sections || []).filter((s) => (s.body || s.content || "").trim()).length;
  const faqCount = (opts.faq || []).filter((f) => f.question?.trim() && f.answer?.trim()).length;
  const banned = findBannedPhrases(fullText);
  const duplicate = hasDuplicateParagraphs(blocks);

  const hasSchema =
    !!opts.schema &&
    (("@graph" in opts.schema && Array.isArray(opts.schema["@graph"])) ||
      opts.schema["@type"] === "BlogPosting" ||
      opts.schema["@type"] === "FAQPage" ||
      opts.schema["@type"] === "WebPage");

  const issues: string[] = [];
  if (wordCount < minWords) issues.push(`Kelime sayısı yetersiz: ${wordCount} < ${minWords}`);
  if (!opts.h1?.trim()) issues.push("H1 eksik");
  if (sectionCount < 5) issues.push(`Bölüm sayısı yetersiz: ${sectionCount} < 5`);
  if (faqCount < 3) issues.push(`SSS sayısı yetersiz: ${faqCount} < 3`);
  if (!opts.seoTitle?.trim()) issues.push("Meta title eksik");
  if (!opts.seoDescription?.trim()) issues.push("Meta description eksik");
  if (!hasSchema) issues.push("JSON-LD eksik");
  if (duplicate) issues.push("Tekrar eden paragraflar tespit edildi");
  if (banned.length) issues.push(`Yasaklı ifadeler: ${banned.join(", ")}`);
  if (opts.keyword) {
    const kw = opts.keyword.toLocaleLowerCase("tr-TR");
    const hasKw = fullText.toLocaleLowerCase("tr-TR").includes(kw);
    if (!hasKw) issues.push("Anahtar kelime doğal kullanılmamış");
  }

  return {
    passed: issues.length === 0,
    issues,
    wordCount,
    sectionCount,
    faqCount,
    hasH1: !!opts.h1?.trim(),
    hasMetaTitle: !!opts.seoTitle?.trim(),
    hasMetaDescription: !!opts.seoDescription?.trim(),
    hasJsonLd: hasSchema,
    hasDuplicateParagraphs: duplicate,
    hasBannedPhrases: banned.length > 0,
  };
}

export function generateJsonLd(opts: {
  title: string;
  description: string;
  slug: string;
  faq?: BlogFaqItem[];
  type?: "BlogPosting" | "WebPage";
}): Record<string, unknown> {
  return buildSchemaJson({
    title: opts.title,
    description: opts.description,
    slug: opts.slug,
    faq: opts.faq || [],
  });
}

export function generateSeoMeta(title: string, intro: string, keyword: string) {
  return {
    seoTitle: buildSeoTitle(title, keyword),
    seoDescription: buildSeoDescription(intro, keyword),
  };
}

export async function generateFaqBlock(topic: string, count = 5): Promise<AiGenerateResult<BlogFaqItem[]>> {
  const prompt = JSON.stringify({ task: "faq_block", topic, count, language: "tr" });
  const promptHash = hashPrompt(prompt);
  const result = await callAiProvider(SYSTEM_PROMPT, prompt);
  if (!result.success) {
    recordWriterError(result.error || "AI_PROVIDER_NOT_CONFIGURED");
    return { success: false, error: result.error, metadata: emptyMetadata(promptHash, result.error) };
  }
  const parsed = parseJsonResponse<{ faq?: BlogFaqItem[] }>(result.content);
  const faq = parsed?.faq?.filter((f) => f.question && f.answer) || [];
  const wordCount = countWords(faq.map((f) => `${f.question} ${f.answer}`).join(" "));
  recordWriterSuccess(result.provider, result.model, wordCount);
  return {
    success: faq.length >= 3,
    data: faq,
    metadata: successMetadata(result.provider, result.model, promptHash, wordCount),
  };
}

export async function generateBlogArticle(input: BlogArticleInput): Promise<AiGenerateResult<BlogArticleOutput>> {
  const prompt = buildBlogPrompt(input);
  const promptHash = hashPrompt(prompt);
  const providerStatus = getProviderStatus();

  if (!providerStatus.ready) {
    if (input.debugTemplateFallback) {
      const fallback = buildTemplateBlogFallback(input);
      const wordCount = countWords(
        [fallback.content.h1, fallback.content.intro, ...fallback.content.sections.map((s) => s.body)].join(" ")
      );
      recordWriterError("AI_PROVIDER_NOT_CONFIGURED");
      return {
        success: false,
        error: "AI_PROVIDER_NOT_CONFIGURED",
        data: fallback,
        metadata: fallbackMetadata(promptHash, wordCount, "AI_PROVIDER_NOT_CONFIGURED"),
      };
    }
    recordWriterError("AI_PROVIDER_NOT_CONFIGURED");
    return { success: false, error: "AI_PROVIDER_NOT_CONFIGURED", metadata: emptyMetadata(promptHash) };
  }

  const result = await callAiProvider(SYSTEM_PROMPT, prompt);
  if (!result.success) {
    recordWriterError(result.error || "AI_GENERATION_FAILED");
    if (input.debugTemplateFallback) {
      const fallback = buildTemplateBlogFallback(input);
      const wordCount = countWords(
        [fallback.content.h1, fallback.content.intro, ...fallback.content.sections.map((s) => s.body)].join(" ")
      );
      return {
        success: false,
        error: result.error,
        data: fallback,
        metadata: fallbackMetadata(promptHash, wordCount, result.error || "AI_GENERATION_FAILED"),
      };
    }
    return {
      success: false,
      error: result.error,
      metadata: emptyMetadata(promptHash, result.error || "AI_GENERATION_FAILED"),
    };
  }

  const parsed = parseJsonResponse<LlmArticleShape>(result.content);
  if (!parsed) {
    recordWriterError("AI_RESPONSE_PARSE_FAILED");
    return {
      success: false,
      error: "AI_RESPONSE_PARSE_FAILED",
      metadata: emptyMetadata(promptHash, "AI_RESPONSE_PARSE_FAILED"),
    };
  }

  const output = mapLlmToBlogPayload(parsed, input.keyword);
  const validation = validateGeneratedContent({
    contentType: input.sourceType === "GEO" ? "GEO" : "BLOG",
    h1: output.content.h1,
    intro: output.content.intro,
    sections: output.content.sections,
    conclusion: output.content.conclusion,
    faq: output.faq,
    seoTitle: output.seoTitle,
    seoDescription: output.seoDescription,
    schema: output.schema,
    keyword: input.keyword,
  });

  const metadata = successMetadata(
    result.provider,
    result.model,
    promptHash,
    validation.wordCount,
    validation.passed ? undefined : validation.issues
  );
  recordWriterSuccess(result.provider, result.model, validation.wordCount);

  return {
    success: validation.passed,
    error: validation.passed ? undefined : validation.issues.join("; "),
    data: output,
    metadata,
  };
}

export async function generatePageContent(input: PageContentInput): Promise<AiGenerateResult<PageContentOutput>> {
  const prompt = JSON.stringify({
    task: "page_content",
    pageType: input.pageType,
    blueprintKind: input.blueprintKind,
    title: input.title,
    targetQuery: input.targetQuery,
    productName: input.productName,
    category: input.category,
    province: input.province,
    features: input.features,
    aeoBlocks: input.aeoBlocks,
    minWords: MIN_WORD_COUNTS.PAGE,
    language: "tr",
    style: "satış odaklı, net CTA, ürün/kategori/şehir odaklı",
    outputSchema: {
      h1: "string",
      intro: "string",
      sections: [{ heading: "string", body: "string" }],
      faq: [{ question: "string", answer: "string" }],
      seoTitle: "string",
      seoDescription: "string",
      cta: "string",
      internalLinks: [{ title: "string", href: "string", reason: "string" }],
    },
  });
  const promptHash = hashPrompt(prompt);

  if (!getProviderStatus().ready) {
    recordWriterError("AI_PROVIDER_NOT_CONFIGURED");
    return { success: false, error: "AI_PROVIDER_NOT_CONFIGURED", metadata: emptyMetadata(promptHash) };
  }

  const result = await callAiProvider(SYSTEM_PROMPT, prompt);
  if (!result.success) {
    recordWriterError(result.error || "AI_GENERATION_FAILED");
    return { success: false, error: result.error, metadata: emptyMetadata(promptHash, result.error) };
  }

  const parsed = parseJsonResponse<PageContentOutput>(result.content);
  if (!parsed) {
    return { success: false, error: "AI_RESPONSE_PARSE_FAILED", metadata: emptyMetadata(promptHash, "AI_RESPONSE_PARSE_FAILED") };
  }

  const schema = generateJsonLd({
    title: parsed.h1,
    description: parsed.seoDescription,
    slug: slugify(input.targetQuery),
    faq: parsed.faq,
    type: "WebPage",
  });

  const validation = validateGeneratedContent({
    contentType: "PAGE",
    h1: parsed.h1,
    intro: parsed.intro,
    sections: parsed.sections,
    faq: parsed.faq,
    seoTitle: parsed.seoTitle,
    seoDescription: parsed.seoDescription,
    schema,
    keyword: input.targetQuery,
  });

  const output: PageContentOutput = { ...parsed, schema, internalLinkSuggestions: parsed.internalLinkSuggestions || [] };
  const metadata = successMetadata(result.provider, result.model, promptHash, validation.wordCount, validation.issues);
  recordWriterSuccess(result.provider, result.model, validation.wordCount);

  return {
    success: validation.passed,
    error: validation.passed ? undefined : validation.issues.join("; "),
    data: output,
    metadata,
  };
}

export async function generateRecoveryContent(input: RecoveryContentInput): Promise<AiGenerateResult<BlogArticleOutput | PageContentOutput>> {
  if (input.contentType === "BLOG") {
    return generateBlogArticle({
      keyword: input.estimatedTitle,
      sourceType: "KEYWORD",
      category: input.category,
      debugTemplateFallback: input.debugTemplateFallback,
    });
  }

  const pageResult = await generatePageContent({
    pageType: "LANDING",
    blueprintKind: "GUIDE",
    title: input.estimatedTitle,
    targetQuery: input.estimatedTitle,
    category: input.category,
    debugTemplateFallback: input.debugTemplateFallback,
  });

  if (!pageResult.success || !pageResult.data) {
    return pageResult as AiGenerateResult<BlogArticleOutput | PageContentOutput>;
  }

  return pageResult as AiGenerateResult<PageContentOutput>;
}

export async function rewriteThinContent(opts: {
  title: string;
  content: string;
  keyword: string;
  contentType: "BLOG" | "PAGE";
}): Promise<AiGenerateResult<BlogArticleOutput>> {
  const { generateSmartBlogContent } = await import("@/lib/ai-brain/ai-brain-service");
  const v2 = await generateSmartBlogContent({
    keyword: opts.keyword,
    sourceType: "KEYWORD",
    competitorStructure: opts.content.slice(0, 6000),
  });
  const metadata: AiWriterMetadata = {
    writerVersion: WRITER_VERSION,
    provider: (v2.metadata.provider as AiWriterMetadata["provider"]) || null,
    model: v2.metadata.model,
    generatedAt: new Date().toISOString(),
    promptHash: "ai-brain-v2-rewrite",
    wordCount: v2.metadata.wordCount,
    aiGenerated: v2.metadata.aiGenerated,
    fallbackUsed: v2.metadata.fallbackUsed,
    generationStatus: v2.success ? "SUCCESS" : "FAILED",
    generationError: v2.error || null,
    validationIssues: v2.metadata.qualityIssues,
    thinContent: true,
    finalQualityScore: v2.metadata.finalQualityScore,
  };
  return { success: v2.success, error: v2.error, data: v2.data, metadata };
}

export function isAiWriterPublishable(metadata: AiWriterMetadata | null | undefined): boolean {
  if (!metadata) return false;
  return (
    metadata.aiGenerated === true &&
    metadata.fallbackUsed !== true &&
    metadata.generationStatus === "SUCCESS"
  );
}

export { getProviderStatus } from "./ai-provider";
export { getWriterTelemetry } from "./writer-telemetry";
