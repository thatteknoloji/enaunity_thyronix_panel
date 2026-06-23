import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import type { BlogPostStatus, BlogSourceType } from "@/lib/blog-engine/blog-types";
import { listBlogPosts } from "@/lib/blog-engine/blog-service";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") as BlogPostStatus | null;
    const sourceType = url.searchParams.get("sourceType") as BlogSourceType | null;
    const page = url.searchParams.get("page") ? Number(url.searchParams.get("page")) : 1;
    const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 20;
    const q = url.searchParams.get("q") || undefined;
    const data = await listBlogPosts({
      status: status || undefined,
      sourceType: sourceType || undefined,
      page,
      limit,
      q,
    });
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}
