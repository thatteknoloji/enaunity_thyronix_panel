import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

const CATEGORIES = ["Cam Tablo","Mdf Tablo","Halı","Kilim","Perde","Nevresim","Yastık Kılıfı","Minder","Puzzle","Hediyelik Ürünler"];
const SIZES = ["25x35","30x45","50x70","70x90","100x50","120x80","40x60","60x90"];
const COLORS = ["Çok Renkli","Kırmızı","Lacivert","Yeşil","Siyah","Beyaz","Turuncu"];
const CITIES = ["İstanbul","Ankara","İzmir","Bursa","Antalya","Gaziantep","Konya","Adana"];

const NAMES = [
  "Modern Soyut {cat}", "Klasik {cat}", "Vintage {cat}", "Minimal {cat}",
  "Bohem {cat}", "Endüstriyel {cat}", "Retro {cat}", "Naturel {cat}",
  "Artistik {cat}", "Premium {cat}", "Lüks {cat}", "El Yapımı {cat}",
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function price(cat: string): number {
  const map: Record<string, number> = {"Cam Tablo":150,"Mdf Tablo":120,"Halı":400,"Kilim":350,"Perde":250,"Nevresim":200,"Yastık Kılıfı":80,"Minder":90,"Puzzle":60,"Hediyelik Ürünler":45};
  return map[cat] || 100;
}
function imageSlug(cat: string): string {
  const map: Record<string, string> = {
    "Cam Tablo": "cam-tablo", "Mdf Tablo": "mdf-tablo", "Halı": "hali",
    "Kilim": "kilim", "Perde": "perde", "Nevresim": "nevresim",
    "Yastık Kılıfı": "yastik-kılıfı", "Minder": "minder",
    "Puzzle": "puzzle", "Hediyelik Ürünler": "hediyelik-urunler",
  };
  return map[cat] || cat.toLowerCase().replace(/\s+/g, "-");
}

export async function POST() {
  try {
    // Clean existing data (order matters for FK constraints)
    await prisma.stockCountItem.deleteMany();
    await prisma.stockCount.deleteMany();
    await prisma.stockMovement.deleteMany();
    await prisma.orderAttachment.deleteMany();
    await prisma.dealerTransaction.deleteMany();
    await prisma.returnItem.deleteMany();
    await prisma.returnRequest.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.paymentTerm.deleteMany();
    await prisma.quoteItem.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.shippingConfig.deleteMany();
    await prisma.priceList.deleteMany();
    await prisma.catalogRestriction.deleteMany();
    await prisma.tieredPrice.deleteMany();
    await prisma.dealerPrice.deleteMany();
    await prisma.bundleItem.deleteMany();
    await prisma.bundle.deleteMany();
    await prisma.campaignProduct.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.variant.deleteMany();
    await prisma.variantOption.deleteMany();
    await prisma.variantGroup.deleteMany();
    await prisma.review.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.orderStatusHistory.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.apiKey.deleteMany();
    await prisma.product.deleteMany();
    await prisma.dealer.deleteMany();
    await prisma.dealerGroup.deleteMany();
    await prisma.category.deleteMany();
    console.log("Cleaned existing data");

    // Categories
    const categoryRecords = [];
    for (const name of CATEGORIES) {
      const cat = await prisma.category.create({ data: { name, slug: name.toLowerCase().replace(/\s+/g, "-") } });
      categoryRecords.push(cat);
      // Sub-categories
      await prisma.category.create({ data: { name: `${name} Setler`, slug: `${cat.slug}-setler`, parentId: cat.id } });
    }

    // Dealer Groups (individual creates, skip if exists)
    const groupData = [
      { name: "bronze", discountRate: 0, creditLimit: 0, allowNegativeBalance: false, minOrderAmount: 0, paymentDays: 0 },
      { name: "silver", discountRate: 5, creditLimit: 10000, allowNegativeBalance: true, minOrderAmount: 2000, paymentDays: 30 },
      { name: "gold", discountRate: 10, creditLimit: 50000, allowNegativeBalance: true, minOrderAmount: 5000, paymentDays: 60 },
      { name: "platinum", discountRate: 15, creditLimit: 100000, allowNegativeBalance: true, minOrderAmount: 10000, paymentDays: 90 },
    ];
    for (const g of groupData) {
      await prisma.dealerGroup.upsert({ where: { name: g.name }, update: {}, create: g });
    }

    // Admin role + user
    const superAdminRole = await prisma.adminRole.upsert({
      where: { name: "Super Admin" },
      update: {},
      create: { name: "Super Admin", description: "Tüm yetkilere sahip admin", isSystem: true, permissions: JSON.stringify(["*"]) },
    });

    const adminPw = await hashPassword("admin123");
    const admin = await prisma.user.upsert({
      where: { email: "admin@enaunity.com" },
      update: { adminRoleId: superAdminRole.id },
      create: {
        email: "admin@enaunity.com", name: "Admin", password: adminPw, role: "admin", adminRoleId: superAdminRole.id,
      },
    });
    const adminId = admin.id;

    // Dealers
    const dealerNames = ["Kaya Ticaret Ltd","Aslan Tekstil AŞ","Deniz Home","Yıldız İthalat","Bereket Perakende"];
    const dealers = [];
    for (let i = 0; i < dealerNames.length; i++) {
      const d = await prisma.dealer.create({
        data: {
          name: `${dealerNames[i]} Yetkilisi`,
          title: pick(["Genel Müdür","Satın Alma Müdürü","İşletme Sahibi","Operasyon Yöneticisi"]),
          email: `${dealerNames[i].toLowerCase().replace(/\s+/g,'').slice(0,10)}@test.com`,
          phone: `05${rand(30,55)}${rand(100,999)}${rand(10,99)}${rand(10,99)}`,
          company: dealerNames[i],
          location: pick(CITIES),
          companySize: pick(["10-50","50-200","200-500","500+"]),
          markets: "Türkiye",
          group: ["bronze","silver","gold","platinum"][i],
          discountRate: [0,5,10,15][i],
          creditLimit: [0,10000,50000,100000][i],
          balance: [0,5000,25000,75000][i],
          taxNumber: `${rand(100,999)}${rand(100,999)}${rand(100,999)}`,
          taxOffice: pick(["Kadıköy","Beşiktaş","Çankaya","Konak","Muratpaşa"]),
          billingAddress: `${dealerNames[i]} Mah. Ticaret Cad. No:${rand(1,100)} ${pick(CITIES)}`,
          shippingAddress: `${dealerNames[i]} Depo Sok. No:${rand(1,50)} ${pick(CITIES)}`,
        },
      });
      dealers.push(d);
      // Create user for dealer
      try {
        await prisma.user.upsert({
          where: { email: d.email },
          update: { dealerId: d.id, role: "dealer" },
          create: { name: d.name, email: d.email, password: "$2a$12$LJ3m4ys3GZfFqK8xjFqNxOMRAPxHkDq5mHgqXTC8BqIRFvqzFF0kO", dealerId: d.id, role: "dealer" },
        });
      } catch (e) {
        // user may already exist with different role, skip
      }
    }

    // Products
    const products = [];
    for (let i = 0; i < 50; i++) {
      const cat = pick(CATEGORIES);
      const name = pick(NAMES).replace("{cat}", cat);
      const basePrice = price(cat);
      const p = await prisma.product.create({
        data: {
          name, description: `${name} - Yüksek kaliteli malzemeden üretilmiştir. Dayanıklı ve uzun ömürlü. ${pick(CITIES)}'da üretilmiştir.`,
          price: basePrice + rand(-20, 50),
          stock: rand(5, 200),
          minStockLevel: rand(5, 30),
          maxStockLevel: rand(100, 500),
          category: cat,
          brand: pick(["ENA Home","ArtDesign","ModernLife","ClassDecor"]),
          sku: `${cat.slice(0,3).toUpperCase()}-${String(i+1).padStart(4,'0')}`,
          barcode: `2${Date.now().toString().slice(-9)}${(i+1).toString().padStart(3,'0')}`,
          modelCode: `${cat.slice(0,4).toLowerCase()}${String(i+1).padStart(3,'0')}`,
          weight: rand(1, 15),
          dimensions: `${rand(20,120)}x${rand(20,120)}x${rand(2,20)} cm`,
          tags: ["yeni","popüler","indirim","son şans"].slice(0, rand(1,3)).join(", "),
          image: `/images/products/${imageSlug(cat)}-${(i % 5) + 1}.jpg`,
          images: JSON.stringify([
            `/images/products/${imageSlug(cat)}-${(i % 5) + 1}.jpg`,
            `/images/products/${imageSlug(cat)}-${((i + 1) % 5) + 1}.jpg`,
          ]),
          specs: JSON.stringify([
            { key: "Malzeme", value: pick(["Ahşap","Metal","Pamuk","Polyester","Bambu","Seramik"]) },
            { key: "Menşei", value: "Türkiye" },
            { key: "Garanti", value: "2 Yıl" },
          ]),
        },
      });
      products.push(p);

      // Variants for some products
      if (i < 15) {
        const sizeGroup = await prisma.variantGroup.create({ data: { productId: p.id, name: "Boyut", options: { create: pick([SIZES.slice(0,2), SIZES.slice(0,3), SIZES.slice(2,5), SIZES.slice(3,6)]).map((s, j) => ({ value: s, sortOrder: j })) } }, include: { options: true } });
        const colorGroup = await prisma.variantGroup.create({ data: { productId: p.id, name: "Renk", options: { create: pick([COLORS.slice(0,1), COLORS.slice(0,2), COLORS.slice(1,3)]).map((c, j) => ({ value: c, sortOrder: j })) } }, include: { options: true } });

        for (const size of sizeGroup.options) {
          for (const color of colorGroup.options) {
            await prisma.variant.create({
              data: {
                productId: p.id,
                sku: `${p.sku}-${size.value.replace("x","")}-${color.value.slice(0,3).toUpperCase()}`,
                barcode: `2${Date.now().toString().slice(-11)}${rand(100,999)}`,
                price: p.price + rand(-20, 50),
                stock: rand(0, 50),
                options: JSON.stringify([{ group: "Boyut", value: size.value }, { group: "Renk", value: color.value }]),
              },
            });
          }
        }
      }
    }

    // Orders
    const statuses = ["delivered","delivered","delivered","delivered","shipped","shipped","approved","pending","pending_approval","pending_approval"];
    for (let i = 0; i < 25; i++) {
      const dealer = pick(dealers);
      const status = statuses[i % statuses.length];
      const daysAgo = rand(1, 60);
      const createdAt = new Date(Date.now() - daysAgo * 86400000);
      const itemCount = rand(1, 4);
      let total = 0;
      const items: Array<{ productId: string; quantity: number; price: number }> = [];

      const usedProducts = new Set<string>();
      for (let j = 0; j < itemCount; j++) {
        const prod = pick(products);
        if (usedProducts.has(prod.id)) continue;
        usedProducts.add(prod.id);
        const qty = rand(1, 15);
        const itemPrice = prod.price * (1 - dealer.discountRate / 100);
        items.push({ productId: prod.id, quantity: qty, price: itemPrice });
        total += itemPrice * qty;
      }

      const order = await prisma.order.create({
        data: {
          userId: adminId || "system",
          dealerId: dealer.id,
          total,
          status,
          address: `${dealer.shippingAddress}`,
          createdAt,
          items: { create: items.map(it => ({ productId: it.productId, quantity: it.quantity, price: it.price })) },
          statusHistory: {
            create: [
              { status: "pending_approval", note: "Sipariş oluşturuldu", changedBy: "dealer", createdAt: new Date(createdAt.getTime() - 3600000) },
              ...(status !== "pending_approval" ? [{ status: "approved", note: "Admin onayladı", changedBy: "admin", createdAt: new Date(createdAt.getTime() - 1800000) }] : []),
              ...(status === "shipped" || status === "delivered" ? [{ status: "shipped", note: "Kargoya verildi", changedBy: "admin", createdAt: new Date(createdAt.getTime() - 900000) }] : []),
              { status, note: `Durum: ${status}`, changedBy: "system", createdAt },
            ],
          },
        },
      });

      // Stock movements for delivered/shipped orders
      if (status !== "pending_approval" && status !== "pending") {
        for (const item of items) {
          await prisma.stockMovement.create({ data: { productId: item.productId, type: "exit", quantity: item.quantity, note: `Sipariş #${order.id.slice(0,8)}`, orderId: order.id, createdAt } });
        }
      }
    }

    // Reviews
    for (let i = 0; i < 15; i++) {
      const prod = pick(products);
      const dealer = pick(dealers);
      await prisma.review.create({
        data: {
          productId: prod.id,
          userId: adminId || "system",
          rating: rand(3, 5),
          comment: pick(["Çok kaliteli ürün, hızlı kargo.","Beklediğimden iyi çıktı.","Kurumsal alım için ideal.","Renkler çok canlı.","Ambalaj süper, hasarsız geldi.","Fiyat performans ürünü.","Tekrar sipariş vereceğim."]),
          approved: Math.random() > 0.2,
        },
      });
    }

    // Warehouse
    const warehouse = await prisma.warehouse.create({
      data: { name: "Merkez Depo", location: "İstanbul", isDefault: true },
    });

    // ProductWarehouse
    for (const product of products) {
      await prisma.productWarehouse.create({
        data: { productId: product.id, warehouseId: warehouse.id, stock: product.stock },
      });
    }

    // Campaigns
    const campaignTypes = [
      { name: "Yeni Sezon İndirimi", type: "quantity_discount", discountType: "percentage", discountValue: 15, minAmount: 500, minQuantity: 3, badge: "%15 İndirim", badgeColor: "#e50914" },
      { name: "Kargo Bedava", type: "free_shipping", freeShipping: true, minAmount: 1000, badge: "Kargo Bedava", badgeColor: "#22c55e" },
      { name: "İlk Sipariş İndirimi", type: "first_order", discountType: "percentage", discountValue: 10, maxDiscount: 500, badge: "İlk Sipariş", badgeColor: "#3b82f6" },
      { name: "Halı Kategorisi İndirimi", type: "category_discount", discountType: "percentage", discountValue: 20, categoryScope: JSON.stringify(["Halı"]), badge: "%20 Halı İndirimi", badgeColor: "#a855f7" },
      { name: "Sadakat İndirimi", type: "loyalty", discountType: "percentage", discountValue: 5, orderCountMin: 5, badge: "Sadakat", badgeColor: "#f59e0b" },
    ];
    for (const camp of campaignTypes) {
      await prisma.campaign.create({ data: camp });
    }

    // Coupons
    const coupons = [
      { code: "HOOSGELDIN10", type: "percentage", value: 10, minAmount: 0, maxDiscount: 200, usageLimit: 100, active: true },
      { code: "KURUMSAL500", type: "fixed", value: 500, minAmount: 5000, maxDiscount: 0, usageLimit: 50, active: true },
      { code: "YAZ2024", type: "percentage", value: 15, minAmount: 1000, maxDiscount: 750, usageLimit: 200, active: true },
    ];
    for (const coupon of coupons) {
      await prisma.coupon.create({ data: { ...coupon, expiresAt: new Date(Date.now() + 365 * 86400000) } });
    }

    // PriceList for dealer groups
    const discountMap: Record<string, number> = { silver: 5, gold: 10, platinum: 15 };
    for (const product of products) {
      for (const group of ["silver", "gold", "platinum"]) {
        await prisma.priceList.create({
          data: { group, productId: product.id, price: Math.round(product.price * (1 - discountMap[group] / 100)) },
        });
      }
    }

    // Bundle
    const bundle = await prisma.bundle.create({
      data: { name: "Ev Dekorasyon Seti", description: "Modern ev dekorasyonu için bir arada", price: 599, image: "/images/products/dekorasyon-1.jpg", active: true },
    });
    for (let i = 0; i < 3 && i < products.length; i++) {
      await prisma.bundleItem.create({ data: { bundleId: bundle.id, productId: products[i].id, quantity: 1 } });
    }

    // ShippingConfig
    await prisma.shippingConfig.create({
      data: { type: "general", carrier: "Yurtiçi Kargo", basePrice: 49.90, perDesi: 4.50, freeOver: 1000, active: true },
    });

    // Contracts (hazır sözleşme şablonları)
    const contractTemplates = [
      {
        title: "KVKK Aydınlatma Metni",
        slug: "kvkk",
        type: "public",
        content: `<h2>Kişisel Verilerin Korunması ve İşlenmesi Hakkında Aydınlatma Metni</h2>
<p>Enaunity® olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, kişisel verilerinizin işlenmesi ve korunması konusunda sizleri bilgilendirmek isteriz.</p>
<h3>Veri Sorumlusu</h3>
<p>Kişisel verileriniz, veri sorumlusu sıfatıyla Enaunity® tarafından aşağıda açıklanan kapsamda işlenebilecektir.</p>
<h3>Kişisel Verilerin İşlenme Amacı</h3>
<p>Toplanan kişisel verileriniz, platform hizmetlerinin sunulması, sipariş süreçlerinin yürütülmesi, müşteri memnuniyetinin artırılması, pazarlama faaliyetlerinin planlanması ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenmektedir.</p>
<h3>Kişisel Verilerin Aktarılması</h3>
<p>Kişisel verileriniz, yukarıda belirtilen amaçların gerçekleştirilmesi doğrultusunda, iş ortaklarımıza, tedarikçilerimize, kargo şirketlerine ve kanunen yetkili kamu kurumlarına aktarılabilecektir.</p>
<h3>Haklarınız</h3>
<p>KVKK'nın 11. maddesi uyarınca, kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenme amacını sorgulama, yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme, eksik/yanlış işlenmişse düzeltilmesini isteme, KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde silinmesini/yok edilmesini isteme ve işlenmesi nedeniyle zarara uğramanız halinde zararın giderilmesini talep etme haklarına sahipsiniz.</p>`,
      },
      {
        title: "Gizlilik Politikası",
        slug: "gizlilik-politikasi",
        type: "public",
        content: `<h2>Gizlilik Politikası</h2>
<p>Enaunity® olarak, kullanıcılarımızın gizliliğine büyük önem vermekteyiz. Bu Gizlilik Politikası, platformumuzu kullanırken hangi bilgilerin toplandığını, bu bilgilerin nasıl kullanıldığını ve korunduğunu açıklamaktadır.</p>
<h3>Toplanan Bilgiler</h3>
<p>Platformumuzu kullanırken aşağıdaki bilgiler toplanabilir: ad, soyad, e-posta adresi, telefon numarası, fatura ve teslimat adresi, şirket bilgileri, vergi numarası, IP adresi, tarayıcı bilgileri ve çerezler aracılığıyla toplanan kullanım alışkanlıkları.</p>
<h3>Bilgilerin Kullanımı</h3>
<p>Toplanan bilgiler, siparişlerin işlenmesi, müşteri hizmetlerinin sağlanması, platformun geliştirilmesi, pazarlama ve reklam faaliyetleri, yasal yükümlülüklerin yerine getirilmesi amaçlarıyla kullanılmaktadır.</p>
<h3>Çerezler</h3>
<p>Platformumuz, kullanıcı deneyimini iyileştirmek ve hizmet kalitemizi artırmak amacıyla çerezler kullanmaktadır. Çerez kullanımına ilişkin detaylı bilgiye Çerez Politikamızdan ulaşabilirsiniz.</p>
<h3>Güvenlik</h3>
<p>Kişisel verilerinizin güvenliğini sağlamak için gerekli teknik ve idari tedbirler alınmaktadır. Verileriniz, yetkisiz erişim, kayıp veya kötüye kullanıma karşı korunmaktadır.</p>`,
      },
      {
        title: "Kullanım Koşulları",
        slug: "kullanim-kosullari",
        type: "public",
        content: `<h2>Kullanım Koşulları</h2>
<p>Enaunity® platformunu kullanmadan önce lütfen aşağıdaki kullanım koşullarını dikkatlice okuyunuz. Platformu kullanarak bu koşulları kabul etmiş sayılırsınız.</p>
<h3>Genel Hükümler</h3>
<p>İşbu kullanım koşulları, Enaunity® ile platform kullanıcıları arasındaki hak ve yükümlülükleri düzenlemektedir. Kullanıcı, platforma kayıt olmakla bu koşulları kabul etmiş sayılır.</p>
<h3>Hesap Güvenliği</h3>
<p>Kullanıcı, hesap bilgilerinin gizliliğinden sorumludur. Hesabınızın yetkisiz kullanımı durumunda derhal Enaunity®'yi bilgilendirmeniz gerekmektedir.</p>
<h3>Sipariş ve Ödeme</h3>
<p>Siparişlerin oluşturulması, onaylanması ve teslimat süreçleri platform üzerinden takip edilebilir. Ödemeler, belirtilen ödeme yöntemleri aracılığıyla gerçekleştirilir.</p>
<h3>İade ve Değişim</h3>
<p>İade ve değişim koşulları, İade Politikası sayfasında belirtilmiştir. Kullanıcı, sipariş vermeden önce bu politikayı incelemelidir.</p>
<h3>Fikri Mülkiyet</h3>
<p>Platformda yer alan tüm içerik, tasarım, logo ve materyaller Enaunity®'ye ait olup, izinsiz kullanılamaz, çoğaltılamaz veya dağıtılamaz.</p>`,
      },
      {
        title: "Çerez Politikası",
        slug: "cerez-politikasi",
        type: "public",
        content: `<h2>Çerez Politikası</h2>
<p>Enaunity® olarak, web sitemizde çerezler kullanmaktayız. Bu politika, çerezlerin ne olduğunu, hangi amaçlarla kullanıldığını ve çerez tercihlerinizi nasıl yönetebileceğinizi açıklamaktadır.</p>
<h3>Çerez Nedir?</h3>
<p>Çerezler, bir web sitesini ziyaret ettiğinizde tarayıcınıza kaydedilen küçük metin dosyalarıdır. Çerezler, web sitesinin verimli çalışmasını sağlar ve kullanıcı deneyimini iyileştirir.</p>
<h3>Kullanılan Çerez Türleri</h3>
<p><strong>Zorunlu Çerezler:</strong> Web sitesinin düzgün çalışması için gerekli olan çerezlerdir. Bu çerezler kapatılamaz.<br/><strong>Performans Çerezleri:</strong> Ziyaretçilerin web sitesini nasıl kullandığı hakkında anonim bilgiler toplar.<br/><strong>İşlevsellik Çerezleri:</strong> Kullanıcı tercihlerini hatırlayarak kişiselleştirilmiş bir deneyim sunar.<br/><strong>Hedefleme/Reklam Çerezleri:</strong> İlgi alanlarınıza göre reklamlar göstermek için kullanılır.</p>
<h3>Çerez Tercihlerinin Yönetimi</h3>
<p>Tarayıcı ayarlarınızdan çerez tercihlerinizi yönetebilir, çerezleri silebilir veya engelleyebilirsiniz. Ancak, zorunlu çerezlerin devre dışı bırakılması web sitesinin bazı özelliklerinin çalışmamasına neden olabilir.</p>`,
      },
    ];
    for (const ct of contractTemplates) {
      await prisma.contract.upsert({
        where: { slug: ct.slug },
        update: { title: ct.title, type: "public", content: ct.content, active: true },
        create: { ...ct, type: "public", active: true },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        products: products.length,
        dealers: dealers.length,
        variants: "created",
        orders: 25,
        reviews: 15,
        warehouse: warehouse.name,
        campaigns: campaignTypes.length,
        coupons: coupons.length,
        bundles: 1,
        contracts: contractTemplates.length,
      },
    });
  } catch (e: any) {
    console.error("Seed error:", e);
    return NextResponse.json({ success: false, error: e.message || "Seed failed" }, { status: 500 });
  }
}
