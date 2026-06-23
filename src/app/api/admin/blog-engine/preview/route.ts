import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import type { BlogSourceType } from "@/lib/blog-engine/blog-types";
import { previewBlog } from "@/lib/blog-engine/blog-service";

function parseBody(body: Record<string, unknown>) {
  const sourceType = String(body.sourceType || "KEYWORD") as BlogSourceType;
  const keywordsRaw = body.keywords;
  const keywords = Array.isArray(keywordsRaw)
    ? keywordsRaw.map(String)
    : typeof keywordsRaw === "string"
      ? keywordsRaw.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean)
      : undefined;
  return {
    sourceType,
    projectId: body.projectId ? String(body.projectId) : undefined,
    keyword: body.keyword ? String(body.keyword) : undefined,
    keywords,
    keywordGroup: body.keywordGroup ? String(body.keywordGroup) : undefined,
    productId: body.productId ? String(body.productId) : undefined,
    category: body.category ? String(body.category) : undefined,
    province: body.province ? String(body.province) : undefined,
    district: body.district ? String(body.district) : undefined,
    competitorStructure: body.competitorStructure ? String(body.competitorStructure) : undefined,
    competitorUrl: body.competitorUrl ? String(body.competitorUrl) : undefined,
    tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
  };
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const opts = parseBody(body);
    const data = await previewBlog(opts.sourceType, opts);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Preview başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
