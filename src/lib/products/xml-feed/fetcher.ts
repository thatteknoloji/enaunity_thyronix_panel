export async function fetchXmlFeed(url: string, timeoutMs = 120_000): Promise<string> {
  const urls = [url];
  try {
    const parsed = new URL(url);
    if (parsed.hostname.startsWith("www.")) {
      const alt = new URL(url);
      alt.hostname = alt.hostname.replace(/^www\./i, "");
      urls.push(alt.toString());
    } else {
      const alt = new URL(url);
      alt.hostname = `www.${alt.hostname}`;
      urls.push(alt.toString());
    }
  } catch {
    /* keep single url */
  }

  let lastError = "Fetch failed";
  for (const target of [...new Set(urls)]) {
    try {
      const res = await fetch(target, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: "application/xml,text/xml,*/*" },
      });
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        continue;
      }
      const text = await res.text();
      if (!text.trim()) {
        lastError = "Empty response";
        continue;
      }
      if (text.trim().startsWith("<!DOCTYPE") || text.includes("SAYFA BULUNAMADI")) {
        lastError = "HTML response (not XML)";
        continue;
      }
      return text;
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Fetch error";
    }
  }
  throw new Error(lastError);
}
