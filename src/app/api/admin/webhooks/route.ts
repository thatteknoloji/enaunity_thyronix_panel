import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
    }

    const webhooks = await prisma.webhookEndpoint.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: webhooks });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { name, url, events, secret } = await req.json();

    if (!name || !url || !events?.length) {
      return NextResponse.json({ success: false, error: "Gerekli alanları doldurun" }, { status: 400 });
    }

    const webhook = await prisma.webhookEndpoint.create({
      data: { name, url, events: JSON.stringify(events), secret: secret || "" },
    });

    return NextResponse.json({ success: true, data: webhook });
  } catch {
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
