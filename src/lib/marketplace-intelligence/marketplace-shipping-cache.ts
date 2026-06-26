import type { MarketplaceId, ShippingCarrierId, ShippingRateTable } from "./marketplace-types";
import {
  SHIPPING_DATASETS,
  SHIPPING_SOURCES,
  getCarrierLabel,
} from "./marketplace-imported-data";

function buildDesiPrices(brackets: Array<{ desiMin: number; price: number }>, maxDesi: number): number[] {
  const prices: number[] = [0];
  const byDesi = new Map(brackets.map((b) => [b.desiMin, b.price]));
  for (let d = 1; d <= maxDesi; d += 1) {
    prices.push(byDesi.get(d) ?? 0);
  }
  return prices;
}

function buildShippingTables(): ShippingRateTable[] {
  const tables: ShippingRateTable[] = [];

  for (const dataset of SHIPPING_DATASETS) {
    const byCarrier = new Map<
      ShippingCarrierId,
      { marketplace: MarketplaceId; brackets: Array<{ desiMin: number; price: number }>; vatIncluded: boolean; vatNote?: string }
    >();

    for (const bracket of dataset.brackets) {
      const existing = byCarrier.get(bracket.carrier);
      if (existing) {
        existing.brackets.push({ desiMin: bracket.desiMin, price: bracket.price });
      } else {
        byCarrier.set(bracket.carrier, {
          marketplace: bracket.marketplace,
          brackets: [{ desiMin: bracket.desiMin, price: bracket.price }],
          vatIncluded: bracket.vatIncluded,
          vatNote: bracket.vatNote,
        });
      }
    }

    for (const [carrier, data] of byCarrier) {
      const maxDesi = Math.max(...data.brackets.map((b) => b.desiMin));
      tables.push({
        marketplace: data.marketplace,
        carrier,
        carrierLabel: getCarrierLabel(data.marketplace, carrier),
        source: dataset.source,
        desiPrices: buildDesiPrices(data.brackets, maxDesi),
        maxDesi,
        vatIncluded: data.vatIncluded,
        vatNote: data.vatNote,
      });
    }
  }

  return tables;
}

export const MARKETPLACE_SHIPPING_CACHE: ShippingRateTable[] = buildShippingTables();

export const SHIPPING_CARRIER_LABELS: Record<ShippingCarrierId, string> = {
  yurtici: "Yurtiçi Kargo",
  aras: "Aras Kargo",
  mng: "MNG Kargo",
  surat: "Sürat Kargo",
  ptt: "PTT Kargo",
  kolay_gelsin: "Kolay Gelsin",
  dhl: "DHL eCommerce",
  ups: "UPS",
};

export function listCarriersForMarketplace(
  marketplace: MarketplaceId,
): Array<{ id: ShippingCarrierId; label: string }> {
  return MARKETPLACE_SHIPPING_CACHE.filter((item) => item.marketplace === marketplace).map(
    (item) => ({ id: item.carrier, label: item.carrierLabel }),
  );
}

export function getShippingTable(
  marketplace: MarketplaceId,
  carrier: ShippingCarrierId,
): ShippingRateTable | undefined {
  return MARKETPLACE_SHIPPING_CACHE.find(
    (item) => item.marketplace === marketplace && item.carrier === carrier,
  );
}

export function getShippingPrice(
  marketplace: MarketplaceId,
  carrier: ShippingCarrierId,
  desi: number,
): number | null {
  if (!Number.isFinite(desi) || desi <= 0) return null;
  const rateTable = getShippingTable(marketplace, carrier);
  if (!rateTable) return null;
  const rounded = Math.ceil(desi);
  if (rounded > rateTable.maxDesi) return null;
  const price = rateTable.desiPrices[rounded];
  return typeof price === "number" && price > 0 ? price : null;
}

export function getShippingSourceMeta(marketplace: MarketplaceId) {
  return SHIPPING_SOURCES[marketplace] ?? null;
}
