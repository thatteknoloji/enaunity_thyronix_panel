import assert from "node:assert/strict";
import { buildSuggestedProductMapping, buildSuggestedVariantMapping } from "../src/lib/thyronix/field-aliases";
import { productToThyronixRow, parseFixedValues } from "../src/lib/thyronix/feed-fetch";
import { getTemplate } from "../src/lib/thyronix/templates";
import { inspectXmlFeed, parseXmlToProducts } from "../src/lib/thyronix/xml-parser";

const template = getTemplate("custom_xml");
assert(template, "custom_xml template bulunamadı");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<products>
  <product>
    <name>KDV ve fiyat test ürünü</name>
    <description>Kaynak açıklaması</description>
    <brand>Kaynak Marka</brand>
    <category>Cam Tablo</category>
    <barcode>8680000000001</barcode>
    <stockCode>NNTY5141697-1457</stockCode>
    <sitePrice>1.234,56 TL</sitePrice>
    <quantity>12</quantity>
    <tax>20</tax>
    <image1>https://example.com/a.jpg</image1>
    <variants>
      <variant>
        <specName1>Renk</specName1>
        <specValue1>Siyah</specValue1>
        <variant_barcode>VR-8680000000001</variant_barcode>
        <quantity>3</quantity>
      </variant>
    </variants>
  </product>
</products>`;

const inspected = inspectXmlFeed(xml, template);
const suggestedMapping = buildSuggestedProductMapping(inspected.detectedFields);
const suggestedVariantMapping = buildSuggestedVariantMapping(inspected.variantFields);

assert.equal(suggestedMapping.tax, "vatRate");
assert.equal(suggestedMapping.sitePrice, "price");
assert.equal(suggestedMapping.quantity, "stock");
assert.equal(suggestedMapping.stockCode, "stockCode");
assert.equal(suggestedVariantMapping.specName1, "variantGroup");
assert.equal(suggestedVariantMapping.specValue1, "variantValue");
assert.equal(suggestedVariantMapping.variant_barcode, "variantBarcode");

const products = parseXmlToProducts(xml, template, suggestedMapping, suggestedVariantMapping);
assert.equal(products.length, 1);
assert.equal(products[0].price, 1234.56);
assert.equal(products[0].stock, 12);
assert.equal(products[0].vatRate, 20);
assert.equal(products[0].stockCode, "NNTY5141697-1457");

const row = productToThyronixRow(products[0], "source-1", parseFixedValues("{}"));
assert.equal(row.price, 1234.56);
assert.equal(row.vatRate, 20);

const variants = JSON.parse(String(row.variantData || "[]"));
assert.equal(variants.length, 1);
assert.equal(variants[0].barcode, "VR-8680000000001");
assert.equal(variants[0].options[0].group, "Renk");
assert.equal(variants[0].options[0].value, "Siyah");

const excelColumns = [
  "Ürün Adı",
  "Barkod",
  "Trendyol'da Satılacak Fiyat",
  "KDV Oranı",
  "Stok Miktarı",
  "Model Kodu",
  "Renk",
  "Beden",
];
const excelMapping = buildSuggestedProductMapping(excelColumns);
const excelVariantMapping = buildSuggestedVariantMapping(excelColumns);
assert.equal(excelMapping["Ürün Adı"], "name");
assert.equal(excelMapping.Barkod, "barcode");
assert.equal(excelMapping["Trendyol'da Satılacak Fiyat"], "salePrice");
assert.equal(excelMapping["KDV Oranı"], "vatRate");
assert.equal(excelMapping["Stok Miktarı"], "stock");
assert.equal(excelMapping["Model Kodu"], "modelCode");
assert.equal(excelVariantMapping.Renk, "variantValue");
assert.equal(excelVariantMapping.Beden, "variantValue");

console.log("✓ THYRONIX mapping stabilizasyon testi geçti");
