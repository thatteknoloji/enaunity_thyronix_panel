/**
 * ENA_AKILLI_ICERIK_YAZARI_V1 tests
 * Run: npx tsx scripts/test-ai-content-writer.ts
 */
import { generateBlogArticle, validateGeneratedContent, isAiWriterPublishable } from "../src/lib/ai-writer/ai-content-writer";
import { getProviderStatus } from "../src/lib/ai-writer/ai-provider";
import { isPublishableAiContent } from "../src/lib/ai-writer/publish-gate";
import type { AiProviderName } from "../src/lib/ai-writer/types";
import { buildKeywordContent } from "../src/lib/blog-engine/blog-content-builder";
import { BANNED_PHRASES, WRITER_VERSION } from "../src/lib/ai-writer/constants";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

async function main() {
  console.log("\n=== ENA_AKILLI_ICERIK_YAZARI_V1 ===\n");

  // 1. Provider yoksa AI_PROVIDER_NOT_CONFIGURED
  const savedOpenAi = process.env.OPENAI_API_KEY;
  const savedGemini = process.env.GEMINI_API_KEY;
  const savedAnthropic = process.env.ANTHROPIC_API_KEY;
  const savedOpenRouter = process.env.OPENROUTER_API_KEY;
  const savedOllama = process.env.OLLAMA_BASE_URL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.OLLAMA_BASE_URL;

  const noProvider = await generateBlogArticle({ keyword: "test", sourceType: "KEYWORD" });
  assert(noProvider.success === false, "provider yoksa success false");
  assert(noProvider.error === "AI_PROVIDER_NOT_CONFIGURED", "provider yoksa AI_PROVIDER_NOT_CONFIGURED");
  assert(getProviderStatus().ready === false, "provider status ready=false");

  if (savedOpenAi) process.env.OPENAI_API_KEY = savedOpenAi;
  if (savedGemini) process.env.GEMINI_API_KEY = savedGemini;
  if (savedAnthropic) process.env.ANTHROPIC_API_KEY = savedAnthropic;
  if (savedOpenRouter) process.env.OPENROUTER_API_KEY = savedOpenRouter;
  if (savedOllama) process.env.OLLAMA_BASE_URL = savedOllama;

  // 2. Şablon fallback publish olamaz
  const fallbackMeta = {
    writerVersion: WRITER_VERSION,
    provider: null,
    model: null,
    generatedAt: new Date().toISOString(),
    promptHash: "abc",
    wordCount: 100,
    aiGenerated: false,
    fallbackUsed: true,
    generationStatus: "FAILED" as const,
    generationError: "AI_PROVIDER_NOT_CONFIGURED",
  };
  assert(!isPublishableAiContent(fallbackMeta).publishable, "şablon fallback publish olamamalı");
  assert(!isAiWriterPublishable(fallbackMeta), "isAiWriterPublishable fallback reddeder");

  // 3. Blog minimum yapı (mock validation)
  const goodContent = {
    h1: "Cam Tablo Bayiliği Rehberi",
    intro: "Cam tablo bayiliği ".repeat(50),
    sections: Array.from({ length: 5 }, (_, i) => ({
      heading: `Bölüm ${i + 1}`,
      body: `Detaylı içerik paragrafı ${i + 1}. `.repeat(80),
    })),
    conclusion: "Sonuç paragrafı ".repeat(30),
    faq: [
      { question: "Cam tablo bayiliği nedir?", answer: "Detaylı cevap ".repeat(20) },
      { question: "Nasıl başlanır?", answer: "Adım adım ".repeat(20) },
      { question: "Maliyet ne kadar?", answer: "Bütçe ".repeat(20) },
    ],
    seoTitle: "Cam Tablo Bayiliği | ENA",
    seoDescription: "Cam tablo bayiliği hakkında kapsamlı rehber. ".repeat(3),
    schema: { "@type": "BlogPosting", headline: "Cam Tablo Bayiliği" },
    keyword: "cam tablo bayiliği",
  };
  const goodValidation = validateGeneratedContent({ contentType: "BLOG", ...goodContent });
  assert(goodValidation.passed, "blog article minimum yapı üretmeli (validation)");
  assert(goodValidation.sectionCount >= 5, "en az 5 bölüm");
  assert(goodValidation.faqCount >= 3, "en az 3 SSS");

  // 4. Yasaklı ifadeler
  const template = buildKeywordContent("cam tablo");
  const badValidation = validateGeneratedContent({
    contentType: "BLOG",
    h1: template.h1,
    intro: template.intro,
    sections: template.sections,
    conclusion: template.conclusion,
    faq: [{ question: "q", answer: "a" }],
    seoTitle: "title",
    seoDescription: "desc",
    schema: { "@type": "BlogPosting" },
    keyword: "cam tablo",
  });
  assert(badValidation.hasBannedPhrases, "yasaklı ifadeler yakalanmalı");
  assert(BANNED_PHRASES.length > 0, "yasaklı ifade listesi dolu");

  // 5. Duplicate paragraf
  const dupValidation = validateGeneratedContent({
    contentType: "BLOG",
    h1: "Test",
    intro: "Aynı paragraf tekrar.",
    sections: [{ heading: "S1", body: "Aynı paragraf tekrar." }],
    faq: [
      { question: "q1", answer: "a1" },
      { question: "q2", answer: "a2" },
      { question: "q3", answer: "a3" },
    ],
    seoTitle: "Test Title Here Long Enough",
    seoDescription: "Test description long enough for meta field requirements here.",
    schema: { "@type": "BlogPosting" },
    keyword: "test",
  });
  assert(dupValidation.hasDuplicateParagraphs, "duplicate paragraf yakalanmalı");

  // 6. metadataJson doğru yazılmalı
  assert(noProvider.metadata.writerVersion === WRITER_VERSION, "metadata writerVersion");
  assert(noProvider.metadata.generationStatus === "FAILED", "metadata generationStatus FAILED");
  assert(noProvider.metadata.aiGenerated === false, "metadata aiGenerated false");

  // 7-9. Entegrasyon dosyaları mevcut
  const fs = await import("fs");
  assert(fs.existsSync("src/lib/blog-engine/blog-ai-bridge.ts"), "Blog Engine ai-writer bridge");
  assert(fs.existsSync("src/lib/page-factory/content-draft/page-factory-ai-bridge.ts"), "Page Factory ai-writer bridge");
  assert(fs.existsSync("src/lib/legacy-recovery/recovery-executor.ts"), "Legacy Recovery mevcut");

  // 10. Publishing gate fallback
  const successMeta = {
    writerVersion: WRITER_VERSION,
    provider: "OPENAI" as AiProviderName,
    model: "gpt-4o-mini",
    generatedAt: new Date().toISOString(),
    promptHash: "xyz",
    wordCount: 1200,
    aiGenerated: true,
    fallbackUsed: false,
    generationStatus: "SUCCESS" as const,
    generationError: null,
  };
  assert(isPublishableAiContent(successMeta).publishable, "başarılı AI metadata publishable");
  assert(!isPublishableAiContent(fallbackMeta).publishable, "Publishing Center fallback APPROVED yapmamalı");

  console.log(`\n--- Sonuç: ${passed} geçti, ${failed} başarısız ---\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
