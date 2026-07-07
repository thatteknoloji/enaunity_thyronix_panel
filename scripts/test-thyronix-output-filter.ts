import { shouldIncludeProductInOutput } from "../src/lib/thyronix/rules/output-filter";
import { defaultRulesBundle } from "../src/lib/thyronix/rules/types";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const rules = defaultRulesBundle();
rules.stock.hideBelowStock = 9;

assert(
  !shouldIncludeProductInOutput({ name: "A", stock: 5, status: "active" }, rules).include,
  "low stock hidden",
);
assert(
  shouldIncludeProductInOutput({ name: "B", stock: 10, status: "active" }, rules).include,
  "enough stock shown",
);
assert(
  shouldIncludeProductInOutput({ name: "C", stock: 0, status: "missing_from_source" }, rules).include,
  "missing from source always in output",
);

rules.gate.requireImage = true;
assert(
  !shouldIncludeProductInOutput({ name: "D", stock: 100, status: "active", image: "" }, rules).include,
  "no image gated",
);
assert(
  shouldIncludeProductInOutput({ name: "E", stock: 100, status: "active", image: "https://x.jpg" }, rules).include,
  "with image passes",
);

rules.gate.requireImage = false;
rules.gate.requireVatRate = true;
assert(
  !shouldIncludeProductInOutput({ name: "F", stock: 100, status: "active", vatRate: null }, rules).include,
  "missing vat gated",
);
assert(
  shouldIncludeProductInOutput({ name: "G", stock: 100, status: "active", vatRate: 20 }, rules).include,
  "with vat passes",
);

rules.gate.requireVatRate = false;
rules.gate.requireVariants = true;
assert(
  !shouldIncludeProductInOutput({ name: "H", stock: 100, status: "active", variantData: null }, rules).include,
  "missing variants gated",
);
assert(
  !shouldIncludeProductInOutput({
    name: "I",
    stock: 100,
    status: "active",
    variantData: JSON.stringify([{ barcode: "", stock: 5, price: 10, options: "Renk:Siyah" }]),
  }, rules).include,
  "incomplete variant gated",
);
assert(
  shouldIncludeProductInOutput({
    name: "J",
    stock: 100,
    status: "active",
    variantData: JSON.stringify([{ barcode: "123", stock: 5, price: 10, options: "Renk:Siyah" }]),
  }, rules).include,
  "complete variants pass",
);

console.log("thyronix output filter tests OK");
