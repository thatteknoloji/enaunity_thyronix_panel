import type { AeoFaqBlock } from "./aeo-types";
import type { BlueprintKind } from "./aeo-types";
import type { AeoCitationHint } from "./aeo-types";
import type { AeoProductContext } from "./aeo-utils";
import {
  categoryLabel,
  clampLength,
  makeId,
  materialPhrase,
  parseJsonArray,
  pickEntity,
  pickAttr,
  sanitizeText,
} from "./aeo-utils";

type FaqTemplate = {
  category: string;
  question: (ctx: AeoProductContext, name: string) => string;
  answer: (ctx: AeoProductContext, name: string) => string;
  confidence: number;
};

const TEMPLATES: FaqTemplate[] = [
  {
    category: "nedir",
    question: (_, name) => `${name} nedir?`,
    answer: (ctx, name) => {
      const mat = materialPhrase(ctx);
      const cat = categoryLabel(ctx.product.categoryPath);
      const parts = [name];
      if (cat) parts.push(`${cat} kategorisinde bir üründür`);
      if (mat) parts.push(`${mat} malzeme özelliği taşır`);
      return clampLength(parts.join(". ") + ".", 80, 280);
    },
    confidence: 0.85,
  },
  {
    category: "ne_is",
    question: (_, name) => `${name} ne işe yarar?`,
    answer: (ctx, name) => {
      const usage = pickEntity(ctx.entities, "USAGE_AREA");
      if (usage) {
        return clampLength(`${name}, ${usage.toLowerCase()} gibi alanlarda dekorasyon ve düzenleme amacıyla kullanılabilir.`, 80, 280);
      }
      return clampLength(`${name}, ilgili kategorideki ihtiyaçlara yönelik dekoratif veya işlevsel bir çözüm sunar.`, 80, 280);
    },
    confidence: 0.8,
  },
  {
    category: "kimler",
    question: (_, name) => `${name} kimler için uygundur?`,
    answer: (ctx, name) => {
      const audience = ctx.contentDNA?.audience;
      if (audience) return clampLength(`${name}, ${audience} için uygun bir seçenek olarak değerlendirilebilir.`, 80, 280);
      const usage = pickEntity(ctx.entities, "USAGE_AREA");
      if (usage) return clampLength(`${name}, ${usage.toLowerCase()} alanında ürün arayan kullanıcılar için uygundur.`, 80, 280);
      return clampLength(`${name}, ilgili kategoriyle ilgilenen alıcılar için değerlendirilebilir.`, 80, 280);
    },
    confidence: 0.75,
  },
  {
    category: "olcu_malzeme",
    question: (ctx, name) => {
      const size = pickEntity(ctx.entities, "SIZE") || pickAttr(ctx.attributes, "size");
      const mat = materialPhrase(ctx);
      if (size && mat) return `${name} hangi ölçü ve malzeme seçeneklerine sahip?`;
      if (size) return `${name} hangi ölçüde sunuluyor?`;
      if (mat) return `${name} hangi malzemeden üretilmiştir?`;
      return `${name} teknik özellikleri nelerdir?`;
    },
    answer: (ctx, name) => {
      const size = pickEntity(ctx.entities, "SIZE") || pickAttr(ctx.attributes, "size");
      const mat = materialPhrase(ctx);
      const parts: string[] = [];
      if (size) parts.push(`ölçü: ${size}`);
      if (mat) parts.push(`malzeme: ${mat}`);
      const color = pickEntity(ctx.entities, "COLOR") || pickAttr(ctx.attributes, "color");
      if (color) parts.push(`renk: ${color}`);
      if (parts.length) return clampLength(`${name} için kayıtlı özellikler — ${parts.join(", ")}.`, 80, 280);
      return clampLength(`${name} için ölçü ve malzeme bilgisi ürün verisinde sınırlı; detaylar ürün sayfasından kontrol edilmelidir.`, 80, 280);
    },
    confidence: 0.78,
  },
  {
    category: "nerede",
    question: (ctx, name) => {
      const usage = pickEntity(ctx.entities, "USAGE_AREA");
      return usage ? `${name} nerede kullanılır?` : `${name} hangi alanlarda kullanılabilir?`;
    },
    answer: (ctx, name) => {
      const usage = pickEntity(ctx.entities, "USAGE_AREA");
      if (usage) return clampLength(`${name}, ${usage.toLowerCase()} gibi iç mekanlarda kullanım için uygundur.`, 80, 280);
      return clampLength(`${name}, ilgili kategorideki tipik kullanım alanlarına göre değerlendirilebilir.`, 80, 280);
    },
    confidence: 0.77,
  },
  {
    category: "dikkat",
    question: (_, name) => `${name} satın alırken nelere dikkat edilir?`,
    answer: (ctx, name) => {
      const parts = [`${name} satın alırken ölçü, malzeme ve kullanım alanı uyumunu kontrol etmek faydalıdır`];
      if (ctx.product.brand) parts.push(`${ctx.product.brand} marka bilgisini doğrulayın`);
      return clampLength(parts.join(". ") + ".", 80, 280);
    },
    confidence: 0.72,
  },
  {
    category: "fark",
    question: (_, name) => `${name} benzer ürünlerden nasıl ayrılır?`,
    answer: (ctx, name) => {
      const theme = pickEntity(ctx.entities, "THEME");
      const mat = materialPhrase(ctx);
      const style = pickEntity(ctx.entities, "STYLE");
      const traits = [theme, mat, style, ctx.product.brand].filter(Boolean);
      if (traits.length) {
        return clampLength(`${name}, ${traits.join(", ")} gibi özellikleriyle benzer modellerden ayrışabilir.`, 80, 280);
      }
      return clampLength(`${name}, kategori ve ürün verisindeki özelliklerle benzer seçeneklerden ayrıştırılabilir.`, 80, 280);
    },
    confidence: 0.7,
  },
  {
    category: "fiyat",
    question: (_, name) => `${name} fiyatı neye göre değişir?`,
    answer: (ctx, name) => {
      if (ctx.product.price != null && ctx.product.price > 0) {
        return clampLength(
          `${name} için güncel fiyat bilgisi ürün sayfasında yer alır; ölçü, malzeme ve marka gibi faktörler fiyatı etkileyebilir. Kesin fiyat için sayfayı kontrol edin.`,
          80,
          280
        );
      }
      return clampLength(`${name} fiyatı ölçü, malzeme, marka ve tedarik koşullarına göre değişebilir; güncel fiyat ürün sayfasından kontrol edilmelidir.`, 80, 280);
    },
    confidence: 0.68,
  },
];

const KIND_PRIORITY: Record<BlueprintKind, string[]> = {
  PRODUCT_DETAIL: ["nedir", "ne_is", "kimler", "olcu_malzeme", "nerede", "dikkat", "fark", "fiyat"],
  PRODUCT_FAQ: ["nedir", "ne_is", "kimler", "olcu_malzeme", "nerede", "dikkat", "fark", "fiyat"],
  PRODUCT_GEO: ["nedir", "nerede", "kimler", "dikkat", "fiyat", "olcu_malzeme", "ne_is", "fark"],
  PRODUCT_INTENT: ["nedir", "ne_is", "dikkat", "kimler", "fark", "olcu_malzeme", "nerede", "fiyat"],
  PRODUCT_CATEGORY: ["nedir", "ne_is", "kimler", "fark", "dikkat", "olcu_malzeme", "nerede", "fiyat"],
};

export function generateFaqBlocks(
  ctx: AeoProductContext,
  blueprintKind: BlueprintKind,
  metadata: Record<string, unknown>,
  citationHints: AeoCitationHint[]
): AeoFaqBlock[] {
  const name = ctx.product.normalizedName;
  const seeds = parseJsonArray(ctx.contentDNA?.faqSeedsJson || "[]");
  const priority = KIND_PRIORITY[blueprintKind];
  const blocks: AeoFaqBlock[] = [];
  const usedQuestions = new Set<string>();

  for (const seed of seeds.slice(0, 3)) {
    const q = sanitizeText(seed);
    if (!q || usedQuestions.has(q.toLowerCase())) continue;
    usedQuestions.add(q.toLowerCase());
    const answer = clampLength(
      `${name} hakkında: ${ctx.product.descriptionClean?.slice(0, 120) || "Ürün verisine dayalı kısa yanıt için ürün sayfasını inceleyin."}`,
      80,
      280
    );
    blocks.push({
      id: makeId("faq-seed", blocks.length),
      question: q.endsWith("?") ? q : `${q}?`,
      answer,
      shortAnswer: answer.slice(0, 140),
      category: "seed",
      confidenceScore: 0.72,
      sourceHints: citationHints.slice(0, 2),
    });
  }

  for (const cat of priority) {
    if (blocks.length >= 8) break;
    const tpl = TEMPLATES.find((t) => t.category === cat);
    if (!tpl) continue;
    const question = tpl.question(ctx, name);
    if (usedQuestions.has(question.toLowerCase())) continue;
    usedQuestions.add(question.toLowerCase());
    const answer = tpl.answer(ctx, name);
    blocks.push({
      id: makeId("faq", blocks.length),
      question,
      answer,
      shortAnswer: answer.slice(0, 140),
      category: cat,
      confidenceScore: tpl.confidence,
      sourceHints: citationHints.slice(0, 2),
    });
  }

  const minFaq = blueprintKind === "PRODUCT_FAQ" ? 6 : 4;
  while (blocks.length < minFaq && blocks.length < TEMPLATES.length) {
    const tpl = TEMPLATES[blocks.length];
    if (!tpl) break;
    const question = tpl.question(ctx, name);
    if (usedQuestions.has(question.toLowerCase())) continue;
    usedQuestions.add(question.toLowerCase());
    const answer = tpl.answer(ctx, name);
    blocks.push({
      id: makeId("faq", blocks.length),
      question,
      answer,
      shortAnswer: answer.slice(0, 140),
      category: tpl.category,
      confidenceScore: tpl.confidence,
      sourceHints: citationHints.slice(0, 2),
    });
  }

  return blocks.slice(0, 8);
}
