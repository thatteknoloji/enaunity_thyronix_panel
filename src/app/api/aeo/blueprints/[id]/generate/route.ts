import { NextResponse } from "next/server";
import { generateAeoForBlueprint } from "@/lib/aeo/aeo-blueprint-service";
import { requireAeoApiAccess } from "@/lib/aeo/aeo-api-guard";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const access = await requireAeoApiAccess(id);
    if (access.error) return access.error;

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun === true;

    const result = await generateAeoForBlueprint(id, dryRun);
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AEO kaydı başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
