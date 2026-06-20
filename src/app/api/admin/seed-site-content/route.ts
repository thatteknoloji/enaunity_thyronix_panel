import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { seedSiteContent } from "@/lib/pages/seed-site-content";

/** POST — production'da SSH olmadan site içeriği seed (idempotent) */
export async function POST() {
  try {
    await requireAdmin();
    const result = await seedSiteContent();
    return NextResponse.json({ success: true, data: result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Seed failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
