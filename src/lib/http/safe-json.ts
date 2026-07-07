export async function readSafeJson<T>(
  response: Response,
  fallbackLabel = "İstek"
): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  const snippet = text.slice(0, 300).replace(/\s+/g, " ").trim();

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(
      `${fallbackLabel}: JSON bekleniyordu ama ${contentType || "bilinmeyen içerik"} döndü. ${
        snippet ? `Yanıt: ${snippet}` : "Yanıt boş."
      }`
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${fallbackLabel}: JSON çözümlenemedi. ${snippet ? `Yanıt: ${snippet}` : "Yanıt boş."}`);
  }
}
