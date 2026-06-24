import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  approveBatch,
  approveContent,
  archiveBatch,
  archiveContent,
  enrichQueueItems,
  listQueue,
  publishBatch,
  publishNow,
  queueContent,
  queueGeoContents,
  queuePlan,
  rejectBatch,
  rejectContent,
  scheduleBatch,
  schedulePublish,
} from "@/lib/publishing-center/publishing-service";
import type { PublishingContentType, PublishingQueueStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const contentType = searchParams.get("contentType") as PublishingContentType | null;
    const status = searchParams.get("status") as PublishingQueueStatus | null;
    const items = await listQueue({
      contentType: contentType || undefined,
      status: status || undefined,
      limit: 200,
    });
    const enriched = await enrichQueueItems(items);
    return NextResponse.json({ success: true, data: { items: enriched } });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const action = body.action || "queue";

    switch (action) {
      case "queue":
        return NextResponse.json({
          success: true,
          data: await queueContent({
            contentType: body.contentType,
            contentId: body.contentId,
            sourcePlanId: body.sourcePlanId,
            publishMode: body.publishMode,
            priority: body.priority,
            scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
            metadata: body.metadata,
          }),
        });
      case "queuePlan":
        return NextResponse.json({
          success: true,
          data: await queuePlan(body.planId, {
            publishMode: body.publishMode,
            priority: body.priority,
          }),
        });
      case "queueGeo":
        return NextResponse.json({
          success: true,
          data: await queueGeoContents({
            keyword: body.keyword,
            province: body.province,
            district: body.district,
            publishMode: body.publishMode,
            sourcePlanId: body.sourcePlanId,
          }),
        });
      case "approve":
        return NextResponse.json({ success: true, data: await approveContent(body.queueId) });
      case "reject":
        return NextResponse.json({
          success: true,
          data: await rejectContent(body.queueId, body.reason),
        });
      case "publish":
        return NextResponse.json({ success: true, data: await publishNow(body.queueId) });
      case "schedule":
        return NextResponse.json({
          success: true,
          data: await schedulePublish(body.queueId, new Date(body.scheduledAt)),
        });
      case "archive":
        return NextResponse.json({ success: true, data: await archiveContent(body.queueId) });
      case "publishBatch":
        return NextResponse.json({
          success: true,
          data: await publishBatch(body.queueIds || []),
        });
      case "archiveBatch":
        return NextResponse.json({
          success: true,
          data: await archiveBatch(body.queueIds || []),
        });
      case "approveBatch":
        return NextResponse.json({
          success: true,
          data: await approveBatch(body.queueIds || []),
        });
      case "rejectBatch":
        return NextResponse.json({
          success: true,
          data: await rejectBatch(body.queueIds || [], body.reason),
        });
      case "scheduleBatch":
        return NextResponse.json({
          success: true,
          data: await scheduleBatch(body.queueIds || [], new Date(body.scheduledAt)),
        });
      default:
        return NextResponse.json({ success: false, error: "Geçersiz aksiyon" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "İşlem başarısız";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
