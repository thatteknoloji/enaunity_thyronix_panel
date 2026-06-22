import { NextResponse } from "next/server";
import { requireThyronixDealerOrAdmin, thyronixErrorResponse } from "@/lib/thyronix/access";
import { resolveDealerId } from "@/lib/thyronix/workspace";
import {
  getDealerAiProviderView,
  upsertDealerAiProvider,
} from "@/lib/thyronix/ai-provider-resolve";
import { aiCall } from "@/lib/thyronix/ai-service";

export async function GET() {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const dealerId = await resolveDealerId(user);
    if (!dealerId) {
      return NextResponse.json({
        success: true,
        data: { configured: false, isAdmin: true, message: "Admin: /thyronix/ai → Sağlayıcılar kullanın" },
      });
    }
    const data = await getDealerAiProviderView(dealerId);
    return NextResponse.json({ success: true, data: { ...data, isAdmin: false } });
  } catch (e) {
    return thyronixErrorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireThyronixDealerOrAdmin();
    const dealerId = await resolveDealerId(user);
    if (!dealerId) {
      return NextResponse.json({ success: false, error: "Admin sağlayıcıları /thyronix/ai üzerinden yönetilir" }, { status: 400 });
    }

    const body = await req.json();
    const saved = await upsertDealerAiProvider(dealerId, {
      name: body.name || "Benim AI Sağlayıcım",
      provider: body.provider || "openai",
      apiKey: body.apiKey,
      endpoint: body.endpoint,
      model: body.model || "gpt-4o",
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      systemPrompt: body.systemPrompt,
    });

    if (body.testConnection) {
      const test = await aiCall({
        providerId: saved.id,
        task: "test_connection",
        systemPrompt: "You are a helpful assistant.",
        userPrompt: "Reply with exactly: OK",
        maxTokens: 16,
      });
      if (!test.success) {
        return NextResponse.json({ success: false, error: test.error || "Bağlantı testi başarısız" }, { status: 400 });
      }
    }

    const view = await getDealerAiProviderView(dealerId);
    return NextResponse.json({ success: true, data: view });
  } catch (e) {
    return thyronixErrorResponse(e, e instanceof Error ? e.message : "Kayıt başarısız");
  }
}
