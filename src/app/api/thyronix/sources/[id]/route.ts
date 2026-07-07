import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  assertCanAccessSource,
  requireThyronixDealerOrAdmin,
  thyronixErrorResponse,
} from "@/lib/thyronix/access";
import { validateSourceMappingConfig } from "@/lib/thyronix/mapping-validation";
import { getTemplate } from "@/lib/thyronix/templates";
import { DEFAULT_THYRONIX_SYNC_INTERVAL } from "@/lib/thyronix/sync-interval";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const { id } = await params;
    await assertCanAccessSource(user, id);
    const body = await req.json();
    if (typeof body.interval !== "number") {
      return NextResponse.json({ success: false, error: "interval gerekli" }, { status: 400 });
    }
    const source = await prisma.thyronixSource.update({
      where: { id },
      data: { interval: body.interval },
    });
    return NextResponse.json({ success: true, data: source });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const { id } = await params;
    await assertCanAccessSource(user, id);
    const body = await req.json();
    const sourceType = body.type || "xml";
    const inputFormat = body.inputFormat || "custom_xml";
    const template = sourceType === "xml" ? getTemplate(inputFormat) : null;
    const validation = validateSourceMappingConfig({
      sourceType,
      fieldMapping: body.fieldMapping,
      variantMapping: body.variantMapping,
      fixedValues: body.fixedValues,
      templateFieldMap: template?.fieldMap as any,
    });
    if (!validation.ready && body.status !== "paused") {
      return NextResponse.json({ success: false, error: validation.errors.join(" · ") }, { status: 400 });
    }
    const source = await prisma.thyronixSource.update({
      where: { id },
      data: {
        name: body.name,
        xmlUrl: body.xmlUrl,
        type: sourceType,
        inputFormat,
        fieldMapping: body.fieldMapping || null,
        variantMapping: body.variantMapping || null,
        fixedValues: body.fixedValues || null,
        interval: body.interval ?? DEFAULT_THYRONIX_SYNC_INTERVAL,
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
