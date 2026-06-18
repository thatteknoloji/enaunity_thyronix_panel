import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const where = user.dealerId ? { dealerId: user.dealerId } : { userId: user.id };
  const intervalMs = user.dealerId ? 5000 : 3000;

  let interval: ReturnType<typeof setInterval> | null = null;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let lastCheck = new Date();

      const sendUnread = async () => {
        try {
          const notifications = await prisma.notification.findMany({
            where: { ...where, read: false, createdAt: { gte: lastCheck } },
            orderBy: { createdAt: "desc" },
            take: 5,
          });
          lastCheck = new Date();
          if (notifications.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(notifications)}\n\n`));
          }
        } catch {
          // controller kapalıysa sessizce geç
        }
      };

      sendUnread();

      interval = setInterval(() => { sendUnread(); }, intervalMs);

      timeout = setTimeout(() => {
        cleanup();
        try { controller.close(); } catch {}
      }, 600000);
    },
  });

  const cleanup = () => {
    if (interval) { clearInterval(interval); interval = null; }
    if (timeout) { clearTimeout(timeout); timeout = null; }
  };

  request.signal.addEventListener("abort", cleanup);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
