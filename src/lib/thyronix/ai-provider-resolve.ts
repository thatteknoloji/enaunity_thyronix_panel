import { prisma } from "@/lib/db";
import { encryptApiKey } from "./ai-crypto";

export type WorkspaceAiProviderInput = {
  name: string;
  provider: string;
  apiKey?: string;
  endpoint?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
};

export type WorkspaceAiProviderView = {
  configured: boolean;
  id: string | null;
  name: string;
  provider: string;
  model: string;
  endpoint: string;
  temperature: number;
  maxTokens: number;
  hasApiKey: boolean;
  status: string;
};

export async function getDealerAiProviderView(dealerId: string): Promise<WorkspaceAiProviderView> {
  const row = await prisma.thyronixAiProvider.findFirst({
    where: { dealerId, status: { not: "disabled" } },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });

  if (!row) {
    return {
      configured: false,
      id: null,
      name: "",
      provider: "openai",
      model: "gpt-4o",
      endpoint: "",
      temperature: 0.7,
      maxTokens: 4096,
      hasApiKey: false,
      status: "disabled",
    };
  }

  return {
    configured: !!row.apiKeyEncrypted,
    id: row.id,
    name: row.name,
    provider: row.provider,
    model: row.model,
    endpoint: row.endpoint,
    temperature: row.temperature,
    maxTokens: row.maxTokens,
    hasApiKey: !!row.apiKeyEncrypted,
    status: row.status,
  };
}

export async function upsertDealerAiProvider(dealerId: string, input: WorkspaceAiProviderInput) {
  const existing = await prisma.thyronixAiProvider.findFirst({
    where: { dealerId },
    orderBy: { updatedAt: "desc" },
  });

  const data = {
    name: input.name || "Benim AI Sağlayıcım",
    provider: input.provider,
    model: input.model,
    endpoint: input.endpoint || "",
    temperature: input.temperature ?? 0.7,
    maxTokens: input.maxTokens ?? 4096,
    systemPrompt: input.systemPrompt || "",
    dealerId,
    isDefault: true,
    status: "active" as const,
    ...(input.apiKey ? { apiKeyEncrypted: encryptApiKey(input.apiKey) } : {}),
  };

  if (existing) {
    return prisma.thyronixAiProvider.update({ where: { id: existing.id }, data });
  }

  if (!input.apiKey) {
    throw new Error("İlk kurulumda API anahtarı zorunlu");
  }

  return prisma.thyronixAiProvider.create({ data: { ...data, apiKeyEncrypted: encryptApiKey(input.apiKey) } });
}

/** Çözüm önceliği: explicit id → bayi sağlayıcısı → platform varsayılanı */
export async function resolveAiProviderId(opts: {
  providerId?: string | null;
  dealerId?: string | null;
}): Promise<string | null> {
  if (opts.providerId) {
    const explicit = await prisma.thyronixAiProvider.findUnique({ where: { id: opts.providerId } });
    if (explicit?.status === "active") return explicit.id;
  }

  if (opts.dealerId) {
    const dealerProvider = await prisma.thyronixAiProvider.findFirst({
      where: { dealerId: opts.dealerId, status: "active", apiKeyEncrypted: { not: "" } },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
    if (dealerProvider) return dealerProvider.id;
  }

  const platformDefault = await prisma.thyronixAiProvider.findFirst({
    where: { dealerId: null, status: "active", isDefault: true },
    orderBy: { updatedAt: "desc" },
  });
  if (platformDefault) return platformDefault.id;

  const anyPlatform = await prisma.thyronixAiProvider.findFirst({
    where: { dealerId: null, status: "active", apiKeyEncrypted: { not: "" } },
    orderBy: { updatedAt: "desc" },
  });
  return anyPlatform?.id || null;
}
