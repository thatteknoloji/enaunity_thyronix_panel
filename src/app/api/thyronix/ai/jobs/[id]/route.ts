import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireThyronixAdmin } from "@/lib/thyronix/access";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireThyronixAdmin();
    const { id } = await params;
    const body = await req.json();
    const { action } = body; // pause, resume, cancel, retry_failed

    const job = await prisma.thyronixAiJob.findUnique({ where: { id } });
    if (!job) return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 });

    const data: any = {};

    if (action === "pause") {
      if (job.status !== "running") return NextResponse.json({ error: "Sadece çalışan görevler duraklatılabilir" }, { status: 400 });
      data.status = "paused";
    } else if (action === "resume") {
      if (job.status !== "paused") return NextResponse.json({ error: "Sadece duraklatılmış görevler devam ettirilebilir" }, { status: 400 });
      data.status = "running";
    } else if (action === "cancel") {
      data.status = "cancelled";
      data.completedAt = new Date();
    } else if (action === "retry_failed") {
      if (job.status !== "failed" && job.status !== "completed") return NextResponse.json({ error: "Sadece tamamlanmış veya başarısız görevlerde denenebilir" }, { status: 400 });
      data.status = "running";
      data.failedCount = 0;
    }

    const updated = await prisma.thyronixAiJob.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireThyronixAdmin();
    const { id } = await params;
    await prisma.thyronixAiJob.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
