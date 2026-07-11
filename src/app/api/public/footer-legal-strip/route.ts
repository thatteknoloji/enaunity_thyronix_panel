import { NextResponse } from "next/server";
import { listActiveLegalStripItems } from "@/lib/footer-legal-strip";

export async function GET() {
  try {
    const data = await listActiveLegalStripItems();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
