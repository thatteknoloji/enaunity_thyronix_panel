import { createHash } from "crypto";
import { DEFAULT_MODELS, MODEL_ENV_KEYS } from "./constants";
import type { AiProviderName, ProviderCallResult, ProviderStatus } from "./types";

export function resolveModelForProvider(provider: AiProviderName): string {
  const envKey = MODEL_ENV_KEYS[provider];
  const fromEnv = envKey ? process.env[envKey]?.trim() : "";
  return fromEnv || DEFAULT_MODELS[provider] || "";
}

const PROVIDER_ORDER: AiProviderName[] = ["OPENAI", "GEMINI", "ANTHROPIC", "OPENROUTER", "OLLAMA"];

function isConfigured(name: AiProviderName): boolean {
  switch (name) {
    case "OPENAI":
      return !!process.env.OPENAI_API_KEY?.trim();
    case "GEMINI":
      return !!process.env.GEMINI_API_KEY?.trim();
    case "ANTHROPIC":
      return !!process.env.ANTHROPIC_API_KEY?.trim();
    case "OPENROUTER":
      return !!process.env.OPENROUTER_API_KEY?.trim();
    case "OLLAMA":
      return !!process.env.OLLAMA_BASE_URL?.trim();
    default:
      return false;
  }
}

export function getConfiguredProviders(): AiProviderName[] {
  return PROVIDER_ORDER.filter(isConfigured);
}

export function resolveActiveProvider(): { provider: AiProviderName; model: string } | null {
  for (const provider of PROVIDER_ORDER) {
    if (isConfigured(provider)) {
      return { provider, model: resolveModelForProvider(provider) };
    }
  }
  return null;
}

export function getProviderStatus(): ProviderStatus {
  const configuredProviders = getConfiguredProviders();
  const active = resolveActiveProvider();
  return {
    configuredProviders,
    activeProvider: active?.provider ?? null,
    model: active?.model ?? null,
    ready: configuredProviders.length > 0,
  };
}

export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}

async function callOpenAI(system: string, user: string, model: string, apiKey: string): Promise<ProviderCallResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      max_tokens: 8192,
      response_format: { type: "json_object" },
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    return { success: false, content: "", provider: "OPENAI", model, error: json.error?.message || res.statusText };
  }
  const content = json.choices?.[0]?.message?.content || "";
  return {
    success: true,
    content,
    provider: "OPENAI",
    model,
    usage: {
      promptTokens: json.usage?.prompt_tokens ?? 0,
      completionTokens: json.usage?.completion_tokens ?? 0,
      totalTokens: json.usage?.total_tokens ?? 0,
    },
  };
}

async function callGemini(system: string, user: string, model: string, apiKey: string): Promise<ProviderCallResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${system}\n\n${user}` }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192, responseMimeType: "application/json" },
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    return { success: false, content: "", provider: "GEMINI", model, error: json.error?.message || res.statusText };
  }
  const content = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return { success: true, content, provider: "GEMINI", model };
}

async function callAnthropic(system: string, user: string, model: string, apiKey: string): Promise<ProviderCallResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    return { success: false, content: "", provider: "ANTHROPIC", model, error: json.error?.message || res.statusText };
  }
  const content = json.content?.[0]?.text || "";
  return { success: true, content, provider: "ANTHROPIC", model };
}

async function callOpenRouter(system: string, user: string, model: string, apiKey: string): Promise<ProviderCallResult> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://enaunity.com",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      max_tokens: 8192,
      response_format: { type: "json_object" },
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    return { success: false, content: "", provider: "OPENROUTER", model, error: json.error?.message || res.statusText };
  }
  const content = json.choices?.[0]?.message?.content || "";
  return { success: true, content, provider: "OPENROUTER", model };
}

async function callOllama(system: string, user: string, model: string, baseUrl: string): Promise<ProviderCallResult> {
  const endpoint = `${baseUrl.replace(/\/$/, "")}/api/chat`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      stream: false,
      format: "json",
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    return { success: false, content: "", provider: "OLLAMA", model, error: json.error || res.statusText };
  }
  const content = json.message?.content || "";
  return { success: true, content, provider: "OLLAMA", model };
}

export async function callAiProvider(systemPrompt: string, userPrompt: string): Promise<ProviderCallResult> {
  const active = resolveActiveProvider();
  if (!active) {
    return {
      success: false,
      content: "",
      provider: "OPENAI",
      model: "",
      error: "AI_PROVIDER_NOT_CONFIGURED",
    };
  }

  const { provider, model } = active;
  try {
    switch (provider) {
      case "OPENAI":
        return await callOpenAI(systemPrompt, userPrompt, model, process.env.OPENAI_API_KEY!);
      case "GEMINI":
        return await callGemini(systemPrompt, userPrompt, model, process.env.GEMINI_API_KEY!);
      case "ANTHROPIC":
        return await callAnthropic(systemPrompt, userPrompt, model, process.env.ANTHROPIC_API_KEY!);
      case "OPENROUTER":
        return await callOpenRouter(systemPrompt, userPrompt, model, process.env.OPENROUTER_API_KEY!);
      case "OLLAMA":
        return await callOllama(systemPrompt, userPrompt, model, process.env.OLLAMA_BASE_URL!);
      default:
        return { success: false, content: "", provider, model, error: "AI_PROVIDER_NOT_CONFIGURED" };
    }
  } catch (e) {
    return {
      success: false,
      content: "",
      provider,
      model,
      error: e instanceof Error ? e.message : "AI_PROVIDER_CALL_FAILED",
    };
  }
}

export { PROVIDER_ORDER };
