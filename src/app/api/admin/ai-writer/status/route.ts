import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getProviderStatus } from "@/lib/ai-writer/ai-provider";
import { getWriterTelemetry } from "@/lib/ai-writer/writer-telemetry";

export async function GET() {
  try {
    await requireAdmin();
    const status = getProviderStatus();
    const telemetry = getWriterTelemetry();
    return NextResponse.json({
      success: true,
      data: {
        ...status,
        lastGeneration: telemetry.lastGenerationAt,
        lastError: telemetry.lastError,
        lastWordCount: telemetry.lastWordCount,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Durum alınamadı";
    const code = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status: code });
  }
}
