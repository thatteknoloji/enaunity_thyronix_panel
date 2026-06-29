export interface VatLineInput {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  vatIncluded: boolean;
}

export interface VatLineBreakdown {
  id?: string;
  name: string;
  quantity: number;
  vatRate: number;
  vatIncluded: boolean;
  unitPrice: number;
  lineNet: number;
  lineVat: number;
  lineGross: number;
}

export interface VatAggregate {
  lines: VatLineBreakdown[];
  subtotalNet: number;
  totalVat: number;
  totalGross: number;
  byRate: Array<{ vatRate: number; net: number; vat: number; gross: number }>;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function computeLineVat(input: VatLineInput): VatLineBreakdown {
  const qty = Math.max(1, input.quantity);
  const unitPrice = Math.max(0, input.unitPrice);
  const rate = Math.max(0, input.vatRate);
  const lineBase = unitPrice * qty;

  if (input.vatIncluded) {
    const lineGross = round2(lineBase);
    const lineNet = rate > 0 ? round2(lineGross / (1 + rate / 100)) : lineGross;
    const lineVat = round2(lineGross - lineNet);
    return {
      id: input.id,
      name: input.name,
      quantity: qty,
      vatRate: rate,
      vatIncluded: true,
      unitPrice,
      lineNet,
      lineVat,
      lineGross,
    };
  }

  const lineNet = round2(lineBase);
  const lineVat = rate > 0 ? round2(lineNet * (rate / 100)) : 0;
  const lineGross = round2(lineNet + lineVat);
  return {
    id: input.id,
    name: input.name,
    quantity: qty,
    vatRate: rate,
    vatIncluded: false,
    unitPrice,
    lineNet,
    lineVat,
    lineGross,
  };
}

export function aggregateVat(lines: VatLineBreakdown[]): VatAggregate {
  const byRateMap = new Map<number, { net: number; vat: number; gross: number }>();
  let subtotalNet = 0;
  let totalVat = 0;
  let totalGross = 0;

  for (const line of lines) {
    subtotalNet += line.lineNet;
    totalVat += line.lineVat;
    totalGross += line.lineGross;
    const bucket = byRateMap.get(line.vatRate) || { net: 0, vat: 0, gross: 0 };
    bucket.net += line.lineNet;
    bucket.vat += line.lineVat;
    bucket.gross += line.lineGross;
    byRateMap.set(line.vatRate, bucket);
  }

  const byRate = Array.from(byRateMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([vatRate, v]) => ({
      vatRate,
      net: round2(v.net),
      vat: round2(v.vat),
      gross: round2(v.gross),
    }));

  return {
    lines,
    subtotalNet: round2(subtotalNet),
    totalVat: round2(totalVat),
    totalGross: round2(totalGross),
    byRate,
  };
}

export function buildCartVatBreakdown(
  items: Array<{
    id: string;
    quantity: number;
    effectivePrice?: number;
    product: {
      name: string;
      price: number;
      vatRate?: number;
      vatIncluded?: boolean;
    };
  }>,
): VatAggregate {
  const lines = items.map((item) =>
    computeLineVat({
      id: item.id,
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: item.effectivePrice ?? item.product.price,
      vatRate: item.product.vatRate ?? 20,
      vatIncluded: item.product.vatIncluded ?? true,
    }),
  );
  return aggregateVat(lines);
}
