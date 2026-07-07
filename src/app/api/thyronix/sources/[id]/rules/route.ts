import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  assertCanAccessSource,
  requireThyronixDealerOrAdmin,
  thyronixErrorResponse,
} from "@/lib/thyronix/access";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const { id } = await params;
    await assertCanAccessSource(user, id);
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.useCustomRules !== undefined) data.useCustomRules = Boolean(body.useCustomRules);
    if (body.rulesProfileId !== undefined) data.rulesProfileId = body.rulesProfileId || null;

    if (data.useCustomRules && !data.rulesProfileId && body.rulesProfileId !== null) {
      return NextResponse.json(
        { success: false, error: "Özel kurallar için profil seçin" },
        { status: 400 },
      );
    }

    const source = await prisma.thyronixSource.update({
      where: { id },
      data,
      include: { rulesProfile: true },
    });
    return NextResponse.json({ success: true, data: source });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
