import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendNotificationCampaign } from "@/lib/notifications/campaigns";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const status = new URL(req.url).searchParams.get("status");
    const campaigns = await prisma.notificationCampaign.findMany({
      where: status && status !== "all" ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ success: true, data: campaigns });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();

    const title = String(body.title || "").trim();
    const message = String(body.message || "").trim();
    if (!title || !message) {
      return NextResponse.json({ success: false, error: "Başlık ve mesaj gerekli" }, { status: 400 });
    }

    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    const sendNow = body.sendNow === true;

    const campaign = await prisma.notificationCampaign.create({
      data: {
        title,
        message,
        emailSubject: String(body.emailSubject || title),
        emailHtml: String(body.emailHtml || ""),
        channel: body.channel || "panel_and_email",
        audience: body.audience || "all",
        audienceFilterJson: JSON.stringify(body.audienceFilter || {}),
        link: String(body.link || ""),
        type: body.type || "announcement",
        status: sendNow ? "sending" : scheduledAt ? "scheduled" : "draft",
        scheduledAt: scheduledAt || null,
        timezone: "Europe/Istanbul",
        createdById: admin.id,
        createdByName: admin.name,
      },
    });

    if (sendNow) {
      await sendNotificationCampaign(campaign.id);
    }

    const fresh = await prisma.notificationCampaign.findUnique({ where: { id: campaign.id } });
    return NextResponse.json({ success: true, data: fresh });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sunucu hatası";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
