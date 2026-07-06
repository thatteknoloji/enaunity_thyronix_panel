import { resolveProductStockStatus } from "../src/lib/products/stock-status";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const allOut = resolveProductStockStatus({
  productStock: 0,
  variants: [
    { stock: 0, options: [{ group: "Beden", value: "S" }] },
    { stock: 0, options: [{ group: "Beden", value: "M" }] },
  ],
});
assert(allOut.level === "out", "all out");
assert(allOut.headline === "Ürün stokta yok", "all out headline");

const partial = resolveProductStockStatus({
  productStock: 3,
  variants: [
    { stock: 3, options: [{ group: "Beden", value: "S" }] },
    { stock: 0, options: [{ group: "Beden", value: "M" }] },
  ],
});
assert(partial.level === "partial", "partial");
assert(partial.warnings.includes("M varyantında stok yok"), "partial warning");

const low = resolveProductStockStatus({
  productStock: 4,
  variants: [{ stock: 4, options: [{ group: "Beden", value: "S" }] }],
});
assert(low.level === "low", "low stock");
assert(low.headline === "Düşük stok", "low headline");

const inStock = resolveProductStockStatus({
  productStock: 20,
  variants: [
    { stock: 10, options: [{ group: "Beden", value: "S" }] },
    { stock: 10, options: [{ group: "Beden", value: "M" }] },
  ],
});
assert(inStock.level === "in", "in stock");
assert(inStock.headline === "Stokta", "in stock headline");

console.log("stock-status tests OK");
