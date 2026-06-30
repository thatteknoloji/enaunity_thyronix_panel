import { NextResponse } from "next/server";
import { Readable } from "stream";
import { consumeDigitalAccessToken, resolveDigitalAssetResponse } from "@/lib/products/digital-access";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { token } = await params;
    const result = await consumeDigitalAccessToken(token);
    if (!result.ok) {
      const messages = {
        NOT_FOUND: "Geçersiz dijital erişim linki",
        USED: "Bu erişim linki zaten kullanıldı",
        EXPIRED: "Erişim linkinin süresi doldu",
        REVOKED: "Bu dijital teslimat kapatıldı",
        LIMIT_REACHED: "İndirme limiti doldu",
      } as const;
      const statusByCode = {
        NOT_FOUND: 404,
        USED: 410,
        EXPIRED: 410,
        REVOKED: 403,
        LIMIT_REACHED: 403,
      } as const;
      return NextResponse.json(
        { success: false, error: messages[result.code], code: result.code },
        { status: statusByCode[result.code] },
      );
    }

    const target = await resolveDigitalAssetResponse(result.grant.assetUrl);
    if (!target) {
      return NextResponse.json({ success: false, error: "Dijital varlık bulunamadı" }, { status: 404 });
    }

    if (target.type === "redirect") {
      return NextResponse.redirect(new URL(target.location, _req.url));
    }

    const webStream = Readable.toWeb(target.stream) as ReadableStream;
    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${target.fileName}"`,
        "Content-Length": String(target.size),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dijital erişim açılamadı";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
