import { NextResponse } from "next/server";
import { getPublicHomepageConfig } from "@/lib/homepage/service";

export async function GET() {
  try {
    const data = await getPublicHomepageConfig();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Yüklenemedi" }, { status: 500 });
  }
}
