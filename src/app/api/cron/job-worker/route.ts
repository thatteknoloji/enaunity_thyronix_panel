import { NextResponse } from "next/server";
import { runWorkerTick } from "@/lib/job-center/job-worker";

export async function GET(req: Request) {
  try {
    const secret = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await runWorkerTick();
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Worker hatası" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
