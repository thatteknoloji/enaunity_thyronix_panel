const MARKETPLACE_BOILERPLATE = [
  /kargo\s*(bedava|ücretsiz|ucretsiz).{0,80}/gi,
  /ücretsiz\s*kargo/gi,
  /iade\s*(koşul|kosul|şart|sart|politik).{0,120}/gi,
  /değişim\s*(koşul|kosul|şart|sart).{0,120}/gi,
  /trendyol\s*(garanti|iade|kargo).{0,80}/gi,
  /hepsiburada\s*(garanti|iade|kargo).{0,80}/gi,
  /n11\s*(garanti|iade|kargo).{0,80}/gi,
  /sipariş\s*ver.{0,40}gün\s*içinde/gi,
  /aynı\s*gün\s*kargo/gi,
  /hızlı\s*teslimat/gi,
  /orijinal\s*ürün\s*garantisi/gi,
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
