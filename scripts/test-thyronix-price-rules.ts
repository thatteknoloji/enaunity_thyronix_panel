import { applyPriceRules, tierMultiplierForPrice } from "../src/lib/thyronix/rules/resolver";
import { applyIncomingPriceRules, pickPriceBase } from "../src/lib/thyronix/rules/apply";
import type { ThyronixPriceRules } from "../src/lib/thyronix/rules/types";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const flatRules: ThyronixPriceRules = {
  mode: "flat",
  multiplier: 1.2,
  fixedAdjustment: 5,
  tiers: [],
  roundTo: 0,
  baseField: "price",
};

assert(applyPriceRules(100, flatRules) === 125, "flat 20% + 5");

const tiered: ThyronixPriceRules = {
  mode: "tiered",
  multiplier: 1,
  fixedAdjustment: 0,
  tiers: [
    { minPrice: 0, maxPrice: 100, markupPercent: 50 },
    { minPrice: 100, maxPrice: null, markupPercent: 20 },
  ],
  roundTo: 0,
  baseField: "price",
};

assert(tierMultiplierForPrice(50, tiered.tiers) === 1.5, "tier 50%");
assert(applyPriceRules(50, tiered) === 75, "tiered 50");
assert(applyPriceRules(200, tiered) === 240, "tiered 20%");

const row = applyIncomingPriceRules(
  { price: 100, costPrice: 80, metadataJson: "{}" },
  flatRules,
);
assert(Number(row.price) === 125, "incoming price rules");
assert(pickPriceBase({ price: 0, costPrice: 80 }, { ...flatRules, baseField: "costPrice" }) === 80, "cost base");

console.log("thyronix price rules tests OK");
