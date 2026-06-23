import { prisma } from "@/lib/db";
import { decryptApiKey } from "./ai-crypto";

interface AiCallParams {
  providerId: string;
  systemPrompt: string;
  userPrompt: string;
  task: string;
  productId?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json_object";
}

interface AiCallResult {
  success: boolean;
  content: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  cost: number;
  duration: number;
  model: string;
  error?: string;
}

const PROVIDER_ENDPOINTS: Record<string, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  claude: "https://api.anthropic.com/v1/messages",
  gemini: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
  deepseek: "https://api.deepseek.com/v1/chat/completions",
  grok: "https://api.x.ai/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  custom: "",
  ollama: "http://localhost:11434/api/generate",
};

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-turbo": { input: 10, output: 30 },
  "claude-3-opus": { input: 15, output: 75 },
  "claude-3-sonnet": { input: 3, output: 15 },
  "claude-3-haiku": { input: 0.25, output: 1.25 },
  "gemini-1.5-pro": { input: 3.5, output: 10.5 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
  "deepseek-chat": { input: 0.14, output: 0.28 },
  "grok-2": { input: 2, output: 10 },
  "grok-2-latest": { input: 2, output: 10 },
  "grok-beta": { input: 5, output: 15 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const p = MODEL_PRICING[model];
  if (!p) return 0.0001 * (promptTokens + completionTokens);
  return (promptTokens / 1_000_000) * p.input + (completionTokens / 1_000_000) * p.output;
}

async function logUsage(data: {
  providerId: string; task: string; productId: string; model: string;
  promptTokens: number; completionTokens: number; totalTokens: number;
  cost: number; duration: number; status: string; error: string;
}) {
  try {
    await prisma.thyronixAiUsage.create({ data });
    if (data.status === "success") {
      await prisma.thyronixAiProvider.update({
        where: { id: data.providerId },
        data: { totalTokens: { increment: data.totalTokens }, totalCost: { increment: data.cost } },
      });
    }
  } catch {}
}

async function callOpenAICompatible(endpoint: string, apiKey: string, model: string, systemPrompt: string, userPrompt: string, temp: number, maxTokens: number, responseFormat: string): Promise<AiCallResult> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: temp,
      max_tokens: maxTokens,
      ...(responseFormat === "json_object" ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  const json = await res.json();
  if (!res.ok) return { success: false, content: "", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, cost: 0, duration: 0, model, error: json.error?.message || `HTTP ${res.status}` };
  const content = json.choices?.[0]?.message?.content || "";
  const usage = json.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  return {
    success: true, content,
    usage: { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens },
    cost: estimateCost(model, usage.prompt_tokens, usage.completion_tokens),
    duration: 0, model,
  };
}

async function callClaude(endpoint: string, apiKey: string, model: string, systemPrompt: string, userPrompt: string, temp: number, maxTokens: number): Promise<AiCallResult> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: temp,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const json = await res.json();
  if (!res.ok) return { success: false, content: "", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, cost: 0, duration: 0, model, error: json.error?.message || `HTTP ${res.status}` };
  const content = json.content?.[0]?.text || "";
  const usage = json.usage || { input_tokens: 0, output_tokens: 0 };
  const totalTokens = usage.input_tokens + usage.output_tokens;
  return {
    success: true, content,
    usage: { promptTokens: usage.input_tokens, completionTokens: usage.output_tokens, totalTokens },
    cost: estimateCost(model, usage.input_tokens, usage.output_tokens),
    duration: 0, model,
  };
}

async function callGemini(endpoint: string, apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<AiCallResult> {
  const url = endpoint.replace("{model}", model) + "?key=" + apiKey;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] },
      ],
      generationConfig: { response_mime_type: "text/plain" },
    }),
  });
  const json = await res.json();
  if (!res.ok) return { success: false, content: "", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, cost: 0, duration: 0, model, error: json.error?.message || `HTTP ${res.status}` };
  const content = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const usage = json.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };
  return {
    success: true, content,
    usage: { promptTokens: usage.promptTokenCount, completionTokens: usage.candidatesTokenCount, totalTokens: usage.totalTokenCount },
    cost: estimateCost(model, usage.promptTokenCount, usage.candidatesTokenCount),
    duration: 0, model,
  };
}

async function callOllama(endpoint: string, _apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<AiCallResult> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: systemPrompt + "\n\n" + userPrompt,
      stream: false,
    }),
  });
  const json = await res.json();
  if (!res.ok) return { success: false, content: "", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, cost: 0, duration: 0, model, error: json.error || `HTTP ${res.status}` };
  return {
    success: true, content: json.response || "",
    usage: { promptTokens: json.prompt_eval_count || 0, completionTokens: json.eval_count || 0, totalTokens: (json.prompt_eval_count || 0) + (json.eval_count || 0) },
    cost: 0, duration: 0, model,
  };
}

export async function aiCall(params: AiCallParams): Promise<AiCallResult> {
  const start = Date.now();
  const provider = await prisma.thyronixAiProvider.findUnique({ where: { id: params.providerId } });
  if (!provider) return { success: false, content: "", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, cost: 0, duration: 0, model: "", error: "Provider bulunamadı" };
  if (provider.status !== "active") return { success: false, content: "", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, cost: 0, duration: 0, model: provider.model, error: "Provider aktif değil" };

  const apiKey = decryptApiKey(provider.apiKeyEncrypted);
  if (!apiKey && provider.provider !== "ollama") return { success: false, content: "", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, cost: 0, duration: 0, model: provider.model, error: "API anahtarı çözülemedi" };

  const sysPrompt = provider.systemPrompt || params.systemPrompt;
  const temp = params.temperature ?? provider.temperature;
  const maxTok = params.maxTokens || provider.maxTokens;
  const model = provider.model;
  const responseFormat = params.responseFormat || "text";
  let endpoint = provider.endpoint || PROVIDER_ENDPOINTS[provider.provider] || "";

  let result: AiCallResult;
  if (provider.provider === "claude") {
    result = await callClaude(endpoint, apiKey, model, sysPrompt, params.userPrompt, temp, maxTok);
  } else if (provider.provider === "gemini") {
    result = await callGemini(endpoint, apiKey, model, sysPrompt, params.userPrompt);
  } else if (provider.provider === "ollama") {
    result = await callOllama(endpoint, apiKey, model, sysPrompt, params.userPrompt);
  } else {
    result = await callOpenAICompatible(endpoint, apiKey, model, sysPrompt, params.userPrompt, temp, maxTok, responseFormat);
  }

  result.duration = Date.now() - start;

  await logUsage({
    providerId: provider.id, task: params.task, productId: params.productId || "",
    model, promptTokens: result.usage.promptTokens, completionTokens: result.usage.completionTokens,
    totalTokens: result.usage.totalTokens, cost: result.cost, duration: result.duration,
    status: result.success ? "success" : "error", error: result.error || "",
  });

  return result;
}

export async function aiCallBulk(params: AiCallParams & { products: { id: string; userPrompt: string }[] }): Promise<AiCallResult[]> {
  const results: AiCallResult[] = [];
  for (const p of params.products) {
    const r = await aiCall({ ...params, userPrompt: p.userPrompt, productId: p.id });
    results.push(r);
  }
  return results;
}
