import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { generateSmartBlogContent } from "@/lib/ai-brain/ai-brain-service";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const type = String(body.type || "BLOG");
    if (type !== "BLOG") {
      return NextResponse.json({ success: false, error: "Bu fazda sadece BLOG test destekleniyor" }, { status: 400 });
    }
    const out = await generateSmartBlogContent({
      keyword: String(body.keyword || "cam tablo bayiliği"),
      sourceType: "GEO",
      province: body.province ? String(body.province) : undefined,
      district: body.district ? String(body.district) : undefined,
    });
    return NextResponse.json({
      success: out.success,
      error: out.error,
      data: {
        researchSummary: out.metadata.researchSummary,
        primaryIntent: out.metadata.primaryIntent,
        entityMap: out.metadata.entityMap,
        outline: out.metadata.outline,
        title: out.data?.title,
        excerpt: out.data?.excerpt,
        wordCount: out.metadata.wordCount,
        faqCount: out.data?.faq?.length || 0,
        seoTitle: out.data?.seoTitle,
        seoDescription: out.data?.seoDescription,
        finalQualityScore: out.metadata.finalQualityScore,
        qualityIssues: out.metadata.qualityIssues,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Test hatası" },
      { status: 500 }
    );
  }
}
