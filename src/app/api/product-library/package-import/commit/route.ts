import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { commitPackageSourceImport } from "@/lib/product-library/package-import";

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const form = await req.formData();
    const sourceType = String(form.get("sourceType") || "").toUpperCase();
    const xmlUrl = String(form.get("xmlUrl") || "").trim();
    const file = form.get("file") as File | null;
    const mappingRaw = String(form.get("mapping") || "{}");
    let mapping = {};
    try {
      mapping = JSON.parse(mappingRaw);
    } catch {}

    const common = {
      packageMode: String(form.get("packageMode") || "NEW").toUpperCase() as "NEW" | "EXISTING",
      packageId: String(form.get("packageId") || ""),
      packageName: String(form.get("packageName") || ""),
      description: String(form.get("description") || ""),
      catalogId: String(form.get("catalogId") || ""),
      catalogName: String(form.get("catalogName") || ""),
      licenseLevel: String(form.get("licenseLevel") || "FREE"),
      billingType: String(form.get("billingType") || "FREE"),
      isFree: String(form.get("isFree") || "true") === "true",
      oneTimePrice: Number(form.get("oneTimePrice") || 0) || 0,
      monthlyPrice: Number(form.get("monthlyPrice") || 0) || 0,
      yearlyPrice: Number(form.get("yearlyPrice") || 0) || 0,
      badgeText: String(form.get("badgeText") || ""),
      status: String(form.get("status") || "ACTIVE"),
      exportFormats: String(form.get("exportFormats") || "EXCEL,XML,CSV").split(",").map((item) => item.trim()).filter(Boolean),
      createdBy: user.email,
    };

    if (sourceType === "XML" && xmlUrl) {
      const data = await commitPackageSourceImport({
        sourceType: "XML",
        xmlUrl,
        ...common,
      });
      return NextResponse.json({ success: true, data });
    }

    if (!file) {
      return NextResponse.json({ success: false, error: "Dosya zorunlu" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = sourceType || (file.name.toLowerCase().endsWith(".xml") ? "XML" : file.name.toLowerCase().endsWith(".csv") ? "CSV" : "EXCEL");
    const data =
      detected === "XML"
        ? await commitPackageSourceImport({
            sourceType: "XML",
            fileName: file.name,
            buffer,
            ...common,
          })
        : await commitPackageSourceImport({
            sourceType: detected as "EXCEL" | "CSV",
            fileName: file.name,
            buffer,
            mapping,
            ...common,
          });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Paket oluşturulamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
