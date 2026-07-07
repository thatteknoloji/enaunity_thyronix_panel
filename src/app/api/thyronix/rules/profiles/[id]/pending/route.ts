import { NextResponse } from "next/server";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse } from "@/lib/thyronix/access";
import {
  approveRulesChange,
  cancelRulesChange,
  getPendingRulesChange,
  proposeRulesChange,
} from "@/lib/thyronix/rules/rules-change-service";
import { resolveRulesDealerId } from "@/lib/thyronix/rules/profile-service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const { searchParams } = new URL(req.url);
    const dealerId = await resolveRulesDealerId(user, searchParams.get("dealerId"));
    const { id } = await params;
    const data = await getPendingRulesChange(id, dealerId);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const body = await req.json();
    const dealerId = await resolveRulesDealerId(user, body.dealerId);
    const { id } = await params;

    if (body.action === "approve") {
      const result = await approveRulesChange(id, dealerId, body.changeId);
      return NextResponse.json({ success: true, data: result });
    }

    if (body.action === "cancel") {
      await cancelRulesChange(id, dealerId);
      return NextResponse.json({ success: true });
    }

    const result = await proposeRulesChange(id, dealerId, {
      name: body.name,
      price: body.price,
      stock: body.stock,
      gate: body.gate,
      ai: body.ai,
      outputFormat: body.outputFormat,
    });
    return NextResponse.json({ success: true, data: result });
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
    await cancelRulesChange(id, dealerId);
    return NextResponse.json({ success: true });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
