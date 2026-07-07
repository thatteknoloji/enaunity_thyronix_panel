import { applyPriceRules } from "../src/lib/thyronix/rules/resolver";
import { DEFAULT_THYRONIX_PRICE_RULES } from "../src/lib/thyronix/rules/types";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const rules = { ...DEFAULT_THYRONIX_PRICE_RULES, multiplier: 1.5 };
const meta = JSON.stringify({ _feedPrice: 100, _feedCostPrice: 80 });
const after = applyPriceRules(100, rules);
assert(after === 150, "reprice from feed base");

console.log("thyronix rules change tests OK");
