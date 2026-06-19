import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolvePackagePrice } from "@/lib/product-library/package-access-service";

export async function GET(req: Request) {
  try {
    await requireDealer();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "module") {
      const moduleKey = searchParams.get("moduleKey");
      const planKey = searchParams.get("planKey");
      if (!moduleKey || !planKey) {
        return NextResponse.json({ success: false, error: "moduleKey ve planKey zorunlu" }, { status: 400 });
      }
      const plan = await prisma.modulePlan.findFirst({ where: { moduleKey, planKey, isActive: true } });
      if (!plan) {
        return NextResponse.json({ success: false, error: "Paket bulunamadı" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: {
          type: "module",
          title: `${plan.name} — Ödeme`,
          description: plan.description,
          amount: plan.monthlyPrice,
          currency: plan.currency || "TRY",
          moduleKey,
          planKey,
        },
      });
    }

    if (type === "package") {
      const packageId = searchParams.get("packageId");
      if (!packageId) {
        return NextResponse.json({ success: false, error: "packageId zorunlu" }, { status: 400 });
      }
      const pkg = await prisma.productPackage.findUnique({ where: { id: packageId } });
      if (!pkg || pkg.status !== "ACTIVE") {
        return NextResponse.json({ success: false, error: "Paket bulunamadı" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: {
          type: "package",
          title: `${pkg.name} — Ödeme`,
          description: pkg.description,
          amount: resolvePackagePrice(pkg),
          currency: "TRY",
          packageId,
        },
      });
    }

    return NextResponse.json({ success: false, error: "Geçersiz type" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Yetkisiz";
    return NextResponse.json({ success: false, error: msg }, { status: 401 });
  }
}
