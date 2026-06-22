/**
 * PRODUCT_UNIVERSE_EXCEL_IMPORT_V2 — unit tests (no DB)
 */
import * as XLSX from "xlsx";
import { detectProductColumns } from "../src/lib/product-universe/column-detector";
import { cleanProductDescription, analyzeDescription } from "../src/lib/product-universe/description-cleaner";
import { collectImageUrlsFromRow, validateImageUrl } from "../src/lib/product-universe/image-harvester";
import { parseImportFile, parseProductRows } from "../src/lib/product-universe/import-parser";
import { previewProductImport } from "../src/lib/product-universe/import-service";
import { calculateQualityScore } from "../src/lib/product-universe/quality-score";
import { userMappingToProductMapping } from "../src/lib/product-universe/import-types";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

function makeXlsxBuffer(rows: Record<string, unknown>[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

console.log("\n=== Excel Import V2 Tests ===\n");

// 1. Trendyol columns
console.log("Trendyol kolon algılama:");
const trendyolCols = [
  "Ürün Adı", "Barkod", "Stok Kodu", "Marka", "Kategori", "Ürün Açıklaması",
  "Piyasa Satış Fiyatı", "Trendyol'da Satılacak Fiyat", "Stok Miktarı",
  "Görsel 1", "Görsel 2", "Para Birimi",
];
const trendyolMap = detectProductColumns(trendyolCols);
assert(trendyolMap.name === "Ürün Adı", "Ürün Adı → name");
assert(trendyolMap.barcode === "Barkod", "Barkod → barcode");
assert(trendyolMap.stockCode === "Stok Kodu", "Stok Kodu → stockCode");
assert(trendyolMap.price === "Trendyol'da Satılacak Fiyat", "Satış fiyatı öncelikli");
assert(trendyolMap.stock === "Stok Miktarı", "Stok Miktarı → stock");
assert(trendyolMap.imageColumns.length >= 2, "Görsel 1-2 algılandı");

// 2. General Excel columns
console.log("\nGenel Excel kolon algılama:");
const generalCols = ["productName", "sku", "brand", "category", "description", "price", "image1", "image2"];
const generalMap = detectProductColumns(generalCols);
assert(!!generalMap.name, "productName algılandı");
assert(!!generalMap.stockCode, "sku algılandı");
assert(generalMap.imageColumns.length >= 2, "image1-2 algılandı");

// 3. Mapping change affects preview
console.log("\nMapping değişimi:");
const sampleRows = [
  {
    "Ürün Adı": "Test Ürün",
    Barkod: "123456",
    Marka: "TestMarka",
    Kategori: "Ev",
    "Ürün Açıklaması": "<p>Harika ürün</p> Trendyol güvencesiyle hızlı kargo",
    "Trendyol'da Satılacak Fiyat": "199,90",
    "Stok Miktarı": "10",
    "Görsel 1": "https://cdn.example.com/a.jpg,https://cdn.example.com/b.jpg",
  },
  {
    "Ürün Adı": "Test Ürün 2",
    Barkod: "789",
    Marka: "Marka2",
    Kategori: "Mutfak",
    "Ürün Açıklaması": "Kısa",
    "Trendyol'da Satılacak Fiyat": "50",
    "Görsel 1": "https://cdn.example.com/c.jpg",
  },
];
const buf = makeXlsxBuffer(sampleRows);
const raw = parseImportFile(buf, "trendyol.xlsx");
const parsed1 = parseProductRows(raw);
const customMapping = userMappingToProductMapping({ "Ürün Adı": "_skip", Barkod: "name" });
const parsed2 = parseProductRows(raw, customMapping);
assert(parsed1.rows[0]!.rawName === "Test Ürün", "Varsayılan mapping: ürün adı");
assert(parsed2.rows[0]!.rawName === "123456", "Özel mapping: barkod ad olarak");

// 4. HTML description cleaning
console.log("\nAçıklama temizleme:");
const htmlDesc = "<b>Ürün</b> Trendyol güvencesiyle hızlı kargo kampanya";
const cleaned = cleanProductDescription(htmlDesc);
assert(!cleaned.includes("<"), "HTML temizlendi");
assert(!cleaned.toLowerCase().includes("trendyol"), "Platform ifadesi temizlendi");
const shortWarn = analyzeDescription("kısa", "kısa");
assert(shortWarn.some((w) => w.includes("kısa")), "Kısa açıklama uyarısı");

// 5. Image collection
console.log("\nGörsel toplama:");
const imgRow = { image1: "https://a.com/1.jpg,https://a.com/2.jpg", image2: "not-a-url" };
const { urls, invalidCount } = collectImageUrlsFromRow(imgRow, ["image1", "image2"]);
assert(urls.length === 2, "Virgülle ayrılmış URL'ler toplandı");
assert(invalidCount === 1, "Geçersiz URL sayıldı");
assert(validateImageUrl("https://cdn.trendyol.com/x.jpg").valid, "Geçerli URL");

// 6. Quality score BLUEPRINT_READY
console.log("\nKalite skoru:");
const highQ = calculateQualityScore({
  rawName: "Premium Cam Tablo 60x90",
  categoryPath: "Ev > Dekorasyon",
  descriptionClean: "Uzun ve detaylı ürün açıklaması burada yer alıyor.",
  imageCount: 3,
  entityCount: 3,
  hasMaterialOrSize: true,
  isDuplicate: false,
});
assert(highQ.score >= 70, `Yüksek kalite skoru: ${highQ.score}`);
assert(highQ.status === "BLUEPRINT_READY", "BLUEPRINT_READY durumu");

// 7. Dry-run preview (no DB write - we only check it returns data)
console.log("\nDry-run preview:");
const preview = await previewProductImport(buf, "trendyol.xlsx", { isAdmin: true });
assert(preview.totalRows === 2, "Toplam satır");
assert(preview.previewRows.length <= 20, "İlk 20 satır önizleme");
assert(preview.imageUrlCount >= 2, "Görsel URL sayısı");
assert(preview.validRows === 2, "Geçerli satırlar");

// 8. Duplicate in file
console.log("\nDuplicate (dosya içi):");
const dupRows = [
  { sku: "SKU-1", productName: "A", brand: "B", category: "C", price: "10", image1: "https://x.com/1.jpg" },
  { sku: "SKU-1", productName: "A Copy", brand: "B", category: "C", price: "10", image1: "https://x.com/2.jpg" },
];
const dupBuf = makeXlsxBuffer(dupRows);
const dupPreview = await previewProductImport(dupBuf, "dup.xlsx", { isAdmin: true });
assert(dupPreview.duplicateInFile >= 1, "Dosya içi duplicate tespit");

console.log(`\n=== Sonuç: ${passed} geçti, ${failed} başarısız ===\n`);
if (failed > 0) process.exit(1);
