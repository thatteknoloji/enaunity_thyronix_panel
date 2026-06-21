import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/site-settings/service";

export async function GET() {
  try {
    const data = await getSiteSettings();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
