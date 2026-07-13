import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { generateBlogArticle, validateGeneratedContent } from "@/lib/ai-writer/ai-content-writer";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const type = (body.type || "BLOG") as string;
    const keyword = (body.keyword || "").trim();
    const province = body.province as string | undefined;

    if (!keyword) {
      return NextResponse.json({ success: false, error: "keyword gerekli" }, { status: 400 });
    }

    if (type !== "BLOG") {
      return NextResponse.json({ success: false, error: "Bu fazda yalnızca BLOG testi destekleniyor" }, { status: 400 });
    }

    const result = await generateBlogArticle({
      keyword,
      sourceType: province ? "GEO" : "KEYWORD",
      province,
      debugTemplateFallback: body.debugTemplateFallback === true,
    });

    const data = result.data;
    const validation = data
      ? validateGeneratedContent({
          contentType: province ? "GEO" : "BLOG",
          h1: data.content.h1,
          intro: data.content.intro,
          sections: data.content.sections,
          conclusion: data.content.conclusion,
          faq: data.faq,
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
          schema: data.schema,
          keyword,
        })
      : { passed: false, issues: [result.error || "üretim başarısız"], wordCount: 0, sectionCount: 0, faqCount: 0, hasH1: false, hasMetaTitle: false, hasMetaDescription: false, hasJsonLd: false, hasDuplicateParagraphs: false, hasBannedPhrases: false };

    return NextResponse.json({
      success: result.success,
      data: {
        title: data?.title,
        excerpt: data?.excerpt,
        wordCount: validation.wordCount,
        sections: data?.content.sections.length || 0,
        faqCount: data?.faq.length || 0,
        seoTitle: data?.seoTitle,
        seoDescription: data?.seoDescription,
        validation,
        metadata: result.metadata,
        error: result.error,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Test üretimi başarısız";
    const code = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status: code });
  }
}
