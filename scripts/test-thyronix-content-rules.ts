import { applyContentRulesToRow } from "../src/lib/thyronix/rules/content-apply";
import { DEFAULT_THYRONIX_AI_RULES } from "../src/lib/thyronix/rules/types";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const rules = {
  ...DEFAULT_THYRONIX_AI_RULES,
  stripBrandFromTitle: true,
  titlePrefix: "En Ucuz",
  titleSuffix: "Hızlı Kargo",
  bannedWords: ["kopya"],
};

const row = applyContentRulesToRow(
  { name: "Samsung Galaxy S24 Kılıf", brand: "Samsung", description: "kopya ürün değil" },
  rules,
);
assert(String(row.name).includes("En Ucuz"), "prefix");
assert(String(row.name).includes("Hızlı Kargo"), "suffix");
assert(!String(row.name).toLowerCase().includes("samsung"), "brand stripped");
assert(!String(row.description).toLowerCase().includes("kopya"), "banned word");

console.log("thyronix content rules tests OK");
