import { NextResponse } from "next/server";
import { requirePageFactoryApiAccess } from "@/lib/page-factory/api-guard";
import {
  createPageFactoryProject,
  isValidProductionType,
  listProjects,
} from "@/lib/page-factory/project-service";
import { isAdminRole } from "@/lib/auth/admin-access";
import type { ProductionType } from "@/lib/page-factory/types";

export async function GET() {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const dealerScope = isAdminRole(user.role) ? null : user.dealerId || null;
    const projects = await listProjects(dealerScope);
    return NextResponse.json({ success: true, data: projects });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Projeler yüklenemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { error, user } = await requirePageFactoryApiAccess();
    if (error) return error;

    const body = await req.json();
    const name = String(body.name || "").trim();
    const sector = String(body.sector || "").trim();
    const country = String(body.country || "TR").trim();
    const language = String(body.language || "tr").trim();
    const productionType = String(body.productionType || "MIXED").trim();

    if (!name || !sector) {
      return NextResponse.json({ success: false, error: "Proje adı ve sektör gerekli" }, { status: 400 });
    }
    if (!isValidProductionType(productionType)) {
      return NextResponse.json({ success: false, error: "Geçersiz üretim türü" }, { status: 400 });
    }

    const dealerId = isAdminRole(user.role) ? body.dealerId || null : user.dealerId || null;

    const project = await createPageFactoryProject({
      name,
      sector,
      country,
      language,
      productionType: productionType as ProductionType,
      dealerId,
    });

    return NextResponse.json({ success: true, data: project });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Proje oluşturulamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
