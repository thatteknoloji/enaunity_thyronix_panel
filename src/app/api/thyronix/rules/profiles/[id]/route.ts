import { NextResponse } from "next/server";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse } from "@/lib/thyronix/access";
import {
  deleteRulesProfile,
  getRulesProfileById,
  resolveRulesDealerId,
  updateRulesProfile,
} from "@/lib/thyronix/rules/profile-service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const { searchParams } = new URL(req.url);
    const dealerId = await resolveRulesDealerId(user, searchParams.get("dealerId"));
    const { id } = await params;
    const data = await getRulesProfileById(id, dealerId);
    if (!data) {
      return NextResponse.json({ success: false, error: "Profil bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const body = await req.json();
    const dealerId = await resolveRulesDealerId(user, body.dealerId);
    const { id } = await params;
    const data = await updateRulesProfile(id, dealerId, {
      name: body.name,
      price: body.price,
      stock: body.stock,
      gate: body.gate,
      ai: body.ai,
      outputFormat: body.outputFormat,
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const { searchParams } = new URL(req.url);
    const dealerId = await resolveRulesDealerId(user, searchParams.get("dealerId"));
    const { id } = await params;
    await deleteRulesProfile(id, dealerId);
    return NextResponse.json({ success: true });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
