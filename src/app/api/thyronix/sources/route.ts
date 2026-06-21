import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireThyronixDealerOrAdmin,
  tenantOwnerFields,
  thyronixErrorResponse,
  withTenantFilter,
} from "@/lib/thyronix/access";

export async function GET() {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const sources = await prisma.thyronixSource.findMany({
      where: withTenantFilter(user, {}),
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: sources });
  } catch (e) {
    return thyronixErrorResponse(e, "Yetkisiz erişim");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const owner = tenantOwnerFields(user);
    const body = await req.json();
    const source = await prisma.thyronixSource.create({
      data: {
        name: body.name,
        xmlUrl: body.xmlUrl,
        type: body.type || "xml",
        inputFormat: body.inputFormat || "custom_xml",
        fieldMapping: body.fieldMapping || null,
        fixedValues: body.fixedValues || null,
        interval: body.interval || 60,
        status: body.status || "active",
        dealerId: owner.dealerId,
        tenantScope: owner.tenantScope,
        ownerType: owner.ownerType,
      },
    });
    return NextResponse.json({ success: true, data: source }, { status: 201 });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}
