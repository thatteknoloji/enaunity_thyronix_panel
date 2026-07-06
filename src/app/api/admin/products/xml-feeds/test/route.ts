import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { testFeedUrl } from "@/lib/products/xml-feed/parser";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const feedUrl = String(body.feedUrl || "").trim();
    const templateId = String(body.templateId || "leyna_v2").trim();
    if (!feedUrl) {
      return NextResponse.json({ success: false, error: "Feed URL gerekli" }, { status: 400 });
    }
    const result = await testFeedUrl(feedUrl, templateId);
    return NextResponse.json({ success: result.ok, data: result, error: result.error });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Test hatası" },
      { status: 500 },
    );
  }
}
