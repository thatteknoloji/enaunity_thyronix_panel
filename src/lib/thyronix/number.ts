export function parseThyronixNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  let text = String(value)
    .trim()
    .replace(/[₺$€£]/g, "")
    .replace(/\b(TL|TRY|USD|EUR|GBP)\b/gi, "")
    .replace(/%/g, "")
    .replace(/\s+/g, "")
    .replace(/"|'/g, "");

  text = text.replace(/[^0-9,.-]/g, "");
  if (!text || text === "-" || text === "," || text === ".") return null;

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    const decimals = text.length - lastComma - 1;
    text = decimals > 0 && decimals <= 2 ? text.replace(",", ".") : text.replace(/,/g, "");
  } else if (lastDot >= 0) {
    const decimals = text.length - lastDot - 1;
    const dotCount = (text.match(/\./g) || []).length;
    if (dotCount > 1 || decimals > 2) {
      text = text.replace(/\./g, "");
    }
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export function roundToStep(value: number, step?: number | null): number {
  const normalizedStep = typeof step === "number" && step > 0 ? step : 0;
  if (!normalizedStep) return value;
  return Math.round(value / normalizedStep) * normalizedStep;
}
