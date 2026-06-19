import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteShowcase, getShowcaseById, updateShowcase } from "@/lib/ecosystem/service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getShowcaseById(id);
    if (!data) return NextResponse.json({ success: false, error: "Bulunamadı" }, { status: 404 });
    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data = await updateShowcase(id, body);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Yetkisiz";
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await deleteShowcase(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Yetkisiz";
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
