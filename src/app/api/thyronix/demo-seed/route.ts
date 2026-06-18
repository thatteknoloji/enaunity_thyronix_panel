import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireThyronixAdmin } from "@/lib/thyronix/access";

export async function POST() {
  try {
    await requireThyronixAdmin();
    // Create 4 demo sources
    const xmlSource = await prisma.thyronixSource.create({
      data: {
        name: "Demo XML Kaynağı",
        type: "xml",
        xmlUrl: "https://example.com/demo-products.xml",
        status: "active",
        lastSync: new Date(),
        productCount: 25,
      },
    });

    const excelSource = await prisma.thyronixSource.create({
      data: {
        name: "Demo Excel Kaynağı",
        type: "excel",
        xmlUrl: "https://example.com/demo-products.xlsx",
        status: "active",
        lastSync: new Date(),
        productCount: 15,
      },
    });

    const csvSource = await prisma.thyronixSource.create({
      data: {
        name: "Demo CSV Kaynağı",
        type: "csv",
        xmlUrl: "https://example.com/demo-products.csv",
        status: "active",
        lastSync: new Date(),
        productCount: 10,
      },
    });

    const apiSource = await prisma.thyronixSource.create({
      data: {
        name: "Demo API Kaynağı",
        type: "api",
        xmlUrl: "https://api.example.com/v1/products",
        status: "active",
        lastSync: new Date(),
        productCount: 20,
      },
    });

    // Create 100 demo products with various scenarios
    const products = [];
    const categories = ["Elektronik", "Giyim", "Ev & Yaşam", "Spor", "Kozmetik", "Kitap", "Oyuncak", "Gıda"];
    const brands = ["DemoMarka A", "DemoMarka B", "DemoMarka C", "TestMarka X", "TestMarka Y"];

    // Good products (40)
    for (let i = 0; i < 40; i++) {
      products.push({
        name: `Demo Ürün ${i + 1} - Premium Kalite`,
        description: `Bu harika demo ürün ${i + 1} yüksek kalite ve dayanıklılık sunar. Günlük kullanım için idealdir.`,
        brand: brands[i % brands.length],
        category: categories[i % categories.length],
        price: Math.floor(Math.random() * 500) + 50,
        stock: Math.floor(Math.random() * 100) + 10,
        externalId: `DEMO${String(i + 1).padStart(6, "0")}`,
        barcode: `DEMO${String(i + 1).padStart(6, "0")}`,
        status: "active",
        sourceId: i < 10 ? xmlSource.id : i < 20 ? excelSource.id : i < 28 ? csvSource.id : apiSource.id,
      });
    }

    // Missing barcode products (15)
    for (let i = 40; i < 55; i++) {
      products.push({
        name: `Demo Ürün ${i + 1} - Barkodsuz`,
        description: `Bu demo ürün barkod bilgisi eksik.`,
        brand: brands[i % brands.length],
        category: categories[i % categories.length],
        price: Math.floor(Math.random() * 300) + 30,
        stock: Math.floor(Math.random() * 50) + 5,
        externalId: `DEMO${String(i + 1).padStart(6, "0")}`,
        barcode: null,
        status: "warning",
        sourceId: xmlSource.id,
      });
    }

    // Low stock products (15)
    for (let i = 55; i < 70; i++) {
      products.push({
        name: `Demo Ürün ${i + 1} - Düşük Stok`,
        description: `Bu demo ürün stokta azalmış durumda.`,
        brand: brands[i % brands.length],
        category: categories[i % categories.length],
        price: Math.floor(Math.random() * 400) + 40,
        stock: Math.floor(Math.random() * 3),
        externalId: `DEMO${String(i + 1).padStart(6, "0")}`,
        barcode: `DEMO${String(i + 1).padStart(6, "0")}`,
        status: "warning",
        sourceId: excelSource.id,
      });
    }

    // Weak title products (15)
    for (let i = 70; i < 85; i++) {
      products.push({
        name: `Ürün ${i + 1}`,
        description: `Kısa açıklama.`,
        brand: brands[i % brands.length],
        category: categories[i % categories.length],
        price: Math.floor(Math.random() * 200) + 20,
        stock: Math.floor(Math.random() * 30) + 5,
        externalId: `DEMO${String(i + 1).padStart(6, "0")}`,
        barcode: `DEMO${String(i + 1).padStart(6, "0")}`,
        status: "active",
        sourceId: csvSource.id,
      });
    }

    // Missing category products (15)
    for (let i = 85; i < 100; i++) {
      products.push({
        name: `Demo Ürün ${i + 1} - Kategorisiz`,
        description: `Bu demo ürün kategori bilgisi eksik.`,
        brand: brands[i % brands.length],
        category: null,
        price: Math.floor(Math.random() * 350) + 35,
        stock: Math.floor(Math.random() * 40) + 10,
        externalId: `DEMO${String(i + 1).padStart(6, "0")}`,
        barcode: `DEMO${String(i + 1).padStart(6, "0")}`,
        status: "warning",
        sourceId: xmlSource.id,
      });
    }

    await prisma.thyronixProduct.createMany({
      data: products,
    });

    // Create 5 demo rules
    const rules = [
      {
        name: "Fiyat Artışı Kuralı",
        description: "Tüm ürün fiyatlarını %20 artır",
        field: "price",
        operator: "gt",
        value: "0",
        action: "price_multiply",
        actionValue: "1.2",
        priority: 1,
      },
      {
        name: "Düşük Stok Uyarısı",
        description: "Stok 5'in altındaysa uyarı ver",
        field: "stock",
        operator: "lt",
        value: "5",
        action: "warning",
        actionValue: "Düşük stok",
        priority: 2,
      },
      {
        name: "Barkodsuz Ürünleri Hariç Tut",
        description: "Barkodu olmayan ürünleri feed'den çıkar",
        field: "barcode",
        operator: "empty",
        value: "",
        action: "exclude",
        actionValue: "",
        priority: 3,
      },
      {
        name: "Kategori Eşleştirme",
        description: "Elektronik kategorisini 'Elektronik & Teknoloji' olarak değiştir",
        field: "category",
        operator: "eq",
        value: "Elektronik",
        action: "category_rename",
        actionValue: "Elektronik & Teknoloji",
        priority: 4,
      },
      {
        name: "Marka Eşleştirme",
        description: "DemoMarka A'yı 'Premium Marka' olarak değiştir",
        field: "brand",
        operator: "eq",
        value: "DemoMarka A",
        action: "brand_rename",
        actionValue: "Premium Marka",
        priority: 5,
      },
    ];

    await prisma.thyronixRule.createMany({
      data: rules,
    });

    // Create 2 brand mappings
    await prisma.thyronixBrandMapping.createMany({
      data: [
        { sourceBrand: "DemoMarka A", targetBrand: "Premium Marka" },
        { sourceBrand: "DemoMarka B", targetBrand: "Ekonomi Marka" },
      ],
    });

    // Create 2 category mappings
    await prisma.thyronixCategoryMapping.createMany({
      data: [
        { sourceCategory: "Elektronik", targetCategory: "Elektronik & Teknoloji" },
        { sourceCategory: "Giyim", targetCategory: "Moda & Giyim" },
      ],
    });

    // Create 1 demo feed
    const feed = await prisma.thyronixFeed.create({
      data: {
        name: "Demo Ürün Feed'i",
        channel: "Genel",
        outputFormat: "xml",
        status: "active",
        productCount: 100,
        lastPublished: new Date(),
      },
    });

    // Create 1 snapshot
    await prisma.thyronixSnapshot.create({
      data: {
        label: "Demo Başlangıç Snapshot'u",
        type: "manual",
        productCount: 100,
        activeCount: 90,
        passiveCount: 5,
        errorCount: 3,
        warningCount: 2,
        snapshotData: JSON.stringify({ sources: 3, products: 100, rules: 5 }),
      },
    });

    // Create some sync logs
    const logs = [
      {
        type: "sync",
        status: "success",
        message: "Demo XML Kaynağı senkronize edildi",
        productCount: 40,
        sourceId: xmlSource.id,
      },
      {
        type: "sync",
        status: "success",
        message: "Demo Excel Kaynağı senkronize edildi",
        productCount: 30,
        sourceId: excelSource.id,
      },
      {
        type: "sync",
        status: "success",
        message: "Demo CSV Kaynağı senkronize edildi",
        productCount: 30,
        sourceId: csvSource.id,
      },
      {
        type: "rule",
        status: "success",
        message: "5 kural uygulandı",
        productCount: 100,
      },
      {
        type: "feed",
        status: "success",
        message: "Demo Ürün Feed'i oluşturuldu",
        productCount: 100,
        feedId: feed.id,
      },
    ];

    await prisma.thyronixSyncLog.createMany({
      data: logs,
    });

    // Create default module plans if they don't exist
    const planCount = await prisma.modulePlan.count();
    if (planCount === 0) {
      await prisma.modulePlan.createMany({
        data: [
          { moduleKey: "THYRONIX", planKey: "starter", name: "Starter", description: "Küçük işletmeler için", monthlyPrice: 299, yearlyPrice: 2990, currency: "TRY", featuresJson: JSON.stringify(["1 Kaynak", "5.000 Ürün", "1 Canlı Feed", "Temel Kurallar", "XML/CSV Çıktı"]), sortOrder: 1 },
          { moduleKey: "THYRONIX", planKey: "pro", name: "Pro", description: "Büyüyen işletmeler için", monthlyPrice: 799, yearlyPrice: 7990, currency: "TRY", featuresJson: JSON.stringify(["5 Kaynak", "50.000 Ürün", "5 Canlı Feed", "Gelişmiş Kurallar", "AI Optimizasyonu", "Excel/CSV/XML/JSON Çıktı", "Özel Marka Eşleştirme"]), sortOrder: 2 },
          { moduleKey: "THYRONIX", planKey: "enterprise", name: "Enterprise", description: "Büyük ölçekli operasyonlar", monthlyPrice: 2499, yearlyPrice: 24990, currency: "TRY", featuresJson: JSON.stringify(["Sınırsız Kaynak", "Sınırsız Ürün", "Sınırsız Feed", "Tüm AI Özellikleri", "Öncelikli Destek", "API Erişimi", "Özel Entegrasyon"]), sortOrder: 3 },
          { moduleKey: "HIVE", planKey: "starter", name: "Starter", description: "Başlangıç seviyesi", monthlyPrice: 499, yearlyPrice: 4990, currency: "TRY", featuresJson: JSON.stringify(["Temel SEO", "10 İçerik/ay", "1 Site", "Entity Graph"]), sortOrder: 1 },
          { moduleKey: "HIVE", planKey: "growth", name: "Growth", description: "Büyüme odaklı", monthlyPrice: 1499, yearlyPrice: 14990, currency: "TRY", featuresJson: JSON.stringify(["Gelişmiş SEO", "GEO Optimizasyonu", "50 İçerik/ay", "3 Site", "Publisher Network", "Site Factory"]), sortOrder: 2 },
          { moduleKey: "HIVE", planKey: "dominance", name: "Dominance", description: "Tam hakimiyet", monthlyPrice: 4999, yearlyPrice: 49990, currency: "TRY", featuresJson: JSON.stringify(["Tam SEO/GEO Paketi", "Sınırsız İçerik", "Sınırsız Site", "Entity Graph Pro", "AI İçerik Asistanı", "Öncelikli Destek"]), sortOrder: 3 },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        sources: 3,
        products: 100,
        rules: 5,
        brandMappings: 2,
        categoryMappings: 2,
        feeds: 1,
        snapshots: 1,
        logs: 5,
      },
    });
  } catch (error: any) {
    console.error("Demo seed error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Demo verisi oluşturulamadı" },
      { status: 500 }
    );
  }
}
