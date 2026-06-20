import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertLinkSlashAccess } from "@/lib/linkslash/access";
import { getPendingCaptures } from "@/lib/linkslash/capture-service";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const access = await assertLinkSlashAccess(user);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: access.reason }, { status: 403 });
    }

    const pending = await getPendingCaptures(user.id);
    return NextResponse.json({
      success: true,
      data: pending.map((row) => ({
        id: row.id,
        url: row.url,
        title: row.title,
        description: row.description,
        image: row.image,
        favicon: row.favicon,
        domain: row.domain,
        sourceType: row.sourceType,
        tags: JSON.parse(row.tagsJson || "[]"),
        aiSummary: row.aiSummary,
        aiCategory: row.aiCategory,
        createdAt: row.createdAt,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Liste alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
