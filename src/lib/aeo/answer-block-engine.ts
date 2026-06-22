import type { AeoAnswerBlock, AeoFaqBlock } from "./aeo-types";
import type { BlueprintKind } from "./aeo-types";
import type { AeoProductContext } from "./aeo-utils";
import {
  categoryLabel,
  clampLength,
  entityValues,
  makeId,
  materialPhrase,
  parseJsonArray,
  pickEntity,
  purposePhrase,
  sanitizeText,
  usagePhrase,
} from "./aeo-utils";

type BlockSpec = { type: AeoAnswerBlock["type"]; builder: (ctx: AeoProductContext, metadata: Record<string, unknown>, index: number) => AeoAnswerBlock };

function buildQuickAnswer(ctx: AeoProductContext, metadata: Record<string, unknown>, index: number): AeoAnswerBlock {
  const name = ctx.product.normalizedName;
  const mat = materialPhrase(ctx);
  const cat = categoryLabel(ctx.product.categoryPath) || "ürün";
  const usage = pickEntity(ctx.entities, "USAGE_AREA");

  let answer: string;
  if (mat && usage) {
    answer = `${name}, ${usage} gibi alanlarda ${purposePhrase(ctx)} için tercih edilen ${mat} gövdeli dekoratif bir ${cat.toLowerCase()} modelidir.`;
  } else if (mat) {
    answer = `${name}, ${usagePhrase(ctx)} ${purposePhrase(ctx)} için tercih edilen ${mat} malzemeli bir ${cat.toLowerCase()} modelidir.`;
  } else if (usage) {
    answer = `${name}, ${usage} gibi alanlarda kullanıma uygun, ${cat.toLowerCase()} kategorisinde değerlendirilebilecek bir üründür.`;
  } else {
    answer = `${name}, ${cat.toLowerCase()} kategorisinde ${purposePhrase(ctx)} amacıyla değerlendirilebilecek bir ürün modelidir.`;
  }

  answer = clampLength(answer, 180, 320);

  return {
    id: makeId("quick", index),
    type: "QUICK_ANSWER",
    title: "Hızlı Cevap",
    question: `${name} nedir?`,
    answer,
    shortAnswer: answer,
    entities: entityValues(ctx).slice(0, 5),
    intents: [(metadata.intent as string) || "informational"],
    confidenceScore: ctx.product.qualityScore >= 70 ? 0.88 : 0.65,
    sourceHints: [],
    schemaType: "Product",
    metadata: { charCount: answer.length },
  };
}

function buildAiOverview(ctx: AeoProductContext, metadata: Record<string, unknown>, index: number): AeoAnswerBlock {
  const name = ctx.product.normalizedName;
  const dna = ctx.contentDNA;
  const mat = materialPhrase(ctx);
  const theme = pickEntity(ctx.entities, "THEME");
  const style = pickEntity(ctx.entities, "STYLE");
  const audience = dna?.audience || "ilgili kategori alıcıları";

  const traits = [mat, theme, style, ctx.product.brand].filter(Boolean);
  const traitText = traits.length
    ? `${traits.join(", ")} gibi özellikleriyle öne çıkar`
    : "ürün verisindeki temel özelliklerle değerlendirilebilir";

  const links = (metadata.internalLinkHints as Array<{ anchor: string }> | undefined) || [];
  const linkText = links.length
    ? `İlgili iç sayfalara ${links.slice(0, 3).map((l) => l.anchor).join(", ")} bağlantıları verilebilir.`
    : "Kategori ve benzer ürün sayfalarına iç bağlantılar eklenebilir.";

  const answer = clampLength(
    `${name}, ${audience} için uygun bir seçenektir. ${traitText}. ` +
      `${ctx.product.descriptionClean ? sanitizeText(ctx.product.descriptionClean.slice(0, 120)) + ". " : ""}` +
      linkText,
    400,
    700
  );

  return {
    id: makeId("overview", index),
    type: "AI_OVERVIEW",
    title: "AI Overview Özeti",
    question: `${name} hakkında genel bilgi`,
    answer,
    shortAnswer: answer.slice(0, 200),
    entities: entityValues(ctx).slice(0, 6),
    intents: ["overview", (metadata.intent as string) || "commercial"],
    confidenceScore: 0.8,
    sourceHints: [],
    schemaType: "Article",
    metadata: { charCount: answer.length },
  };
}

function buildProductRecommendation(ctx: AeoProductContext, metadata: Record<string, unknown>, index: number): AeoAnswerBlock {
  const name = ctx.product.normalizedName;
  const usage = pickEntity(ctx.entities, "USAGE_AREA");
  const cat = categoryLabel(ctx.product.categoryPath);

  const answer = clampLength(
    `${name}, ${usage ? `${usage.toLowerCase()} alanında` : cat ? `${cat.toLowerCase()} kategorisinde` : "ilgili kullanım alanında"} ` +
      `ürün arayan kullanıcılar için değerlendirilebilecek bir seçenektir. ` +
      `Ölçü, malzeme ve marka bilgileri satın alma kararını destekler.`,
    180,
    400
  );

  return {
    id: makeId("rec", index),
    type: "PRODUCT_RECOMMENDATION",
    title: "Ürün Önerisi",
    question: `${name} kimler için önerilir?`,
    answer,
    shortAnswer: answer.slice(0, 160),
    entities: entityValues(ctx).slice(0, 4),
    intents: ["commercial", "recommendation"],
    confidenceScore: 0.74,
    sourceHints: [],
    schemaType: "Product",
    metadata: {},
  };
}

function buildDefinition(ctx: AeoProductContext, metadata: Record<string, unknown>, index: number): AeoAnswerBlock {
  const cat = categoryLabel(ctx.product.categoryPath) || ctx.product.normalizedName;
  const answer = clampLength(
    `${cat}, ${ctx.product.brand ? `${ctx.product.brand} ve benzer markaların` : "farklı markaların"} ` +
      `sunabileceği ürün grubunu ifade eder. ${ctx.product.normalizedName} bu grubun örnek modellerinden biridir.`,
    180,
    400
  );

  return {
    id: makeId("def", index),
    type: "DEFINITION",
    title: "Tanım",
    question: `${cat} nedir?`,
    answer,
    shortAnswer: answer.slice(0, 160),
    entities: [cat, ctx.product.normalizedName].filter(Boolean),
    intents: ["informational", "definition"],
    confidenceScore: 0.76,
    sourceHints: [],
    schemaType: "CollectionPage",
    metadata: {},
  };
}

function buildHowTo(ctx: AeoProductContext, metadata: Record<string, unknown>, index: number): AeoAnswerBlock {
  const name = ctx.product.normalizedName;
  const usage = pickEntity(ctx.entities, "USAGE_AREA");
  const answer = clampLength(
    `${name} seçerken önce kullanım alanını${usage ? ` (${usage.toLowerCase()})` : ""} belirleyin. ` +
      `Ardından ölçü, malzeme ve marka bilgilerini ürün verisiyle karşılaştırın. ` +
      `Son adımda teslimat ve iade koşullarını kontrol edin.`,
    200,
    450
  );

  return {
    id: makeId("howto", index),
    type: "HOW_TO",
    title: "Nasıl Seçilir",
    question: `${name} nasıl seçilir?`,
    answer,
    shortAnswer: answer.slice(0, 160),
    entities: entityValues(ctx).slice(0, 4),
    intents: ["how_to"],
    confidenceScore: 0.73,
    sourceHints: [],
    schemaType: "HowTo",
    metadata: {},
  };
}

function buildComparison(ctx: AeoProductContext, metadata: Record<string, unknown>, index: number): AeoAnswerBlock {
  const name = ctx.product.normalizedName;
  const mat = materialPhrase(ctx);
  const theme = pickEntity(ctx.entities, "THEME");
  const answer = clampLength(
    `${name}, benzer modellerle karşılaştırıldığında ${[mat, theme, ctx.product.brand].filter(Boolean).join(", ") || "ürün özellikleri"} ` +
      `açısından değerlendirilebilir. Kesin üstünlük iddiası yerine ihtiyaca uygunluk kriteri önerilir.`,
    200,
    450
  );

  return {
    id: makeId("cmp", index),
    type: "COMPARISON",
    title: "Karşılaştırma",
    question: `${name} benzer ürünlerle nasıl kıyaslanır?`,
    answer,
    shortAnswer: answer.slice(0, 160),
    entities: entityValues(ctx).slice(0, 4),
    intents: ["comparison"],
    confidenceScore: 0.7,
    sourceHints: [],
    schemaType: null,
    metadata: {},
  };
}

function faqToAnswerBlock(faq: AeoFaqBlock, index: number): AeoAnswerBlock {
  return {
    id: makeId("faq-block", index),
    type: "FAQ",
    title: "SSS",
    question: faq.question,
    answer: faq.answer,
    shortAnswer: faq.shortAnswer,
    entities: [],
    intents: ["faq"],
    confidenceScore: faq.confidenceScore,
    sourceHints: faq.sourceHints,
    schemaType: "FAQPage",
    metadata: { category: faq.category },
  };
}

const BUILDERS: Record<AeoAnswerBlock["type"], BlockSpec["builder"]> = {
  QUICK_ANSWER: buildQuickAnswer,
  AI_OVERVIEW: buildAiOverview,
  PRODUCT_RECOMMENDATION: buildProductRecommendation,
  DEFINITION: buildDefinition,
  HOW_TO: buildHowTo,
  COMPARISON: buildComparison,
  GEO_ANSWER: () => ({
    id: "geo-placeholder",
    type: "GEO_ANSWER",
    title: "",
    question: "",
    answer: "",
    shortAnswer: "",
    entities: [],
    intents: [],
    confidenceScore: 0,
    sourceHints: [],
    schemaType: null,
    metadata: {},
  }),
  FAQ: () => ({
    id: "faq-placeholder",
    type: "FAQ",
    title: "",
    question: "",
    answer: "",
    shortAnswer: "",
    entities: [],
    intents: [],
    confidenceScore: 0,
    sourceHints: [],
    schemaType: null,
    metadata: {},
  }),
};

const KIND_BLOCKS: Record<BlueprintKind, AeoAnswerBlock["type"][]> = {
  PRODUCT_DETAIL: ["QUICK_ANSWER", "AI_OVERVIEW", "PRODUCT_RECOMMENDATION"],
  PRODUCT_FAQ: ["QUICK_ANSWER"],
  PRODUCT_GEO: ["QUICK_ANSWER"],
  PRODUCT_INTENT: ["QUICK_ANSWER", "AI_OVERVIEW", "HOW_TO"],
  PRODUCT_CATEGORY: ["DEFINITION", "AI_OVERVIEW", "PRODUCT_RECOMMENDATION"],
};

export function generateAnswerBlocks(
  ctx: AeoProductContext,
  blueprintKind: BlueprintKind,
  metadata: Record<string, unknown>,
  faqBlocks: AeoFaqBlock[],
  geoBlocks: AeoAnswerBlock[] = []
): AeoAnswerBlock[] {
  const types = [...KIND_BLOCKS[blueprintKind]];

  if (blueprintKind === "PRODUCT_DETAIL" || blueprintKind === "PRODUCT_FAQ" || blueprintKind === "PRODUCT_CATEGORY") {
    types.push("FAQ");
  }
  if (blueprintKind === "PRODUCT_GEO") {
    types.push("GEO_ANSWER");
  }
  if (blueprintKind === "PRODUCT_INTENT" && !types.includes("HOW_TO")) {
    types.push("COMPARISON");
  }

  const blocks: AeoAnswerBlock[] = [];
  let index = 0;

  for (const type of types) {
    if (type === "FAQ") {
      for (const faq of faqBlocks.slice(0, 4)) {
        blocks.push(faqToAnswerBlock(faq, index++));
      }
      continue;
    }
    if (type === "GEO_ANSWER") {
      for (const geo of geoBlocks) {
        blocks.push(geo);
        index++;
      }
      continue;
    }
    const builder = BUILDERS[type];
    if (builder) blocks.push(builder(ctx, metadata, index++));
  }

  return blocks;
}
