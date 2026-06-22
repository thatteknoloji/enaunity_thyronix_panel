import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireThyronixDealerOrAdmin } from "@/lib/thyronix/access";
import { resolveDealerId } from "@/lib/thyronix/workspace";
import { resolveAiProviderId } from "@/lib/thyronix/ai-provider-resolve";

export async function GET() {
  try {
    await requireThyronixDealerOrAdmin();
    const jobs = await prisma.thyronixAiJob.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ success: true, data: jobs });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const body = await req.json();
    const { name, taskType, totalProducts, estimatedTokens, estimatedCost, providerId, model, filterQuery } = body;

    if (!name || !taskType) return NextResponse.json({ error: "İsim ve görev tipi zorunlu" }, { status: 400 });

    const dealerId = await resolveDealerId(user);
    const resolvedProviderId = await resolveAiProviderId({ providerId, dealerId });
    if (!resolvedProviderId) {
      return NextResponse.json({
        error: "AI sağlayıcı tanımlı değil — Ayarlar → Yapay Zeka API",
      }, { status: 400 });
    }

    const provider = await prisma.thyronixAiProvider.findUnique({ where: { id: resolvedProviderId } });

    const job = await prisma.thyronixAiJob.create({
      data: {
        name, taskType, status: "pending",
        totalProducts: totalProducts || 0,
        estimatedTokens: estimatedTokens || 0,
        estimatedCost: estimatedCost || 0,
        providerId: resolvedProviderId,
        model: model || provider?.model || "",
        filterQuery: filterQuery || "",
      },
    });

    return NextResponse.json({ success: true, data: job });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Sunucu hatası" }, { status: 500 });
  }
}
