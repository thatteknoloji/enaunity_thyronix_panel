import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth";
import { dealerCanAccessPackage, logDistribution } from "@/lib/product-library/access";
import { getPackageItems } from "@/lib/product-library/items";
import { exportPackageItems } from "@/lib/product-library/export";
import type { DistributionFormat } from "@/lib/product-library/types";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await requireDealer();
    const { id } = await params;
    const body = await req.json();
    const format = (body.format || "XML").toUpperCase() as DistributionFormat;

    const access = await dealerCanAccessPackage(user.dealerId!, id);
    if (!access.ok) {
      return NextResponse.json({ success: false, error: "Erişim reddedildi" }, { status: 403 });
    }

    const items = await getPackageItems(id);
    const exported = exportPackageItems(items, format);

    await logDistribution({
      packageId: id,
      dealerId: user.dealerId!,
      format,
      userId: user.id,
      userEmail: user.email,
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "",
      userAgent: req.headers.get("user-agent") || "",
    });

    const filename = `${access.pkg.slug}.${exported.extension}`;
    if (exported.extension === "xlsx") {
      const bytes = new Uint8Array(exported.body as Buffer);
      return new NextResponse(bytes, {
        headers: {
          "Content-Type": exported.contentType,
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return new NextResponse(exported.body as string, {
      headers: {
        "Content-Type": exported.contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "İndirme hatası";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
