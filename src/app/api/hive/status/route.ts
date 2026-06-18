import { NextResponse } from "next/server";
import { getHiveConfig } from "@/lib/hive/config";

export async function GET() {
  const config = getHiveConfig();
  return NextResponse.json({
    success: true,
    data: {
      enabled: config.enabled,
      salesActive: config.salesActive,
      proxyMode: config.proxyMode,
    },
  });
}
