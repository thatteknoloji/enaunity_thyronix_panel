import { NextResponse } from "next/server";
import { runPaymentDeadlineJobs } from "@/lib/payments/payment-deadline-worker";
import { runThyronixBulkJob } from "@/lib/thyronix/bulk-job-worker";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const secret = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const paymentResult = await runPaymentDeadlineJobs();

    const pendingJobs = await prisma.thyronixBulkJob.findMany({
      where: { status: { in: ["pending", "running"] } },
      take: 5,
    });
    const bulkResults = [];
    for (const job of pendingJobs) {
      bulkResults.push(await runThyronixBulkJob(job.id, 5));
    }

    return NextResponse.json({ success: true, data: { payments: paymentResult, bulkJobs: bulkResults.length } });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Cron hatası" },
      { status: 500 },
    );
  }
}
