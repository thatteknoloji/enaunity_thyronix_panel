import { NextResponse } from "next/server";
import { generateUniverseForProduct } from "@/lib/page-factory/universe/universe-generator-service";
import type { UniverseGenerationMode } from "@/lib/page-factory/universe/universe-types";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import { isAdminRole } from "@/lib/auth/admin-access";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const { id: productId } = await params;
    const body = await req.json();
    const projectId = String(body.projectId || "");
    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId gerekli" }, { status: 400 });
    }

    const mode = body.mode as UniverseGenerationMode | undefined;
    const data = await generateUniverseForProduct(
      productId,
      {
        projectId,
        includeGeo: body.includeGeo !== false,
        mode: mode && ["full", "geo_only", "faq_only", "selected"].includes(mode) ? mode : "full",
        dryRun: body.dryRun === true,
      },
      {
        isAdmin: isAdminRole(user.role),
        dealerId: user.dealerId,
      }
    );

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ürün universe generate başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
