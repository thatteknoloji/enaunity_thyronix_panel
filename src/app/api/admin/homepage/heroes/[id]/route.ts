import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteHomepageHero, updateHomepageHero } from "@/lib/homepage/heroes";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data = await updateHomepageHero(id, body);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("[Homepage Hero PATCH]", e);
    return NextResponse.json({ success: false, error: "Güncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    await deleteHomepageHero(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[Homepage Hero DELETE]", e);
    return NextResponse.json({ success: false, error: "Silinemedi" }, { status: 500 });
  }
}
