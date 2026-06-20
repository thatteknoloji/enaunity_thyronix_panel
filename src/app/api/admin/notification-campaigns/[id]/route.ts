import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendNotificationCampaign } from "@/lib/notifications/campaigns";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const campaign = await prisma.notificationCampaign.findUnique({
      where: { id },
      include: {
        deliveries: { orderBy: { createdAt: "desc" }, take: 200 },
        _count: { select: { deliveries: true, notifications: true } },
      },
    });
    if (!campaign) return NextResponse.json({ success: false, error: "Bulunamadı" }, { status: 404 });
    return NextResponse.json({ success: true, data: campaign });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    if (body.action === "send_now") {
      await sendNotificationCampaign(id);
      const data = await prisma.notificationCampaign.findUnique({ where: { id } });
      return NextResponse.json({ success: true, data });
    }

    if (body.action === "cancel") {
      await prisma.notificationCampaign.update({ where: { id }, data: { status: "cancelled" } });
      return NextResponse.json({ success: true });
    }

    const data: Record<string, unknown> = {};
    for (const key of ["title", "message", "emailSubject", "emailHtml", "channel", "audience", "link", "type"]) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.audienceFilter !== undefined) data.audienceFilterJson = JSON.stringify(body.audienceFilter);
    if (body.scheduledAt !== undefined) {
      data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
      data.status = body.scheduledAt ? "scheduled" : "draft";
    }

    const updated = await prisma.notificationCampaign.update({ where: { id }, data: data as any });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sunucu hatası";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const c = await prisma.notificationCampaign.findUnique({ where: { id } });
    if (!c || c.status === "sending") {
      return NextResponse.json({ success: false, error: "Silinemez" }, { status: 400 });
    }
    await prisma.notificationCampaign.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Hata" }, { status: 500 });
  }
}
