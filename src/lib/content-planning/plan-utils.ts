export function capitalizeKeyword(keyword: string): string {
  const trimmed = keyword.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toLocaleUpperCase("tr-TR") + trimmed.slice(1);
}

export function titleCaseTr(text: string): string {
  return text
    .split(/\s+/)
    .map((w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1).toLocaleLowerCase("tr-TR"))
    .join(" ");
}
