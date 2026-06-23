export type PageFactoryApiResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
};

export class PageFactoryApiError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly status: number,
    public readonly bodyPreview: string,
    public readonly isHtml: boolean
  ) {
    super(message);
    this.name = "PageFactoryApiError";
  }
}

function isHtmlBody(text: string): boolean {
  const t = text.trimStart().toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html");
}

/**
 * Page Factory / Product Universe API fetch — HTML veya bozuk JSON yerine anlamlı hata verir.
 */
export async function fetchPageFactoryJson<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<PageFactoryApiResult<T>> {
  const r = await fetch(url, init);
  const text = await r.text();

  if (isHtmlBody(text)) {
    const preview = text.slice(0, 400).replace(/\s+/g, " ");
    console.error("[PageFactory API] HTML yanıt (JSON bekleniyordu)", {
      url,
      status: r.status,
      preview,
    });
    throw new PageFactoryApiError(
      `API HTML döndü (${r.status}): ${url}`,
      url,
      r.status,
      preview,
      true
    );
  }

  if (!text.trim()) {
    if (!r.ok) {
      throw new PageFactoryApiError(
        `Boş hata yanıtı (${r.status}): ${url}`,
        url,
        r.status,
        "",
        false
      );
    }
    return { success: true } as PageFactoryApiResult<T>;
  }

  try {
    const parsed = JSON.parse(text) as PageFactoryApiResult<T>;
    if (!r.ok && parsed.success !== false) {
      return { success: false, error: parsed.error || `HTTP ${r.status}` };
    }
    return parsed;
  } catch {
    const preview = text.slice(0, 200);
    console.error("[PageFactory API] Geçersiz JSON", { url, status: r.status, preview });
    throw new PageFactoryApiError(
      `Geçersiz JSON (${r.status}): ${url}`,
      url,
      r.status,
      preview,
      false
    );
  }
}
