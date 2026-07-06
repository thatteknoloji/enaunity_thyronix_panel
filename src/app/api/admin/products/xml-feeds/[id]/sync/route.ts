import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runXmlFeedSync } from "@/lib/products/xml-feed/sync-runner";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const report = await runXmlFeedSync(id);
    return NextResponse.json({ success: true, data: report });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Sync hatası" },
      { status: 500 },
    );
  }
}
