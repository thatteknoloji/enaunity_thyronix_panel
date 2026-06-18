import { NextResponse } from "next/server";
import { verifyApiKey, RateLimitError } from "@/lib/api-key-auth";

export async function POST(req: Request) {
  try {
    const result = await verifyApiKey(req);
    if (!result) {
      return NextResponse.json({ success: false, error: "Geçersiz API anahtarı" }, { status: 401 });
    }
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, error: "Rate limit aşıldı", retryAfter: err.retryAfter },
        { status: 429, headers: { "Retry-After": String(err.retryAfter) } }
      );
    }
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
