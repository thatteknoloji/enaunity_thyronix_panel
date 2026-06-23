import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { archiveBlog } from "@/lib/blog-engine/blog-service";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const post = await archiveBlog(id);
    return NextResponse.json({ success: true, data: post });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Arşivleme başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
