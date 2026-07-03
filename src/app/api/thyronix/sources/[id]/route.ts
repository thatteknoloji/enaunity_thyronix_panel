import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  assertCanAccessSource,
  requireThyronixDealerOrAdmin,
  thyronixErrorResponse,
} from "@/lib/thyronix/access";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const { id } = await params;
    await assertCanAccessSource(user, id);
    const body = await req.json();
    const source = await prisma.thyronixSource.update({
      where: { id },
      data: {
        name: body.name,
        xmlUrl: body.xmlUrl,
        type: body.type,
        inputFormat: body.inputFormat || "custom_xml",
        fieldMapping: body.fieldMapping || null,
        variantMapping: body.variantMapping || null,
        fixedValues: body.fixedValues || null,
        interval: body.interval ?? 720,
        status: body.status,
      } as any,
    });
    return NextResponse.json({ success: true, data: source });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const { id } = await params;
    await assertCanAccessSource(user, id);
    await prisma.thyronixSource.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
