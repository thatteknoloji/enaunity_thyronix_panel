import { NextResponse } from "next/server";
import { runPendingImportJobs } from "@/lib/products/marketplace-import/import-worker";

export async function GET(req: Request) {
  try {
    const secret = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const result = await runPendingImportJobs(5);
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Worker hatası" },
      { status: 500 },
    );
  }
}
