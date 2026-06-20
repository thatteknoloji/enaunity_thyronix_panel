const REQUEST_TIMEOUT_MS = 12_000;
const MAX_RETRIES = 2;
const BATCH_WORKERS = 5;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type MetaFetchResult = {
  url: string;
  title: string;
  description: string;
  image: string;
  favicon: string;
  site_name: string;
  text_content: string;
  error: string | null;
};

export type LinkCheckResult = {
  url: string;
  status: "ok" | "dead" | "error";
  statusCode: number | null;
  error: string | null;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function ogProp(html: string, name: string): string {
  const patterns = [
    new RegExp(`<meta[^>]*property=["']og:${name}["'][^>]*content=["'](.*?)["']`, "i"),
    new RegExp(`<meta[^>]*content=["'](.*?)["'][^>]*property=["']og:${name}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

function parseMetaSimple(html: string, maxTextLength = 800): Omit<MetaFetchResult, "url" | "error"> {
  let title = "";
  let description = "";
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
  const ogTitle = ogProp(html, "title");
  if (ogTitle) title = ogTitle;

  const descMatch =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i) ||
    html.match(/<meta[^>]*content=["'](.*?)["'][^>]*name=["']description["']/i);
  if (descMatch?.[1]) description = descMatch[1].trim();
  const ogDesc = ogProp(html, "description");
  if (ogDesc) description = ogDesc;

  const image = ogProp(html, "image");
  const site_name = ogProp(html, "site_name");

  let favicon = "";
  const iconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["'](.*?)["']/i);
  if (iconMatch?.[1]) favicon = iconMatch[1].trim();

  let text_content = "";
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    let body = bodyMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const parts = body.split(". ").filter((p) => p.trim().length > 20);
    text_content = parts.join(". ").slice(0, maxTextLength);
  }

  return {
    title: title.slice(0, 200),
    description: description.slice(0, 500),
    image: image.slice(0, 500),
    favicon: favicon.slice(0, 500),
    site_name: site_name.slice(0, 100),
    text_content,
  };
}

export async function fetchSingleMeta(url: string, maxTextLength = 800): Promise<MetaFetchResult> {
  let lastError = "unknown";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        redirect: "follow",
      });

      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        if (attempt < MAX_RETRIES) {
          await sleep(1000);
          continue;
        }
        return {
          url,
          title: "",
          description: "",
          image: "",
          favicon: "",
          site_name: "",
          text_content: "",
          error: lastError,
        };
      }

      const html = await res.text();
      const meta = parseMetaSimple(html, maxTextLength);
      return { url, ...meta, error: null };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "fetch_error";
      if (attempt < MAX_RETRIES) await sleep(1500);
    }
  }

  return {
    url,
    title: "",
    description: "",
    image: "",
    favicon: "",
    site_name: "",
    text_content: "",
    error: lastError,
  };
}

export async function fetchBatchMeta(urls: string[]): Promise<MetaFetchResult[]> {
  const results: MetaFetchResult[] = new Array(urls.length);
  let idx = 0;

  async function worker() {
    while (idx < urls.length) {
      const i = idx++;
      results[i] = await fetchSingleMeta(urls[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(BATCH_WORKERS, urls.length || 1) }, () => worker()));
  return results;
}

export async function checkSingleLink(url: string): Promise<LinkCheckResult> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    });
    return {
      url,
      status: res.status < 400 ? "ok" : "dead",
      statusCode: res.status,
      error: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    return { url, status: msg.includes("timeout") ? "error" : "dead", statusCode: null, error: msg };
  }
}

export async function checkLinks(urls: string[]): Promise<LinkCheckResult[]> {
  return Promise.all(urls.map((url) => checkSingleLink(url)));
}
