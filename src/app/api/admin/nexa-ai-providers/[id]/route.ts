import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encryptApiKey, decryptApiKey } from "@/lib/thyronix/ai-crypto";
import { aiCall } from "@/lib/thyronix/ai-service";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, provider, apiKey, endpoint, model, temperature, maxTokens, systemPrompt } = body;

    const data: any = { name, provider };
    if (model) data.model = model;
    if (temperature !== undefined) data.temperature = temperature;
    if (maxTokens !== undefined) data.maxTokens = maxTokens;
    if (endpoint !== undefined) data.endpoint = endpoint;
    if (systemPrompt !== undefined) data.systemPrompt = systemPrompt;
    if (apiKey) data.apiKeyEncrypted = encryptApiKey(apiKey);

    const updated = await prisma.thyronixAiProvider.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: { ...updated, apiKeyEncrypted: "••••••••" } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.thyronixAiUsage.deleteMany({ where: { providerId: id } });
    await prisma.thyronixAiProvider.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const provider = await prisma.thyronixAiProvider.findUnique({ where: { id } });
    if (!provider) return NextResponse.json({ error: "Provider bulunamadı" }, { status: 404 });

    const apiKey = decryptApiKey(provider.apiKeyEncrypted);
    if (!apiKey && provider.provider !== "ollama") {
      return NextResponse.json({ success: false, error: "API anahtarı eksik" });
    }

    const result = await aiCall({
      providerId: id,
      systemPrompt: "You are a helpful assistant.",
      userPrompt: "Say 'THYRONIX AI connection successful' in Turkish.",
      task: "test_connection",
      maxTokens: 50,
    });

    if (result.success) {
      await prisma.thyronixAiProvider.update({
        where: { id },
        data: { status: "active", lastTested: new Date(), testResult: "OK" },
      });
    } else {
      await prisma.thyronixAiProvider.update({
        where: { id },
        data: { status: "error", lastTested: new Date(), testResult: result.error || "Failed" },
      });
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || "Sunucu hatası" });
  }
}
