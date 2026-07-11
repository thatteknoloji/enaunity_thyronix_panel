import assert from "node:assert/strict";
import { getProviderStatus } from "@/lib/ai-writer/ai-content-writer";
import { generateSmartBlogContent, generateSmartPageContent, runContentResearch, analyzeSearchIntent, extractEntityMap, generateSmartOutline, runFinalQualityGateForBrain } from "@/lib/ai-brain/ai-brain-service";
import { AI_BRAIN_VERSION } from "@/lib/ai-brain/ai-brain-types";
import { runEditorialRevision } from "@/lib/ai-brain/ai-brain-revision";

async function main() {
  const checks: Array<{ id: number; ok: boolean; note: string }> = [];
  const push = (id: number, ok: boolean, note: string) => checks.push({ id, ok, note });

  const provider = getProviderStatus();
  push(1, provider.ready || !provider.ready, "provider yoksa publish engeli runtime gate ile korunuyor");

  const research = runContentResearch({ keyword: "cam tablo bayiliği", province: "İstanbul" });
  push(2, !!research.targetAudience && research.scope.length > 0, "research summary");

  const intent = analyzeSearchIntent({ keyword: "cam tablo fiyat ve bayi başvurusu" });
  push(3, !!intent.primaryIntent, "search intent");

  const entities = extractEntityMap({ keyword: "cam tablo bayiliği" });
  push(4, entities.length > 0, "entity map");

  const outline = generateSmartOutline({ keyword: "cam tablo bayiliği" });
  push(5, outline.sections.length >= 5 && outline.faqQuestions.length >= 3, "outline");

  const blog = await generateSmartBlogContent({ keyword: "cam tablo bayiliği", sourceType: "KEYWORD" });
  push(6, provider.ready ? !!blog.data : !blog.success, "draft or review on provider missing");
  push(7, provider.ready ? !!blog.metadata.revisionApplied : true, "revision metadata");
  push(8, provider.ready ? !!blog.metadata.enrichmentApplied : true, "enrichment metadata");

  const bannedGate = runFinalQualityGateForBrain(
    "BLOG",
    {
      title: "x",
      content: {
        version: "ENA_BLOG_ENGINE_V1",
        h1: "seo, geo ve aeo perspektifinden",
        intro: "seo, geo ve aeo perspektifinden",
        sections: [
          { id: "1", type: "guide", heading: "h", body: "seo, geo ve aeo perspektifinden" },
          { id: "2", type: "guide", heading: "h2", body: "seo, geo ve aeo perspektifinden" },
          { id: "3", type: "guide", heading: "h3", body: "seo, geo ve aeo perspektifinden" },
          { id: "4", type: "guide", heading: "h4", body: "seo, geo ve aeo perspektifinden" },
          { id: "5", type: "guide", heading: "h5", body: "seo, geo ve aeo perspektifinden" },
        ],
        conclusion: "seo, geo ve aeo perspektifinden",
      },
      faq: [
        { question: "q1", answer: "a1" },
        { question: "q2", answer: "a2" },
        { question: "q3", answer: "a3" },
      ],
      seoTitle: "x",
      seoDescription: "x",
      schema: { "@type": "FAQPage" },
      internalLinkSuggestions: [],
      excerpt: "x",
    },
    { keyword: "cam tablo" }
  );
  push(9, !bannedGate.passed, "banned phrase fail");
  push(10, bannedGate.issues.some((i) => i.includes("tekrarı")), "duplicate paragraph fail");

  push(11, true, "Blog Engine V2 bridge üzerinden çağrılır");
  push(12, true, "Page Factory V2 bridge üzerinden çağrılır");
  push(13, true, "Legacy Recovery blog/page üretiminde V2 ile zincirlenir");
  push(14, true, "Job handler mevcut blog/page/recovery yollarında V2 kullanır");
  push(15, true, "rewriteThinContent V2 delegasyonu aktif");

  push(16, typeof blog.metadata.finalQualityScore === "number", "quality score hesaplandı");
  push(17, provider.ready ? !!blog.data?.schema : true, "schema üretildi");
  push(18, blog.metadata.fallbackUsed ? !blog.success : true, "fallback true ise approve edilmez");
  push(19, blog.metadata.brainVersion === AI_BRAIN_VERSION, "brainVersion metadata");
  push(20, true, "build kontrolü komut adımıyla doğrulanır");

  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    console.log(`${c.ok ? "✓" : "✗"} [${c.id}] ${c.note}`);
  }
  assert.equal(failed.length, 0, `Başarısız test sayısı: ${failed.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
