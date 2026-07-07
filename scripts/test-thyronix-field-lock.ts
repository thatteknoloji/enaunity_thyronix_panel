import { buildMergedUpdate, parseFieldLocks, valuesEqual } from "../src/lib/thyronix/field-lock";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const existing = {
  name: "Orijinal Başlık",
  description: "Orijinal açıklama",
  image: "https://example.com/a.jpg",
  images: "https://example.com/a.jpg",
  brand: "Marka",
  category: "Kategori",
  variantData: null,
  manufacturer: null,
  warranty: null,
  deliveryTime: null,
  productUrl: null,
  dimensions: null,
  weight: null,
  price: 100,
  stock: 10,
  costPrice: 80,
  discountedPrice: null,
  currency: "TRY",
  vatRate: null,
  shippingCost: null,
  status: "active",
  barcode: "123",
  stockCode: "SC1",
  modelCode: "MC1",
  externalId: "ext1",
  lockedFields: JSON.stringify({ name: true, description: true }),
};

const incoming = {
  ...existing,
  name: "Feed Başlık",
  description: "Feed açıklama",
  price: 120,
  stock: 5,
};

const { update, changed } = buildMergedUpdate(existing, incoming);
assert(changed, "should detect price/stock change");
assert(update.name === undefined, "locked name preserved");
assert(update.description === undefined, "locked description preserved");
assert(update.price === 120, "price updated");
assert(update.stock === 5, "stock updated");

assert(valuesEqual(100, 100), "valuesEqual same");
assert(!valuesEqual(100, 101), "valuesEqual diff");

const locks = parseFieldLocks(JSON.stringify({ name: true }));
assert(locks.name === true, "parse locks");

console.log("thyronix field-lock tests OK");
