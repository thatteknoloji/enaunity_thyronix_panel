import { NextResponse } from "next/server";
import { previewAeoForBlueprint } from "@/lib/aeo/aeo-blueprint-service";
import { requireAeoApiAccess } from "@/lib/aeo/aeo-api-guard";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const access = await requireAeoApiAccess(id);
    if (access.error) return access.error;

    const payload = await previewAeoForBlueprint(id);
    return NextResponse.json({ success: true, data: payload });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AEO önizleme başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
