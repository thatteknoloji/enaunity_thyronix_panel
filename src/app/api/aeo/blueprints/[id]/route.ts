import { NextResponse } from "next/server";
import { getAeoForBlueprint, previewAeoForBlueprint } from "@/lib/aeo/aeo-blueprint-service";
import { requireAeoApiAccess } from "@/lib/aeo/aeo-api-guard";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const access = await requireAeoApiAccess(id);
    if (access.error) return access.error;

    const { searchParams } = new URL(req.url);
    const preview = searchParams.get("preview") === "true";

    const data = preview ? await previewAeoForBlueprint(id) : await getAeoForBlueprint(id);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AEO verisi alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
