const MARKETPLACE_BOILERPLATE = [
  /kargo\s*(bedava|ücretsiz|ucretsiz).{0,80}/gi,
  /ücretsiz\s*kargo/gi,
  /hızlı\s*kargo/gi,
  /hizli\s*kargo/gi,
  /iade\s*(koşul|kosul|şart|sart|politik).{0,120}/gi,
  /değişim\s*(koşul|kosul|şart|sart).{0,120}/gi,
  /trendyol\s*(garanti|iade|kargo|güvencesiyle|guvencesiyle).{0,80}/gi,
  /trendyol\s*güvencesiyle/gi,
  /hepsiburada\s*(garanti|iade|kargo).{0,80}/gi,
  /n11\s*(garanti|iade|kargo).{0,80}/gi,
  /sipariş\s*ver.{0,40}gün\s*içinde/gi,
  /aynı\s*gün\s*kargo/gi,
  /hızlı\s*teslimat/gi,
  /hizli\s*teslimat/gi,
  /orijinal\s*ürün\s*garantisi/gi,
  /kampanya.{0,60}/gi,
  /indirim.{0,40}fırsat/gi,
  /sepete\s*ekle/gi,
  /taksit\s*imkanı/gi,
  /marketplace\s*banner/gi,
];

const HTML_TAG_RE = /<[^>]+>/g;
const MULTI_SPACE_RE = /\s{2,}/g;
const MULTI_NEWLINE_RE = /\n{3,}/g;

export function cleanProductDescription(raw: string): string {
  if (!raw) return "";

  let text = raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  text = text.replace(HTML_TAG_RE, " ");

  for (const pattern of MARKETPLACE_BOILERPLATE) {
    text = text.replace(pattern, " ");
  }

  text = text
    .replace(/\r\n/g, "\n")
    .replace(MULTI_SPACE_RE, " ")
    .replace(MULTI_NEWLINE_RE, "\n\n")
    .trim();

  return text;
}

export function analyzeDescription(
  raw: string,
  clean: string,
  opts?: { duplicateOf?: string }
): string[] {
  const warnings: string[] = [];
  if (!raw.trim()) warnings.push("Açıklama yok");
  else if (clean.length < 30) warnings.push("Açıklama çok kısa");
  if (raw.includes("<") && raw.includes(">")) warnings.push("HTML içerik temizlendi");
  if (opts?.duplicateOf) warnings.push("Kopya açıklama (başka satırla aynı)");
  return warnings;
}
