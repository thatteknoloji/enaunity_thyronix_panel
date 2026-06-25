export async function readJsonResponse<T>(res: Response, label: string): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  const snippet = text.slice(0, 300).replace(/\s+/g, " ").trim();

  if (!res.ok) {
    throw new Error(`${label} ${res.status}: ${snippet || "Boş yanıt"}`);
  }

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(
      `${label}: JSON bekleniyordu ama "${contentType || "bilinmiyor"}" döndü. Yanıt: ${snippet || "Boş yanıt"}`
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${label}: JSON çözümlenemedi. Yanıt: ${snippet || "Boş yanıt"}`);
  }
}
