import assert from "node:assert/strict";
import { buildSuggestedProductMapping, buildSuggestedVariantMapping } from "../src/lib/thyronix/field-aliases";
import { productToThyronixRow, parseFixedValues } from "../src/lib/thyronix/feed-fetch";
import { buildVariantMappingReadiness } from "../src/lib/thyronix/mapping-validation";
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

const ticimaxXml = `<?xml version="1.0" encoding="UTF-8"?>
<Urunler>
  <Urun>
    <UrunKartiID>TK-1</UrunKartiID>
    <UrunAdi>Nested seçenek ürünü</UrunAdi>
    <Marka>Kaynak Marka</Marka>
    <Kategori>İç Giyim</Kategori>
    <UrunSecenek>
      <Secenek>
        <StokKodu>STK-TICIMAX-1</StokKodu>
        <Barkod>8680000000099</Barkod>
        <StokAdedi>20</StokAdedi>
        <SatisFiyati>1.299,90</SatisFiyati>
        <IndirimliFiyat>999,90</IndirimliFiyat>
        <AlisFiyati>500,00</AlisFiyati>
        <KdvOrani>10</KdvOrani>
        <EkSecenekOzellik>
          <Ozellik Tanim="BedenRenk" Deger="75B-BEYAZ">75B-BEYAZ</Ozellik>
        </EkSecenekOzellik>
      </Secenek>
    </UrunSecenek>
  </Urun>
</Urunler>`;

const ticimaxTemplate = {
  ...template,
  rootElement: "Urunler",
  itemElement: "Urun",
  variantElement: "UrunSecenek",
  variantItemElement: "Secenek",
};
const ticimaxInspected = inspectXmlFeed(ticimaxXml, ticimaxTemplate);
assert(ticimaxInspected.variantFields.includes("SatisFiyati"));
assert(ticimaxInspected.variantFields.includes("KdvOrani"));
const ticimaxSuggestedVariantMapping = buildSuggestedVariantMapping(ticimaxInspected.variantFields);
const ticimaxVariantReadiness = buildVariantMappingReadiness(
  ticimaxInspected.variantFields,
  ticimaxSuggestedVariantMapping,
);
assert.equal(ticimaxVariantReadiness.ready, true);
const ticimaxProducts = parseXmlToProducts(ticimaxXml, ticimaxTemplate);
assert.equal(ticimaxProducts.length, 1);
assert.equal(ticimaxProducts[0].price, 999.9);
assert.equal(ticimaxProducts[0].discountedPrice, 999.9);
assert.equal(ticimaxProducts[0].costPrice, 500);
assert.equal(ticimaxProducts[0].vatRate, 10);
assert.equal(ticimaxProducts[0].stock, 20);
assert.equal(ticimaxProducts[0].barcode, "8680000000099");
assert.equal(ticimaxProducts[0].stockCode, "STK-TICIMAX-1");
assert.equal(ticimaxProducts[0].externalId, "TK-1");
assert.equal(ticimaxProducts[0].variants?.[0]?.options?.[0]?.group, "BedenRenk");
assert.equal(ticimaxProducts[0].variants?.[0]?.options?.[0]?.value, "75B-BEYAZ");

const bezosLikeXml = `<?xml version="1.0" encoding="UTF-8"?>
<products>
  <product>
    <urun_adi>Bezos fiyat fallback ürünü</urun_adi>
    <fiyat>1.229,14</fiyat>
    <indirimli_fiyat>0,00</indirimli_fiyat>
    <alis_fiyat>850,00</alis_fiyat>
    <kdv>20</kdv>
    <stok_kodu>BZ-1</stok_kodu>
  </product>
</products>`;
const bezosProducts = parseXmlToProducts(bezosLikeXml, template, { indirimli_fiyat: "price" });
assert.equal(bezosProducts.length, 1);
assert.equal(bezosProducts[0].price, 1229.14);
assert.equal(bezosProducts[0].costPrice, 850);
assert.equal(bezosProducts[0].vatRate, 20);

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
