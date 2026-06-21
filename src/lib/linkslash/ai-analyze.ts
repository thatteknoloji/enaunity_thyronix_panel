import { prisma } from "@/lib/db";
import { aiCall } from "@/lib/thyronix/ai-service";
import { normalizeLinkUrl } from "@/lib/linkslash/normalize-url";

export type AiAnalysisPayload = {
  summary: string;
  tags: string[];
  categorySuggestion: string;
  contentIdeas: string[];
  seoBrief: {
    title: string;
    keywords: string[];
    faq: Array<{ q: string; a: string }>;
  };
  socialDrafts: {
    x: string;
    linkedin: string;
    instagram: string;
  };
};

export type AnalyzeLinkInput = {
  linkId?: string;
  url?: string;
  title?: string;
  description?: string;
  rawText?: string;
  sourceType?: string;
  userId?: string;
  tenantId?: string;
  save?: boolean;
};

const EMPTY_ANALYSIS: AiAnalysisPayload = {
  summary: "",
  tags: [],
  categorySuggestion: "",
  contentIdeas: [],
  seoBrief: { title: "", keywords: [], faq: [] },
  socialDrafts: { x: "", linkedin: "", instagram: "" },
};

const SYSTEM_PROMPT = `You are LinkSlash AI. Analyze saved links for content creators, SEO specialists and researchers.
Respond ONLY with valid JSON matching this schema:
{
  "summary": "2-3 sentence Turkish summary",
  "tags": ["tag1","tag2"],
  "categorySuggestion": "short category name in Turkish",
  "contentIdeas": ["idea1","idea2","idea3"],
  "seoBrief": { "title": "...", "keywords": ["..."], "faq": [{"q":"...","a":"..."}] },
  "socialDrafts": { "x": "...", "linkedin": "...", "instagram": "..." }
}`;

function buildUserPrompt(input: AnalyzeLinkInput) {
  return [
    `URL: ${input.url || "—"}`,
    `Title: ${input.title || "—"}`,
    `Description: ${input.description || "—"}`,
    `Source type: ${input.sourceType || "other"}`,
    `Raw text excerpt: ${(input.rawText || "").slice(0, 3000)}`,
  ].join("\n");
}

function parseAnalysis(raw: string): AiAnalysisPayload {
  try {
    const parsed = JSON.parse(raw) as Partial<AiAnalysisPayload>;
    return {
      summary: String(parsed.summary || "").slice(0, 2000),
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 12) : [],
      categorySuggestion: String(parsed.categorySuggestion || "").slice(0, 120),
      contentIdeas: Array.isArray(parsed.contentIdeas) ? parsed.contentIdeas.map(String).slice(0, 8) : [],
      seoBrief: {
        title: String(parsed.seoBrief?.title || "").slice(0, 200),
        keywords: Array.isArray(parsed.seoBrief?.keywords) ? parsed.seoBrief!.keywords.map(String).slice(0, 12) : [],
        faq: Array.isArray(parsed.seoBrief?.faq)
          ? parsed.seoBrief!.faq.slice(0, 5).map((f) => ({
              q: String((f as { q?: string }).q || "").slice(0, 200),
              a: String((f as { a?: string }).a || "").slice(0, 500),
            }))
          : [],
      },
      socialDrafts: {
        x: String(parsed.socialDrafts?.x || "").slice(0, 280),
        linkedin: String(parsed.socialDrafts?.linkedin || "").slice(0, 1200),
        instagram: String(parsed.socialDrafts?.instagram || "").slice(0, 600),
      },
    };
  } catch {
    return { ...EMPTY_ANALYSIS, summary: raw.slice(0, 2000) };
  }
}

function ruleBasedFallback(input: AnalyzeLinkInput): AiAnalysisPayload {
  const title = input.title || input.url || "Link";
  const desc = input.description || input.rawText?.slice(0, 200) || "";
  return {
    summary: desc || `${title} kaynağı hakkında kısa not. Tam AI analizi için sunucu AI sağlayıcısı yapılandırın.`,
    tags: [input.sourceType || "link", "kaynak"].filter(Boolean),
    categorySuggestion: "Genel Kaynaklar",
    contentIdeas: [
      "Bu linkten 5 maddelik LinkedIn postu üret",
      "Bu kaynağı blog briefine çevir",
      "Anahtar çıkarımları madde madde listele",
    ],
    seoBrief: {
      title: title.slice(0, 120),
      keywords: title.split(/\s+/).slice(0, 5),
      faq: [{ q: `${title} nedir?`, a: desc.slice(0, 300) || "Kaynak incelenmeli." }],
    },
    socialDrafts: {
      x: `${title} — kaydettiğim faydalı bir kaynak.`,
      linkedin: `${title}\n\n${desc.slice(0, 400)}`,
      instagram: `${title} 📌`,
    },
  };
}

async function resolveProviderId() {
  const provider = await prisma.thyronixAiProvider.findFirst({
    where: { status: "active" },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
  return provider?.id || null;
}

async function callEnvFallback(userPrompt: string): Promise<{ ok: boolean; content: string }> {
  const apiKey = process.env.LINKSLASH_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, content: "" };

  const model = process.env.LINKSLASH_AI_MODEL || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1200,
    }),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false, content: "" };
  return { ok: true, content: json.choices?.[0]?.message?.content || "" };
}

export async function analyzeLinkContent(input: AnalyzeLinkInput) {
  let resolved = { ...input };

  if (input.linkId && input.userId) {
    let link = await prisma.linkSlashLink.findFirst({
      where: {
        id: input.linkId,
        userId: input.userId,
        ...(input.tenantId ? { tenantId: input.tenantId } : {}),
        deletedAt: null,
      },
    });
    if (!link && input.url) {
      const normalizedUrl = normalizeLinkUrl(input.url);
      link = await prisma.linkSlashLink.findFirst({
        where: {
          userId: input.userId,
          ...(input.tenantId ? { tenantId: input.tenantId } : {}),
          normalizedUrl,
          deletedAt: null,
        },
      });
    }
    if (link) {
      resolved = {
        ...resolved,
        linkId: link.id,
        url: link.url,
        title: link.title || resolved.title,
        description: link.description || resolved.description,
        rawText: link.rawText || resolved.rawText,
        sourceType: link.sourceType || resolved.sourceType,
      };
    }
  }

  const userPrompt = buildUserPrompt(resolved);
  const providerId = await resolveProviderId();

  let analysis: AiAnalysisPayload;
  let status: "ok" | "provider_missing" | "fallback" = "ok";

  if (providerId) {
    const result = await aiCall({
      providerId,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      task: "linkslash_analyze",
      temperature: 0.4,
      maxTokens: 1400,
      responseFormat: "json_object",
    });
    if (result.success && result.content) {
      analysis = parseAnalysis(result.content);
    } else {
      analysis = ruleBasedFallback(resolved);
      status = "fallback";
    }
  } else {
    const env = await callEnvFallback(userPrompt);
    if (env.ok && env.content) {
      analysis = parseAnalysis(env.content);
    } else {
      analysis = ruleBasedFallback(resolved);
      status = "provider_missing";
    }
  }

  let savedLinkId: string | null = null;
  const cloudId = resolved.linkId || input.linkId;
  if (input.save !== false && cloudId && input.userId) {
    const json = JSON.stringify(analysis);
    await prisma.linkSlashLink.updateMany({
      where: {
        id: cloudId,
        userId: input.userId,
        ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      },
      data: {
        aiSummary: analysis.summary.slice(0, 2000),
        aiAnalysisJson: json,
        aiAnalyzedAt: new Date(),
      },
    });
    savedLinkId = cloudId;
  }

  return {
    status,
    analysis,
    aiSummary: analysis.summary,
    aiTags: analysis.tags,
    aiCategorySuggestion: analysis.categorySuggestion,
    aiContentIdeas: analysis.contentIdeas,
    aiSeoBrief: analysis.seoBrief,
    aiSocialDrafts: analysis.socialDrafts,
    savedLinkId,
    analyzedAt: new Date().toISOString(),
  };
}
