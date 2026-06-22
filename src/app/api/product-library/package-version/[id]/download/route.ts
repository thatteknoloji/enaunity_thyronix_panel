import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readPackageSourceFile } from "@/lib/product-library/source-storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const version = await prisma.productPackageVersion.findUnique({ where: { id } });
    if (!version) {
      return NextResponse.json({ success: false, error: "Versiyon bulunamadı" }, { status: 404 });
    }
    if (!version.sourcePath) {
      return NextResponse.json({ success: false, error: "Kaynak dosya saklanmamış" }, { status: 404 });
    }

    const buffer = await readPackageSourceFile(version.sourcePath);
    const fileName = version.sourceName || `${version.id}.${version.sourceType.toLowerCase()}`;
    const contentType =
      version.sourceType === "XML"
        ? "application/xml"
        : version.sourceType === "CSV"
          ? "text/csv; charset=utf-8"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Kaynak indirilemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
