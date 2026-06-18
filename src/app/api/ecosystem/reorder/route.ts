import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { duplicateShowcase, reorderShowcase } from "@/lib/ecosystem/service";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();

    if (body.action === "duplicate" && body.id) {
      const data = await duplicateShowcase(body.id);
      return NextResponse.json({ success: true, data });
    }

    if (!Array.isArray(body.ids)) {
      return NextResponse.json({ success: false, error: "ids dizisi gerekli" }, { status: 400 });
    }

    const data = await reorderShowcase(body.ids);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Yetkisiz";
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
