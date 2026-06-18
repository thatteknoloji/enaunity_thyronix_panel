import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encryptApiKey } from "@/lib/thyronix/ai-crypto";

export async function GET() {
  try {
    const providers = await prisma.thyronixAiProvider.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ success: true, data: providers.map(p => ({ ...p, apiKeyEncrypted: "••••••••" })) });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, provider, apiKey, endpoint, model, temperature, maxTokens, systemPrompt } = body;

    if (!name || !provider) return NextResponse.json({ error: "İsim ve provider zorunlu" }, { status: 400 });

    const data: any = {
      name, provider, model: model || "gpt-4o",
      temperature: temperature ?? 0.7, maxTokens: maxTokens || 4096,
      endpoint: endpoint || "", systemPrompt: systemPrompt || "",
      apiKeyEncrypted: apiKey ? encryptApiKey(apiKey) : "",
    };

    const created = await prisma.thyronixAiProvider.create({ data });
    return NextResponse.json({ success: true, data: { ...created, apiKeyEncrypted: "••••••••" } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Sunucu hatası" }, { status: 500 });
  }
}
