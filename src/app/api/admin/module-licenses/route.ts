import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const status = searchParams.get("status") || "";
    const moduleKey = searchParams.get("moduleKey") || "";
    const where: Record<string, string> = {};
    if (status) where.status = status;
    if (moduleKey) where.moduleKey = moduleKey;

    const [licenses, total] = await Promise.all([
      prisma.moduleLicense.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50 }),
      prisma.moduleLicense.count({ where }),
    ]);
    return NextResponse.json({ success: true, data: { items: licenses, total } });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { dealerId, moduleKey, planKey, status, months: monthsRaw } = body;
    if (!dealerId || !moduleKey) {
      return NextResponse.json({ success: false, error: "dealerId ve moduleKey zorunlu" }, { status: 400 });
    }

    const existing = await prisma.moduleLicense.findFirst({ where: { dealerId, moduleKey } });
    const months = monthsRaw ?? 12;
    const { computeLicenseEndsAt } = await import("@/lib/modules/subscription-utils");
    const endsAt = (status || "ACTIVE") === "ACTIVE" ? computeLicenseEndsAt(new Date(), months >= 12 ? "yearly" : "monthly") : null;

    if (existing) {
      const license = await prisma.moduleLicense.update({
        where: { id: existing.id },
        data: {
          planKey: planKey || existing.planKey,
          status: status || "ACTIVE",
          startsAt: new Date(),
          endsAt,
          lifecycleStage: "active",
        },
      });
      return NextResponse.json({ success: true, data: license });
    }

    const license = await prisma.moduleLicense.create({
      data: {
        dealerId,
        moduleKey,
        planKey: planKey || "starter",
        status: status || "ACTIVE",
        startsAt: new Date(),
        endsAt,
        lifecycleStage: "active",
        billingPeriod: months >= 12 ? "yearly" : "monthly",
      },
    });
    return NextResponse.json({ success: true, data: license }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
