import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import type { BlogSourceType, ProductBlogType } from "@/lib/blog-engine/blog-types";
import {
  generateCategoryBlog,
  generateCompetitorStructureBlog,
  generateGeoBlog,
  generateKeywordBlog,
  generateKeywordGroupBlogs,
  generateProductBlog,
} from "@/lib/blog-engine/blog-service";

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
    productBlogType: body.productBlogType
      ? (String(body.productBlogType) as ProductBlogType)
      : undefined,
    category: body.category ? String(body.category) : undefined,
    province: body.province ? String(body.province) : undefined,
    district: body.district ? String(body.district) : undefined,
    competitorStructure: body.competitorStructure ? String(body.competitorStructure) : undefined,
    competitorUrl: body.competitorUrl ? String(body.competitorUrl) : undefined,
    tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
    dryRun: body.dryRun === true,
    autoPublish: body.autoPublish === true,
  };
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const opts = parseBody(body);

    let data: unknown;
    switch (opts.sourceType) {
      case "KEYWORD":
        data = await generateKeywordBlog(opts);
        break;
      case "KEYWORD_GROUP":
        data = await generateKeywordGroupBlogs(opts);
        break;
      case "PRODUCT":
        data = await generateProductBlog(opts);
        break;
      case "CATEGORY":
        data = await generateCategoryBlog(opts);
        break;
      case "GEO":
        data = await generateGeoBlog(opts);
        break;
      case "COMPETITOR_STRUCTURE":
        data = await generateCompetitorStructureBlog(opts);
        break;
      default:
        return NextResponse.json({ success: false, error: "Geçersiz sourceType" }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generate başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
