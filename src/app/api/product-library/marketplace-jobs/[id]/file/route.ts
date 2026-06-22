import { NextResponse } from "next/server";
import { requireAdmin, requireDealer } from "@/lib/auth";
import { loadMarketplaceJobFile } from "@/lib/product-library/marketplace-jobs";

type Params = { params: Promise<{ id: string }> };

function contentTypeForFile(fileName: string) {
  if (fileName.endsWith(".xml")) return "application/xml";
  if (fileName.endsWith(".csv")) return "text/csv; charset=utf-8";
  if (fileName.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "application/octet-stream";
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    let dealerId: string | undefined;

    try {
      const dealer = await requireDealer();
      dealerId = dealer.dealerId!;
    } catch {
      await requireAdmin();
    }

    const { job, file } = await loadMarketplaceJobFile(id, dealerId);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": contentTypeForFile(job.fileName),
        "Content-Disposition": `attachment; filename="${job.fileName || `${job.id}.dat`}"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Dosya indirilemedi";
    const status = msg === "Dosya bulunamadı" ? 404 : 401;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
