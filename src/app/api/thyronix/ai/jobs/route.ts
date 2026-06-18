import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

import { requireThyronixAdmin } from "@/lib/thyronix/access";

export async function GET() {
  try {
    await requireThyronixAdmin();
    const jobs = await prisma.thyronixAiJob.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ success: true, data: jobs });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireThyronixAdmin();
    const body = await req.json();
    const { name, taskType, totalProducts, estimatedTokens, estimatedCost, providerId, model, filterQuery } = body;

    if (!name || !taskType) return NextResponse.json({ error: "İsim ve görev tipi zorunlu" }, { status: 400 });

    const job = await prisma.thyronixAiJob.create({
      data: {
        name, taskType, status: "pending",
        totalProducts: totalProducts || 0,
        estimatedTokens: estimatedTokens || 0,
        estimatedCost: estimatedCost || 0,
        providerId: providerId || "",
        model: model || "",
        filterQuery: filterQuery || "",
      },
    });

    return NextResponse.json({ success: true, data: job });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Sunucu hatası" }, { status: 500 });
  }
}
