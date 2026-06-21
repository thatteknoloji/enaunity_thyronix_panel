import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createHomepageHero, getAdminHomepageHeroes, reorderHomepageHeroes } from "@/lib/homepage/heroes";

export async function GET() {
  try {
    await requireAdmin();
    const data = await getAdminHomepageHeroes();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();

    if (body.reorder && Array.isArray(body.ids)) {
      const data = await reorderHomepageHeroes(body.ids);
      return NextResponse.json({ success: true, data });
    }

    const data = await createHomepageHero(body);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("[Homepage Heroes POST]", e);
    return NextResponse.json({ success: false, error: "Kaydedilemedi" }, { status: 500 });
  }
}
