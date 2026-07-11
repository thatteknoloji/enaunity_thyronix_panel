import { prisma } from "@/lib/db";
import { parseFixedValues } from "./feed-fetch";
import { parseThyronixNumber } from "./number";

export function sourceHasConfiguredVat(fixedValues: Record<string, string>): boolean {
  return Boolean(String(fixedValues.vatRate || fixedValues.vatRateOverride || "").trim());
}

export function detectVatInParsedProducts(products: Array<{ vatRate?: number | null }>): boolean {
  return products.some((product) => product.vatRate !== null && product.vatRate !== undefined);
}

export async function updateSourceVatFieldDetection(
  sourceId: string,
  parsedProducts: Array<{ vatRate?: number | null }>,
  currentFixed: Record<string, string>,
) {
  const hasVatInXml = detectVatInParsedProducts(parsedProducts);
  const nextFixed = {
    ...currentFixed,
    vatFieldDetected: hasVatInXml ? "yes" : "no",
    vatUserConfigured: sourceHasConfiguredVat(currentFixed) ? "yes" : "no",
  };

  await prisma.thyronixSource.update({
    where: { id: sourceId },
    data: { fixedValues: JSON.stringify(nextFixed) },
  });

  return nextFixed;
}

export async function loadSourceVatDefaults(sourceIds: string[]): Promise<Map<string, number>> {
  if (!sourceIds.length) return new Map();
  const sources = await prisma.thyronixSource.findMany({
    where: { id: { in: sourceIds } },
    select: { id: true, fixedValues: true },
  });
  const map = new Map<string, number>();
  for (const source of sources) {
    const fixed = parseFixedValues(source.fixedValues);
    const vat = parseThyronixNumber(fixed.vatRateOverride ?? fixed.vatRate);
    if (typeof vat === "number") map.set(source.id, vat);
  }
  return map;
}
