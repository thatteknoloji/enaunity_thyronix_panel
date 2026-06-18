import { prisma } from "./db";
import { hashPassword } from "./auth";

function img(seed: string, i: number) {
  return `https://picsum.photos/seed/${seed}${i}/600/800`;
}
function imgs(seed: string) {
  return JSON.stringify([img(seed, 1), img(seed, 2), img(seed, 3), img(seed, 4)]);
}

async function seed() {
  const adminPassword = await hashPassword("admin123");
  const userPassword = await hashPassword("user123");

  await prisma.user.upsert({
    where: { email: "admin@enaunity.com" },
    update: {},
    create: { email: "admin@enaunity.com", name: "Admin", password: adminPassword, role: "admin" },
  });
  await prisma.user.upsert({
    where: { email: "user@enaunity.com" },
    update: {},
    create: { email: "user@enaunity.com", name: "Test User", password: userPassword, role: "user" },
  });

  const products = [
    // ===================== CAM TABLO (15) =====================
    { name: "Yatay Cam Tablo 60x40", description: "Şeffaf cam baskı yatay tablo. 60x40 cm. Arkadan aydınlatmalı, 3mm temperli cam.", price: 1899.99, image: img("cTY1", 1), images: imgs("cTY1"), category: "Cam Tablo", subcategory: "Yatay", stock: 20 },
    { name: "Yatay Cam Tablo 80x50", description: "Yatay cam tablo 80x50 cm. Yüksek çözünürlüklü UV baskı, temperli cam.", price: 2499.99, image: img("cTY2", 1), images: imgs("cTY2"), category: "Cam Tablo", subcategory: "Yatay", stock: 18 },
    { name: "Yatay Cam Tablo 100x60", description: "Geniş yatay cam tablo 100x60 cm. Ofis ve salonlar için ideal.", price: 3499.99, image: img("cTY3", 1), images: imgs("cTY3"), category: "Cam Tablo", subcategory: "Yatay", stock: 15 },
    { name: "Dikey Cam Tablo 40x60", description: "Dikey cam tablo 40x60 cm. Modern tasarımlar, hazır askı aparatlı.", price: 1799.99, image: img("cTD1", 1), images: imgs("cTD1"), category: "Cam Tablo", subcategory: "Dikey", stock: 22 },
    { name: "Dikey Cam Tablo 50x70", description: "Dikey cam tablo 50x70 cm. Baskı netliği yüksek, çizilmez yüzey.", price: 2199.99, image: img("cTD2", 1), images: imgs("cTD2"), category: "Cam Tablo", subcategory: "Dikey", stock: 16 },
    { name: "Dikey Cam Tablo 60x90", description: "Büyük boy dikey cam tablo 60x90 cm. Koridor girişleri için şık seçenek.", price: 2999.99, image: img("cTD3", 1), images: imgs("cTD3"), category: "Cam Tablo", subcategory: "Dikey", stock: 12 },
    { name: "Yuvarlak Cam Tablo 40cm", description: "Yuvarlak cam tablo 40 cm çap. Modern ve minimal tasarım.", price: 1599.99, image: img("cTYv1", 1), images: imgs("cTYv1"), category: "Cam Tablo", subcategory: "Yuvarlak", stock: 14 },
    { name: "Yuvarlak Cam Tablo 60cm", description: "Büyük yuvarlak cam tablo 60 cm çap. Oturma grubu üstü için ideal.", price: 2499.99, image: img("cTYv2", 1), images: imgs("cTYv2"), category: "Cam Tablo", subcategory: "Yuvarlak", stock: 10 },
    { name: "Yuvarlak Cam Tablo 30cm 3'lü", description: "3'lü yuvarlak cam tablo seti. 30cm, 40cm, 50cm. Duvar düzeni oluşturun.", price: 3999.99, image: img("cTYv3", 1), images: imgs("cTYv3"), category: "Cam Tablo", subcategory: "Yuvarlak", stock: 8 },
    { name: "2'li Set Cam Tablo Yatay 40x30", description: "2'li yatay cam tablo seti. Her biri 40x30 cm. Simetrik duvar dekorasyonu.", price: 2799.99, image: img("cT2l1", 1), images: imgs("cT2l1"), category: "Cam Tablo", subcategory: "2'li Set Cam Tablolar", stock: 12 },
    { name: "2'li Set Cam Tablo Dikey 30x40", description: "2'li dikey cam tablo seti. Her biri 30x40 cm. Bütünleşik tasarım.", price: 2599.99, image: img("cT2l2", 1), images: imgs("cT2l2"), category: "Cam Tablo", subcategory: "2'li Set Cam Tablolar", stock: 10 },
    { name: "2'li Set Cam Tablo Yatay 50x35", description: "2'li yatay cam set 50x35 cm. Çerçevesiz şık görünüm.", price: 3299.99, image: img("cT2l3", 1), images: imgs("cT2l3"), category: "Cam Tablo", subcategory: "2'li Set Cam Tablolar", stock: 9 },
    { name: "3'lü Set Cam Tablo Yatay 30x20", description: "3'lü yatay cam tablo seti. Her biri 30x20 cm. Merdiven dekorasyonu.", price: 3499.99, image: img("cT3l1", 1), images: imgs("cT3l1"), category: "Cam Tablo", subcategory: "3'lü Set Cam Tablolar", stock: 11 },
    { name: "3'lü Set Cam Tablo Dikey 20x30", description: "3'lü dikey cam tablo seti. Her biri 20x30 cm. Modern ofisler için.", price: 3299.99, image: img("cT3l2", 1), images: imgs("cT3l2"), category: "Cam Tablo", subcategory: "3'lü Set Cam Tablolar", stock: 7 },
    { name: "3'lü Set Cam Tablo Karışık", description: "3'lü karışık boy cam tablo seti. 20x30, 30x40, 40x50 cm.", price: 4499.99, image: img("cT3l3", 1), images: imgs("cT3l3"), category: "Cam Tablo", subcategory: "3'lü Set Cam Tablolar", stock: 6 },

    // ===================== MDF TABLO (15) =====================
    { name: "Çerçeveli Mdf Tablo 50x70", description: "Ahşap çerçeveli MDF tablo. 50x70 cm. 1.5 cm kalınlık, hazır asma aparatı.", price: 1499.99, image: img("mdfC1", 1), images: imgs("mdfC1"), category: "Mdf Tablo", subcategory: "Çerçeveli Mdf Tablo", stock: 25 },
    { name: "Çerçeveli Mdf Tablo 70x100", description: "Büyük boy çerçeveli MDF tablo. 70x100 cm. Salonlar için ideal.", price: 2499.99, image: img("mdfC2", 1), images: imgs("mdfC2"), category: "Mdf Tablo", subcategory: "Çerçeveli Mdf Tablo", stock: 18 },
    { name: "Çerçeveli Mdf Tablo 40x60", description: "Orta boy çerçeveli MDF tablo. 40x60 cm. Yatay ve dikey kullanım.", price: 1299.99, image: img("mdfC3", 1), images: imgs("mdfC3"), category: "Mdf Tablo", subcategory: "Çerçeveli Mdf Tablo", stock: 30 },
    { name: "Çerçeveli Mdf Tablo 100x140", description: "Dev boy çerçeveli MDF tablo. 100x140 cm. Prestij mekanlar için.", price: 4499.99, image: img("mdfC4", 1), images: imgs("mdfC4"), category: "Mdf Tablo", subcategory: "Çerçeveli Mdf Tablo", stock: 8 },
    { name: "Çerçeveli Mdf Tablo 30x40", description: "Küçük boy çerçeveli MDF tablo. 30x40 cm. Çalışma odası için.", price: 899.99, image: img("mdfC5", 1), images: imgs("mdfC5"), category: "Mdf Tablo", subcategory: "Çerçeveli Mdf Tablo", stock: 40 },
    { name: "Çerçevesiz Mdf Tablo 50x70", description: "Çerçevesiz MDF tablo. 50x70 cm. Minimal görünüm, kenar boyalı.", price: 999.99, image: img("mdfCs1", 1), images: imgs("mdfCs1"), category: "Mdf Tablo", subcategory: "Çerçevesiz Mdf Tablo", stock: 22 },
    { name: "Çerçevesiz Mdf Tablo 60x90", description: "Büyük çerçevesiz MDF tablo. 60x90 cm. Modern ofis dekorasyonu.", price: 1799.99, image: img("mdfCs2", 1), images: imgs("mdfCs2"), category: "Mdf Tablo", subcategory: "Çerçevesiz Mdf Tablo", stock: 14 },
    { name: "Çerçevesiz Mdf Tablo 40x60", description: "Çerçevesiz MDF tablo 40x60 cm. 3mm kalınlık, hafif ve dayanıklı.", price: 799.99, image: img("mdfCs3", 1), images: imgs("mdfCs3"), category: "Mdf Tablo", subcategory: "Çerçevesiz Mdf Tablo", stock: 28 },
    { name: "Çerçevesiz Mdf Tablo 100x70", description: "Geniş çerçevesiz MDF tablo. 100x70 cm. Yatay manzaralar için.", price: 2999.99, image: img("mdfCs4", 1), images: imgs("mdfCs4"), category: "Mdf Tablo", subcategory: "Çerçevesiz Mdf Tablo", stock: 10 },
    { name: "Çerçevesiz Mdf Tablo 30x40 3'lü", description: "3'lü çerçevesiz MDF tablo seti. 30x40 cm. Modern konsept.", price: 2499.99, image: img("mdfCs5", 1), images: imgs("mdfCs5"), category: "Mdf Tablo", subcategory: "Çerçevesiz Mdf Tablo", stock: 12 },
    { name: "Çerçeveli Mdf Tablo 60x80", description: "Premium çerçeveli MDF tablo. 60x80 cm. Altın varak çerçeve.", price: 1999.99, image: img("mdfC6", 1), images: imgs("mdfC6"), category: "Mdf Tablo", subcategory: "Çerçeveli Mdf Tablo", stock: 15 },
    { name: "Çerçeveli Mdf Tablo 80x120", description: "Büyük çerçeveli MDF tablo. 80x120 cm. Klasik desen seçenekleri.", price: 3499.99, image: img("mdfC7", 1), images: imgs("mdfC7"), category: "Mdf Tablo", subcategory: "Çerçeveli Mdf Tablo", stock: 11 },
    { name: "Çerçevesiz Mdf Tablo 80x120", description: "Geniş çerçevesiz MDF tablo. 80x120 cm. İnce profil.", price: 2499.99, image: img("mdfCs6", 1), images: imgs("mdfCs6"), category: "Mdf Tablo", subcategory: "Çerçevesiz Mdf Tablo", stock: 9 },
    { name: "Çerçeveli Mdf Tablo 120x80", description: "Yatay büyük çerçeveli MDF. 120x80 cm. Otel ve ofisler için.", price: 4999.99, image: img("mdfC8", 1), images: imgs("mdfC8"), category: "Mdf Tablo", subcategory: "Çerçeveli Mdf Tablo", stock: 5 },
    { name: "Çerçevesiz Mdf Tablo 50x70 2'li", description: "2'li çerçevesiz MDF set. 50x70 cm. Simetrik düzen için.", price: 1799.99, image: img("mdfCs7", 1), images: imgs("mdfCs7"), category: "Mdf Tablo", subcategory: "Çerçevesiz Mdf Tablo", stock: 13 },

    // ===================== HALI (15) =====================
    { name: "İpek Yolu Halısı 200x300", description: "El dokuması ipek halı. 200x300 cm. Doğal boyalar, geleneksel motifler.", price: 18999.99, image: img("hali1", 1), images: imgs("hali1"), category: "Halı", subcategory: "", stock: 8 },
    { name: "Vintage El Dokuma Halı 160x230", description: "Vintage görünümlü el dokuma halı. 160x230 cm. Yün iplik.", price: 8499.99, image: img("hali2", 1), images: imgs("hali2"), category: "Halı", subcategory: "", stock: 12 },
    { name: "Modern Geometrik Halı 150x200", description: "Geometrik desenli modern halı. 150x200 cm. Makinede yıkanabilir.", price: 5499.99, image: img("hali3", 1), images: imgs("hali3"), category: "Halı", subcategory: "", stock: 25 },
    { name: "Klasik Desen Halı 200x290", description: "Klasik Osmanlı desenli halı. 200x290 cm. İpek ve yün karışımı.", price: 12999.99, image: img("hali4", 1), images: imgs("hali4"), category: "Halı", subcategory: "", stock: 6 },
    { name: "Çocuk Odası Halısı 120x160", description: "Eğlenceli desenli çocuk halısı. 120x160 cm. Anti-alerjik.", price: 2499.99, image: img("hali5", 1), images: imgs("hali5"), category: "Halı", subcategory: "", stock: 40 },
    { name: "Yolluk Halı 80x300", description: "Koridorlar için yolluk halı. 80x300 cm. Kaymaz tabanlı.", price: 2999.99, image: img("hali6", 1), images: imgs("hali6"), category: "Halı", subcategory: "", stock: 30 },
    { name: "Yuvarlak Dekoratif Halı 150cm", description: "Yuvarlak dekoratif halı. 150 cm çap. Modern desen.", price: 4499.99, image: img("hali7", 1), images: imgs("hali7"), category: "Halı", subcategory: "", stock: 15 },
    { name: "Salon Halısı 250x350", description: "Büyük boy salon halısı. 250x350 cm. Premium kalite.", price: 21999.99, image: img("hali8", 1), images: imgs("hali8"), category: "Halı", subcategory: "", stock: 5 },
    { name: "Banyo Halısı 60x90", description: "Kaymaz tabanlı banyo halısı. 60x90 cm. Mikrofiber.", price: 699.99, image: img("hali9", 1), images: imgs("hali9"), category: "Halı", subcategory: "", stock: 60 },
    { name: "Mutfak Halısı 50x80", description: "Leke tutmaz mutfak halısı. 50x80 cm. Kaymaz taban.", price: 599.99, image: img("hali10", 1), images: imgs("hali10"), category: "Halı", subcategory: "", stock: 55 },
    { name: "Berber Halısı 200x300", description: "Berber el dokuma halı. 200x300 cm. Doğal renkler, dayanıklı.", price: 9999.99, image: img("hali11", 1), images: imgs("hali11"), category: "Halı", subcategory: "", stock: 10 },
    { name: "Shaggy Halı 160x230", description: "Uzun tüylü shaggy halı. 160x230 cm. Yumuşacık doku.", price: 7499.99, image: img("hali12", 1), images: imgs("hali12"), category: "Halı", subcategory: "", stock: 14 },
    { name: "Dış Mekan Halısı 200x300", description: "UV dayanımlı dış mekan halısı. 200x300 cm. Su geçirmez.", price: 5999.99, image: img("hali13", 1), images: imgs("hali13"), category: "Halı", subcategory: "", stock: 20 },
    { name: "El Dokuması Kars Halısı 150x200", description: "Kars yöresi el dokuma halı. 150x200 cm. Yün iplik.", price: 10999.99, image: img("hali14", 1), images: imgs("hali14"), category: "Halı", subcategory: "", stock: 7 },
    { name: "Özel Tasarım Halı 180x270", description: "Özel tasarım modern halı. 180x270 cm. Sipariş üzerine.", price: 15999.99, image: img("hali15", 1), images: imgs("hali15"), category: "Halı", subcategory: "", stock: 4 },

    // ===================== KILIM (15) =====================
    { name: "Anadolu Yün Kilim 150x250", description: "El dokuması Anadolu kilimi. 150x250 cm. Doğal yün, toprak boyası.", price: 6999.99, image: img("kilim1", 1), images: imgs("kilim1"), category: "Kilim", subcategory: "", stock: 12 },
    { name: "Boho Pamuk Kilim 120x180", description: "Boho desenli pamuk kilim. 120x180 cm. Makinede yıkanabilir.", price: 3499.99, image: img("kilim2", 1), images: imgs("kilim2"), category: "Kilim", subcategory: "", stock: 18 },
    { name: "Kafkas Motifli Kilim 200x300", description: "Kafkas motifli büyük boy kilim. 200x300 cm. Yün iplik.", price: 8999.99, image: img("kilim3", 1), images: imgs("kilim3"), category: "Kilim", subcategory: "", stock: 8 },
    { name: "Yoga Kilimi 100x150", description: "Kaymaz tabanlı yoga kilimi. 100x150 cm. Çantalı.", price: 1499.99, image: img("kilim4", 1), images: imgs("kilim4"), category: "Kilim", subcategory: "", stock: 45 },
    { name: "Çeyizlik Kilim 160x230", description: "Özel çeyizlik kilim. 160x230 cm. Geleneksel motifler.", price: 5499.99, image: img("kilim5", 1), images: imgs("kilim5"), category: "Kilim", subcategory: "", stock: 10 },
    { name: "Modern Desen Kilim 150x200", description: "Modern geometrik desenli kilim. 150x200 cm. İnce dokuma.", price: 4499.99, image: img("kilim6", 1), images: imgs("kilim6"), category: "Kilim", subcategory: "", stock: 20 },
    { name: "Seccade Kilimi 70x110", description: "Özel desenli seccade kilimi. 70x110 cm. Yumuşacık dokuma.", price: 899.99, image: img("kilim7", 1), images: imgs("kilim7"), category: "Kilim", subcategory: "", stock: 50 },
    { name: "Heybe Desen Kilim 100x150", description: "Heybe desenli küçük boy kilim. 100x150 cm. Duvar süsü.", price: 2499.99, image: img("kilim8", 1), images: imgs("kilim8"), category: "Kilim", subcategory: "", stock: 25 },
    { name: "Pamuk El Dokuma Kilim 80x120", description: "El dokuması pamuk kilim. 80x120 cm. Doğal beyaz.", price: 1999.99, image: img("kilim9", 1), images: imgs("kilim9"), category: "Kilim", subcategory: "", stock: 30 },
    { name: "Yolluk Kilim 60x250", description: "Dar koridorlar için yolluk kilim. 60x250 cm. Kaymaz.", price: 1899.99, image: img("kilim10", 1), images: imgs("kilim10"), category: "Kilim", subcategory: "", stock: 35 },
    { name: "Dokuma Kilim 200x290", description: "Geleneksel dokuma kilim. 200x290 cm. Kök boya, yün.", price: 7999.99, image: img("kilim11", 1), images: imgs("kilim11"), category: "Kilim", subcategory: "", stock: 6 },
    { name: "Spor Kilimi 180x80", description: "Spor ve fitness kilimi. 180x80 cm. Kaymaz, yastıklı.", price: 1299.99, image: img("kilim12", 1), images: imgs("kilim12"), category: "Kilim", subcategory: "", stock: 40 },
    { name: "Piknik Kilimi 200x200", description: "Su geçirmez piknik kilimi. 200x200 cm. Katlanabilir.", price: 799.99, image: img("kilim13", 1), images: imgs("kilim13"), category: "Kilim", subcategory: "", stock: 60 },
    { name: "Bambu Kilim 80x150", description: "Doğal bambu kilim. 80x150 cm. Girişler için ideal.", price: 1599.99, image: img("kilim14", 1), images: imgs("kilim14"), category: "Kilim", subcategory: "", stock: 25 },
    { name: "Antika Görünümlü Kilim 140x200", description: "Antika görünümlü el dokuma kilim. 140x200 cm. Özel renkler.", price: 6499.99, image: img("kilim15", 1), images: imgs("kilim15"), category: "Kilim", subcategory: "", stock: 9 },

    // ===================== PERDE (15) =====================
    { name: "Siyout Keten Perde 2x2.5m", description: "%100 keten siyout perde. 2m en, 2.5m boy. Doğal kumaş.", price: 1799.99, image: img("perde1", 1), images: imgs("perde1"), category: "Perde", subcategory: "", stock: 20 },
    { name: "Zebra Jaluzi Perde 150x200", description: "Gün ışığı kontrollü zebra jaluzi. 150x200 cm. Alüminyum.", price: 2499.99, image: img("perde2", 1), images: imgs("perde2"), category: "Perde", subcategory: "", stock: 15 },
    { name: "Tül Perde Şeffaf 3x2.5m", description: "Şeffaf tül perde. 3m en, 2.5m boy. Mekanlara ferahlık katar.", price: 999.99, image: img("perde3", 1), images: imgs("perde3"), category: "Perde", subcategory: "", stock: 50 },
    { name: "Karartma Stor Perde 100x180", description: "%100 karartma stor. 100x180 cm. Ölçüye özel kesim.", price: 1299.99, image: img("perde4", 1), images: imgs("perde4"), category: "Perde", subcategory: "", stock: 35 },
    { name: "Plise Perde 120x150", description: "Plise perde. 120x150 cm. Modern görünüm, kolay temizlik.", price: 1599.99, image: img("perde5", 1), images: imgs("perde5"), category: "Perde", subcategory: "", stock: 25 },
    { name: "Jaluzi Perde 90x200", description: "Alüminyum jaluzi perde. 90x200 cm. Işık ayarlı.", price: 1099.99, image: img("perde6", 1), images: imgs("perde6"), category: "Perde", subcategory: "", stock: 30 },
    { name: "Roma Perde 80x160", description: "Kumaş roma perde. 80x160 cm. Zarif katlamalar.", price: 2199.99, image: img("perde7", 1), images: imgs("perde7"), category: "Perde", subcategory: "", stock: 18 },
    { name: "Keten Perde 2x2m", description: "%100 keten perde. 2m en, 2m boy. Doğal renk tonları.", price: 1499.99, image: img("perde8", 1), images: imgs("perde8"), category: "Perde", subcategory: "", stock: 22 },
    { name: "İpek Görünümlü Perde 2x2.5m", description: "İpek görünümlü saten perde. 2x2.5m. Şık ve parlak.", price: 3299.99, image: img("perde9", 1), images: imgs("perde9"), category: "Perde", subcategory: "", stock: 10 },
    { name: "Çift Kat Perde Takımı", description: "Tül + keten çift kat perde. Her biri 2x2.5m. Komple set.", price: 3499.99, image: img("perde10", 1), images: imgs("perde10"), category: "Perde", subcategory: "", stock: 12 },
    { name: "Panjur Perde 150x180", description: "PVC panjur perde. 150x180 cm. Nem dayanımlı.", price: 2799.99, image: img("perde11", 1), images: imgs("perde11"), category: "Perde", subcategory: "", stock: 15 },
    { name: "Perde Aksesuar Seti", description: "Perde çubuğu + halka + başlık seti. 2m boy, siyah.", price: 899.99, image: img("perde12", 1), images: imgs("perde12"), category: "Perde", subcategory: "", stock: 40 },
    { name: "Bambu Jaluzi Perde 100x200", description: "Doğal bambu jaluzi. 100x200 cm. Çevre dostu.", price: 1899.99, image: img("perde13", 1), images: imgs("perde13"), category: "Perde", subcategory: "", stock: 20 },
    { name: "Enerji Tasarruflu Perde", description: "Isı yalıtımlı perde. 2x2.5m. Kışın sıcak, yazın serin.", price: 3999.99, image: img("perde14", 1), images: imgs("perde14"), category: "Perde", subcategory: "", stock: 8 },
    { name: "Güneşlik Rulo Perde 90x180", description: "Güneşlik stor perde. 90x180 cm. UV filtreli.", price: 999.99, image: img("perde15", 1), images: imgs("perde15"), category: "Perde", subcategory: "", stock: 45 },

    // ===================== NEVRESİM (15) =====================
    { name: "Çocuk Nevresim Takımı Tek Kişilik", description: "Renkli desenli çocuk nevresim takımı. Tek kişilik. %100 pamuk.", price: 899.99, image: img("nevC1", 1), images: imgs("nevC1"), category: "Nevresim", subcategory: "Çocuk Nevresim", stock: 30 },
    { name: "Çocuk Nevresim Araba Desenli", description: "Araba desenli çocuk nevresim. Tek kişilik. 1 yastık kılıfı dahil.", price: 799.99, image: img("nevC2", 1), images: imgs("nevC2"), category: "Nevresim", subcategory: "Çocuk Nevresim", stock: 25 },
    { name: "Çocuk Nevresim Prenses Desenli", description: "Prenses temalı kız çocuk nevresim takımı. Pamuklu kumaş.", price: 849.99, image: img("nevC3", 1), images: imgs("nevC3"), category: "Nevresim", subcategory: "Çocuk Nevresim", stock: 22 },
    { name: "Çocuk Nevresim Hayvan Figürlü", description: "Hayvan figürlü sevimli nevresim. Tek kişilik, renkli baskı.", price: 749.99, image: img("nevC4", 1), images: imgs("nevC4"), category: "Nevresim", subcategory: "Çocuk Nevresim", stock: 28 },
    { name: "Çocuk Nevresim Uzay Temalı", description: "Uzay temalı çocuk nevresim takımı. 3 parça, %100 pamuk.", price: 899.99, image: img("nevC5", 1), images: imgs("nevC5"), category: "Nevresim", subcategory: "Çocuk Nevresim", stock: 18 },
    { name: "2 Kişilik Nevresim Takımı Standart", description: "2 kişilik nevresim takımı. 200x220 cm yorgan, 2 yastık kılıfı.", price: 1299.99, image: img("nev2l1", 1), images: imgs("nev2l1"), category: "Nevresim", subcategory: "2 Kişilik Nevresim", stock: 20 },
    { name: "2 Kişilik Nevresim Saten Set", description: "Saten kumaş 2 kişilik nevresim. Lüks his, 5 parça set.", price: 1899.99, image: img("nev2l2", 1), images: imgs("nev2l2"), category: "Nevresim", subcategory: "2 Kişilik Nevresim", stock: 15 },
    { name: "2 Kişilik Nevresim Desenli", description: "Modern desenli 2 kişilik nevresim takımı. 240x220 cm.", price: 1499.99, image: img("nev2l3", 1), images: imgs("nev2l3"), category: "Nevresim", subcategory: "2 Kişilik Nevresim", stock: 18 },
    { name: "2 Kişilik Nevresim Pamuklu", description: "%100 pamuk 2 kişilik nevresim. Nefes alan kumaş, terletmez.", price: 1099.99, image: img("nev2l4", 1), images: imgs("nev2l4"), category: "Nevresim", subcategory: "2 Kişilik Nevresim", stock: 30 },
    { name: "2 Kişilik Nevresim Premium Set", description: "Premium 2 kişilik nevresim. İpek karışım, şık kutu ambalaj.", price: 2499.99, image: img("nev2l5", 1), images: imgs("nev2l5"), category: "Nevresim", subcategory: "2 Kişilik Nevresim", stock: 10 },
    { name: "Tek Kişilik Nevresim Takımı", description: "Tek kişilik nevresim takımı. 160x220 cm, 1 yastık kılıfı.", price: 699.99, image: img("nevT1", 1), images: imgs("nevT1"), category: "Nevresim", subcategory: "Tek Kişilik Nevresim", stock: 35 },
    { name: "Tek Kişilik Nevresim Pamuk", description: "%100 pamuk tek kişilik nevresim. 4 mevsim kullanım.", price: 599.99, image: img("nevT2", 1), images: imgs("nevT2"), category: "Nevresim", subcategory: "Tek Kişilik Nevresim", stock: 40 },
    { name: "Tek Kişilik Nevresim Desenli", description: "Renkli desenli tek kişilik nevresim. Genç odaları için.", price: 749.99, image: img("nevT3", 1), images: imgs("nevT3"), category: "Nevresim", subcategory: "Tek Kişilik Nevresim", stock: 25 },
    { name: "Tek Kişilik Nevresim Saten", description: "Saten tek kişilik nevresim. Kaygan parlak yüzey.", price: 999.99, image: img("nevT4", 1), images: imgs("nevT4"), category: "Nevresim", subcategory: "Tek Kişilik Nevresim", stock: 15 },
    { name: "Tek Kişilik Nevresim Organik", description: "Organik pamuk tek kişilik nevresim. Sertifikalı, bebek dostu.", price: 849.99, image: img("nevT5", 1), images: imgs("nevT5"), category: "Nevresim", subcategory: "Tek Kişilik Nevresim", stock: 20 },

    // ===================== YASTIK KILIFI (15) =====================
    { name: "Saten Yastık Kılıfı 50x70", description: "Saten yastık kılıfı 50x70 cm. Parlak yüzey, fermuarlı.", price: 249.99, image: img("yask1", 1), images: imgs("yask1"), category: "Yastık Kılıfı", subcategory: "", stock: 60 },
    { name: "Pamuk Yastık Kılıfı 50x70", description: "%100 pamuk yastık kılıfı. 50x70 cm. Nefes alan kumaş.", price: 149.99, image: img("yask2", 1), images: imgs("yask2"), category: "Yastık Kılıfı", subcategory: "", stock: 80 },
    { name: "Desenli Yastık Kılıfı Seti 2'li", description: "2'li desenli yastık kılıfı seti. 50x70 cm, renkli baskı.", price: 399.99, image: img("yask3", 1), images: imgs("yask3"), category: "Yastık Kılıfı", subcategory: "", stock: 45 },
    { name: "Keten Yastık Kılıfı 50x70", description: "%100 keten yastık kılıfı. Doğal doku, zamansız şıklık.", price: 349.99, image: img("yask4", 1), images: imgs("yask4"), category: "Yastık Kılıfı", subcategory: "", stock: 35 },
    { name: "Kadife Yastık Kılıfı 40x40", description: "Kadife yastık kılıfı 40x40 cm. Yumuşak dokunuş, lüks his.", price: 299.99, image: img("yask5", 1), images: imgs("yask5"), category: "Yastık Kılıfı", subcategory: "", stock: 40 },
    { name: "Nakışlı Yastık Kılıfı 50x70", description: "El nakışı yastık kılıfı 50x70 cm. Özel tasarım.", price: 499.99, image: img("yask6", 1), images: imgs("yask6"), category: "Yastık Kılıfı", subcategory: "", stock: 20 },
    { name: "Yün Yastık Kılıfı 50x70", description: "Yün yastık kılıfı. Doğal sıcaklık, kış ayları için ideal.", price: 449.99, image: img("yask7", 1), images: imgs("yask7"), category: "Yastık Kılıfı", subcategory: "", stock: 25 },
    { name: "Spor Yastık Kılıfı 40x60", description: "Spor temalı yastık kılıfı. 40x60 cm. Erkek odası için.", price: 199.99, image: img("yask8", 1), images: imgs("yask8"), category: "Yastık Kılıfı", subcategory: "", stock: 50 },
    { name: "Çocuk Yastık Kılıfı 40x50", description: "Çocuk odası yastık kılıfı. 40x50 cm. Eğlenceli desenler.", price: 129.99, image: img("yask9", 1), images: imgs("yask9"), category: "Yastık Kılıfı", subcategory: "", stock: 55 },
    { name: "İpek Yastık Kılıfı 50x70", description: "%100 ipek yastık kılıfı. Saç ve cilt dostu, kaygan yüzey.", price: 799.99, image: img("yask10", 1), images: imgs("yask10"), category: "Yastık Kılıfı", subcategory: "", stock: 15 },
    { name: "Bambu Yastık Kılıfı 50x70", description: "Bambu lifi yastık kılıfı. Antibakteriyel, çevre dostu.", price: 399.99, image: img("yask11", 1), images: imgs("yask11"), category: "Yastık Kılıfı", subcategory: "", stock: 30 },
    { name: "Yastık Kılıfı Seti 4'lü 50x70", description: "4'lü yastık kılıfı seti. 50x70 cm. 4 farklı renk.", price: 799.99, image: img("yask12", 1), images: imgs("yask12"), category: "Yastık Kılıfı", subcategory: "", stock: 35 },
    { name: "Mikrofiber Yastık Kılıfı 50x70", description: "Mikrofiber yastık kılıfı. Hızlı kurur, ütü gerektirmez.", price: 179.99, image: img("yask13", 1), images: imgs("yask13"), category: "Yastık Kılıfı", subcategory: "", stock: 70 },
    { name: "Folyo Yastık Kılıfı 50x70", description: "Su geçirmez folyo yastık kılıfı. Alerji ve yatak koruma.", price: 299.99, image: img("yask14", 1), images: imgs("yask14"), category: "Yastık Kılıfı", subcategory: "", stock: 40 },
    { name: "Özel Baskı Yastık Kılıfı 50x70", description: "Kişiselleştirilmiş baskı yastık kılıfı. İstediğiniz desen.", price: 349.99, image: img("yask15", 1), images: imgs("yask15"), category: "Yastık Kılıfı", subcategory: "", stock: 20 },

    // ===================== MİNDER (15) =====================
    { name: "Kare Minder 40x40 cm", description: "Dekoratif kare minder. 40x40 cm. Çıkarılabilir kılıf.", price: 299.99, image: img("mind1", 1), images: imgs("mind1"), category: "Minder", subcategory: "", stock: 50 },
    { name: "Dikdörtgen Minder 30x50 cm", description: "Dikdörtgen oturma minderi. 30x50 cm. Sırt destekli.", price: 349.99, image: img("mind2", 1), images: imgs("mind2"), category: "Minder", subcategory: "", stock: 40 },
    { name: "Yuvarlak Minder 40cm", description: "Yuvarlak dekoratif minder. 40 cm çap. Puf görünümlü.", price: 399.99, image: img("mind3", 1), images: imgs("mind3"), category: "Minder", subcategory: "", stock: 35 },
    { name: "Yer Minderi 60x60 cm", description: "Büyük yer minderi. 60x60 cm. Sağlam dikiş, kaymaz taban.", price: 599.99, image: img("mind4", 1), images: imgs("mind4"), category: "Minder", subcategory: "", stock: 25 },
    { name: "Balkon Minderi 40x120", description: "Balkon bankı için minder. 40x120 cm. Su itici kumaş.", price: 699.99, image: img("mind5", 1), images: imgs("mind5"), category: "Minder", subcategory: "", stock: 20 },
    { name: "Sandalye Minderi 40x40", description: "Yemek sandalyesi minderi. 40x40 cm. Bağcıklı sabitleme.", price: 199.99, image: img("mind6", 1), images: imgs("mind6"), category: "Minder", subcategory: "", stock: 60 },
    { name: "Sırt Minderi 40x60 cm", description: "Bel destek sırt minderi. 40x60 cm. Ortopedik tasarım.", price: 449.99, image: img("mind7", 1), images: imgs("mind7"), category: "Minder", subcategory: "", stock: 30 },
    { name: "Sehpa Minderi 50x50", description: "Yer sehpası için minder. 50x50 cm. Şık desen, kalın dolgu.", price: 499.99, image: img("mind8", 1), images: imgs("mind8"), category: "Minder", subcategory: "", stock: 22 },
    { name: "Çocuk Minderi 30x30", description: "Çocuk oturma minderi. 30x30 cm. Renkli ve eğlenceli tasarım.", price: 129.99, image: img("mind9", 1), images: imgs("mind9"), category: "Minder", subcategory: "", stock: 65 },
    { name: "Puf Minder 50x50 cm", description: "Puf minder 50x50 cm. İçi dolu, dikdörtgen form.", price: 799.99, image: img("mind10", 1), images: imgs("mind10"), category: "Minder", subcategory: "", stock: 15 },
    { name: "Araba Minderi Seti 2'li", description: "Ön koltuk araba minderi seti. 2'li, kaymaz tabanlı.", price: 599.99, image: img("mind11", 1), images: imgs("mind11"), category: "Minder", subcategory: "", stock: 28 },
    { name: "Hamak Minder", description: "Bahçe hamak minderi. 120x50 cm. Yumuşak sünger.", price: 449.99, image: img("mind12", 1), images: imgs("mind12"), category: "Minder", subcategory: "", stock: 12 },
    { name: "Sehpa Altı Minder 80x40", description: "Sehpa altı minder. 80x40 cm. Kaydırmaz taban.", price: 549.99, image: img("mind13", 1), images: imgs("mind13"), category: "Minder", subcategory: "", stock: 18 },
    { name: "Minder Kılıfı 40x40 Set 4'lü", description: "4'lü minder kılıfı seti. 40x40 cm. Çıkarılabilir, yıkanabilir.", price: 699.99, image: img("mind14", 1), images: imgs("mind14"), category: "Minder", subcategory: "", stock: 35 },
    { name: "Lüks Kadife Minder 45x45", description: "Kadife kumaş minder. 45x45 cm. Fermuarlı, premium dolgu.", price: 449.99, image: img("mind15", 1), images: imgs("mind15"), category: "Minder", subcategory: "", stock: 20 },

    // ===================== PUZZLE (15) =====================
    { name: "Çocuk Puzzle 60 Parça", description: "60 parça çocuk puzzle. Büyük parçalar, kolay birleştirme.", price: 149.99, image: img("puzzC1", 1), images: imgs("puzzC1"), category: "Puzzle", subcategory: "Çocuk Puzzle", stock: 80 },
    { name: "Çocuk Puzzle 100 Parça", description: "100 parça çocuk puzzle. Hayvan temalı, renkli baskı.", price: 199.99, image: img("puzzC2", 1), images: imgs("puzzC2"), category: "Puzzle", subcategory: "Çocuk Puzzle", stock: 60 },
    { name: "Çocuk Puzzle 150 Parça", description: "150 parça çocuk puzzle. Araba ve taşıt temalı.", price: 249.99, image: img("puzzC3", 1), images: imgs("puzzC3"), category: "Puzzle", subcategory: "Çocuk Puzzle", stock: 55 },
    { name: "Çocuk Puzzle 200 Parça", description: "200 parça çocuk puzzle. Çizgi film kahramanları.", price: 299.99, image: img("puzzC4", 1), images: imgs("puzzC4"), category: "Puzzle", subcategory: "Çocuk Puzzle", stock: 45 },
    { name: "Çocuk Puzzle Dinozor 100 Parça", description: "Dinozor temalı çocuk puzzle. 100 parça, büyük boy.", price: 219.99, image: img("puzzC5", 1), images: imgs("puzzC5"), category: "Puzzle", subcategory: "Çocuk Puzzle", stock: 50 },
    { name: "Çocuk Puzzle Uzay 150 Parça", description: "Uzay temalı puzzle. 150 parça. Parlak renkler, eğitici.", price: 269.99, image: img("puzzC6", 1), images: imgs("puzzC6"), category: "Puzzle", subcategory: "Çocuk Puzzle", stock: 40 },
    { name: "Çocuk Puzzle Çiftlik 60 Parça", description: "Çiftlik hayvanları puzzle. 60 parça. 2+ yaş için uygun.", price: 129.99, image: img("puzzC7", 1), images: imgs("puzzC7"), category: "Puzzle", subcategory: "Çocuk Puzzle", stock: 70 },
    { name: "Yetişkin Puzzle 500 Parça", description: "500 parça yetişkin puzzle. Manzara temalı, kaliteli baskı.", price: 349.99, image: img("puzzY1", 1), images: imgs("puzzY1"), category: "Puzzle", subcategory: "Yetişkin Puzzle", stock: 35 },
    { name: "Yetişkin Puzzle 1000 Parça", description: "1000 parça yetişkin puzzle. Zorlayıcı ve keyifli.", price: 499.99, image: img("puzzY2", 1), images: imgs("puzzY2"), category: "Puzzle", subcategory: "Yetişkin Puzzle", stock: 25 },
    { name: "Yetişkin Puzzle 1500 Parça", description: "1500 parça premium puzzle. Sanat eseri kalitesinde baskı.", price: 699.99, image: img("puzzY3", 1), images: imgs("puzzY3"), category: "Puzzle", subcategory: "Yetişkin Puzzle", stock: 15 },
    { name: "Yetişkin Puzzle 2000 Parça", description: "2000 parça dev puzzle. Haftalarca süren keyif.", price: 899.99, image: img("puzzY4", 1), images: imgs("puzzY4"), category: "Puzzle", subcategory: "Yetişkin Puzzle", stock: 10 },
    { name: "Yetişkin Puzzle Panorama 1000", description: "Panoramik puzzle 1000 parça. Geniş manzara görüntüsü.", price: 549.99, image: img("puzzY5", 1), images: imgs("puzzY5"), category: "Puzzle", subcategory: "Yetişkin Puzzle", stock: 20 },
    { name: "Yetişkin Puzzle 3D 500 Parça", description: "3D puzzle 500 parça. Ünlü yapılar, eğlenceli deneyim.", price: 799.99, image: img("puzzY6", 1), images: imgs("puzzY6"), category: "Puzzle", subcategory: "Yetişkin Puzzle", stock: 12 },
    { name: "Yetişkin Puzzle Gece Manzarası", description: "Gece manzarası puzzle. 1000 parça. Floresan efekt.", price: 599.99, image: img("puzzY7", 1), images: imgs("puzzY7"), category: "Puzzle", subcategory: "Yetişkin Puzzle", stock: 18 },
    { name: "Yetişkin Puzzle Vintage 1000", description: "Vintage harita puzzle. 1000 parça. Koleksiyonluk.", price: 449.99, image: img("puzzY8", 1), images: imgs("puzzY8"), category: "Puzzle", subcategory: "Yetişkin Puzzle", stock: 22 },

    // ===================== HEDİYELİK ÜRÜNLER (15) =====================
    { name: "Kişisel Baskı Kupa", description: "Kişiselleştirilmiş seramik kupa. 350ml. Fotoğraf veya yazı baskı.", price: 149.99, image: img("hedi1", 1), images: imgs("hedi1"), category: "Hediyelik Ürünler", subcategory: "", stock: 100 },
    { name: "Ahşap Fotoğraf Çerçevesi 15x20", description: "Masif ahşap fotoğraf çerçevesi. 15x20 cm. Doğal renk.", price: 249.99, image: img("hedi2", 1), images: imgs("hedi2"), category: "Hediyelik Ürünler", subcategory: "", stock: 60 },
    { name: "Magnet Seti 10'lu", description: "10'lu dekoratif magnet seti. Çeşitli desenler, güçlü mıknatıs.", price: 199.99, image: img("hedi3", 1), images: imgs("hedi3"), category: "Hediyelik Ürünler", subcategory: "", stock: 80 },
    { name: "El Yapımı Mum 200g", description: "El yapımı soya mumu. 200g. Lavanta kokulu.", price: 299.99, image: img("hedi4", 1), images: imgs("hedi4"), category: "Hediyelik Ürünler", subcategory: "", stock: 50 },
    { name: "Anahtarlık Seti 5'li", description: "Deri anahtarlık seti. 5 farklı renk. Lazer baskı.", price: 249.99, image: img("hedi5", 1), images: imgs("hedi5"), category: "Hediyelik Ürünler", subcategory: "", stock: 70 },
    { name: "Ajanda 2025 Lüx", description: "Deri kaplı lüks ajanda. 2025 yılı. Haftalık ve aylık planlayıcı.", price: 449.99, image: img("hedi6", 1), images: imgs("hedi6"), category: "Hediyelik Ürünler", subcategory: "", stock: 40 },
    { name: "Kalem Seti 5'li Metal", description: "Metal kalem seti. 5 farklı uç. Hediye kutusunda.", price: 599.99, image: img("hedi7", 1), images: imgs("hedi7"), category: "Hediyelik Ürünler", subcategory: "", stock: 30 },
    { name: "Bardak Altı Seti 6'lı Mantar", description: "Mantar bardak altı seti. 6'lı, 10 cm çap.", price: 179.99, image: img("hedi8", 1), images: imgs("hedi8"), category: "Hediyelik Ürünler", subcategory: "", stock: 55 },
    { name: "Dekoratif Tabak 20cm", description: "El yapımı dekoratif tabak. 20 cm. Seramik, duvar süsü.", price: 399.99, image: img("hedi9", 1), images: imgs("hedi9"), category: "Hediyelik Ürünler", subcategory: "", stock: 25 },
    { name: "Fotograf Albümü 100 Sayfa", description: "Deri fotoğraf albümü. 100 sayfa, 15x20 cm.", price: 499.99, image: img("hedi10", 1), images: imgs("hedi10"), category: "Hediyelik Ürünler", subcategory: "", stock: 35 },
    { name: "Hediye Sepeti Küçük", description: "Küçük hediye sepeti. Çay, çikolata ve mum içerir.", price: 899.99, image: img("hedi11", 1), images: imgs("hedi11"), category: "Hediyelik Ürünler", subcategory: "", stock: 20 },
    { name: "Hediye Sepeti Büyük", description: "Büyük hediye sepeti. Premium ürünler, şık sunum.", price: 1899.99, image: img("hedi12", 1), images: imgs("hedi12"), category: "Hediyelik Ürünler", subcategory: "", stock: 10 },
    { name: "Kişisel Baskı Tişört", description: "Kişiselleştirilmiş tişört. İstediğiniz desen ve yazı.", price: 299.99, image: img("hedi13", 1), images: imgs("hedi13"), category: "Hediyelik Ürünler", subcategory: "", stock: 45 },
    { name: "Kolye Ucu Seti", description: "Takı seti. Kolye + küpe. Gümüş kaplama, hediye kutusu.", price: 799.99, image: img("hedi14", 1), images: imgs("hedi14"), category: "Hediyelik Ürünler", subcategory: "", stock: 25 },
    { name: "Doğal Taş Bileklik", description: "El yapımı doğal taş bileklik. Ayarlanabilir boy.", price: 199.99, image: img("hedi15", 1), images: imgs("hedi15"), category: "Hediyelik Ürünler", subcategory: "", stock: 65 },
  ];

  for (const product of products) {
    const existing = await prisma.product.findFirst({ where: { name: product.name } });
    if (!existing) {
      await prisma.product.create({ data: product });
    }
  }

  // Seed dealer users
  const dealerPassword = await hashPassword("Dealer123");
  const dealers = await prisma.dealer.findMany({ take: 20 });
  for (const d of dealers) {
    await prisma.user.upsert({
      where: { email: d.email },
      update: { password: dealerPassword },
      create: { email: d.email, name: d.name, password: dealerPassword, role: "dealer", dealerId: d.id },
    });
  }
  console.log(`Dealer accounts synced: ${dealers.length}`);
  console.log(`Dealer login: any dealer email / Dealer123`);

  // Seed default pages
  const defaultPages = [
    { title: "SSS", slug: "sss", content: "<h2>Sıkça Sorulan Sorular</h2><p>Bu sayfa yapım aşamasındadır.</p>", order: 1 },
    { title: "Kargo ve Teslimat", slug: "kargo-ve-teslimat", content: "<h2>Kargo ve Teslimat</h2><p>Kargo ve teslimat bilgilerimiz burada yer alacaktır.</p>", order: 2 },
    { title: "İade Politikası", slug: "iade-politikasi", content: "<h2>İade Politikası</h2><p>İade politikamız burada yer alacaktır.</p>", order: 3 },
    { title: "İletişim", slug: "iletisim", content: "<h2>İletişim</h2><p>E-posta: info@enaunity.com<br>Telefon: +90 (212) 555 00 00</p>", order: 4 },
  ];
  for (const p of defaultPages) {
    await prisma.page.upsert({ where: { slug: p.slug }, update: p, create: p });
  }

  console.log("Seed completed successfully!");
  console.log(`Total products: ${products.length}`);
  console.log(`Admin: admin@enaunity.com / admin123`);
  console.log(`User: user@enaunity.com / user123`);
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
