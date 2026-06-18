import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";

const DEALER_EMAILS = [
  "kayaticare@test.com",
  "aslantekst@test.com",
  "denizhome@test.com",
  "yıldızi̇th@test.com",
  "bereketper@test.com",
];

async function getDealers() {
  const dealers = await prisma.dealer.findMany({
    where: { email: { in: DEALER_EMAILS } },
    include: { users: { where: { role: "dealer" }, take: 1 } },
  });
  if (dealers.length !== 5) {
    console.error(`Found ${dealers.length} dealers, expected 5`);
    process.exit(1);
  }
  return dealers;
}

async function getProducts() {
  return prisma.product.findMany({ take: 50, orderBy: { createdAt: "asc" } });
}

async function seedContracts(dealers: Awaited<ReturnType<typeof getDealers>>) {
  console.log("Seeding contracts...");

  const contractData = [
    { title: "Bayilik Sözleşmesi", slug: "bayilik-sozlesmesi", content: "<h2>Bayilik Sözleşmesi</h2><p>İşbu bayilik sözleşmesi, Enaunity ile bayi arasında akdedilmiştir.</p><h3>Madde 1 - Taraflar</h3><p>Bir tarafta Enaunity (bundan böyle 'Şirket' olarak anılacaktır) ile diğer tarafta bayi (bundan böyle 'Bayi' olarak anılacaktır) arasında aşağıdaki şartlar dahilinde işbu bayilik sözleşmesi akdedilmiştir.</p><h3>Madde 2 - Sözleşmenin Konusu</h3><p>İşbu sözleşmenin konusu, Şirket'in üretmiş olduğu ürünlerin bayisi tarafından satılmasına ilişkin esasların belirlenmesidir.</p><h3>Madde 3 - Yetki ve Sorumluluklar</h3><p>Bayi, Şirket'in belirlediği satış politikalarına uymayı, ürünleri belirlenen fiyat aralıklarında satmayı ve müşteri memnuniyetini ön planda tutmayı kabul eder.</p>" },
    { title: "KVKK Aydınlatma Metni", slug: "kvkk-aydinlatma", content: "<h2>KVKK Aydınlatma Metni</h2><p>6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında işbu aydınlatma metni düzenlenmiştir.</p><h3>Veri Sorumlusu</h3><p>Enaunity olarak, kişisel verilerinizin işlenmesinde veri sorumlusu sıfatıyla hareket etmekteyiz.</p><h3>Kişisel Verilerin İşlenme Amacı</h3><p>Toplanan kişisel verileriniz, bayilik faaliyetlerinin yürütülmesi, sipariş süreçlerinin yönetilmesi ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenmektedir.</p>" },
    { title: "Ticari Elektronik İleti İzin Belgesi", slug: "ticari-elektronik-ileti-izni", content: "<h2>Ticari Elektronik İleti İzin Belgesi</h2><p>6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun kapsamında işbu izin belgesi düzenlenmiştir.</p><p>Bayi, tarafıma ticari elektronik ileti gönderilmesine izin verdiğimi beyan ederim. Bu izin kapsamında kampanya, indirim, yeni ürün ve diğer ticari mesajların e-posta, SMS ve telefon yoluyla iletilmesine onay veriyorum.</p>" },
    { title: "Gizlilik Sözleşmesi (NDA)", slug: "gizlilik-sozlesmesi", content: "<h2>Gizlilik Sözleşmesi</h2><p>İşbu gizlilik sözleşmesi, taraflar arasında paylaşılacak gizli bilgilerin korunması amacıyla akdedilmiştir.</p><h3>Gizli Bilgilerin Tanımı</h3><p>Taraflardan birinin diğerine yazılı, sözlü veya görsel olarak aktardığı, ticari sır niteliğindeki tüm bilgiler gizli bilgi olarak kabul edilir.</p><h3>Gizlilik Yükümlülüğü</h3><p>Alıcı taraf, gizli bilgileri üçüncü kişilerle paylaşmamayı, kendi çalışanları dışında ifşa etmemeyi ve yalnızca sözleşme amaçları doğrultusunda kullanmayı kabul eder.</p>" },
    { title: "Satış ve İade Politikası", slug: "satis-iade-politikasi", content: "<h2>Satış ve İade Politikası</h2><p>İşbu belge, bayi satış ve iade süreçlerine ilişkin esasları düzenlemektedir.</p><h3>Satış Koşulları</h3><p>Tüm satışlar, Enaunity tarafından belirlenen güncel fiyat listesi üzerinden yapılır. Minimum sipariş tutarı bayi grubuna göre belirlenir.</p><h3>İade Koşulları</h3><p>İade talepleri, teslimat tarihinden itibaren 14 gün içinde yapılmalıdır. İade edilecek ürünlerin kullanılmamış ve hasarsız olması gerekmektedir.</p>" },
  ];

  const admin = await prisma.user.findFirst({ where: { role: "admin" } })!;
  const adminName = admin?.name || "Admin";

  for (const c of contractData) {
    await prisma.contract.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }

  const contracts = await prisma.contract.findMany();
  console.log(`  Created ${contracts.length} contracts`);

  for (const dealer of dealers) {
    const assignedSlugs = dealer.email === "yıldızi̇th@test.com"
      ? contractData.map(c => c.slug)
      : dealer.group === "gold" || dealer.group === "silver"
        ? contractData.slice(0, 3).map(c => c.slug)
        : contractData.slice(0, 2).map(c => c.slug);

    for (const slug of assignedSlugs) {
      const contract = contracts.find(c => c.slug === slug);
      if (!contract) continue;

      const exists = await prisma.dealerContract.findFirst({
        where: { dealerId: dealer.id, contractId: contract.id },
      });
      if (!exists) {
        await prisma.dealerContract.create({
          data: {
            dealerId: dealer.id,
            contractId: contract.id,
            status: dealer.email === "kayaticare@test.com" ? "approved" : "pending",
            assignedBy: "Admin",
            respondedAt: dealer.email === "kayaticare@test.com" ? new Date(Date.now() - 7 * 86400000) : undefined,
            readAt: dealer.email === "kayaticare@test.com" ? new Date(Date.now() - 7 * 86400000) : undefined,
          },
        });
      }
    }
  }

  const dcCount = await prisma.dealerContract.count();
  console.log(`  Created ${dcCount} dealer-contract assignments`);
}

async function seedAddresses(dealers: Awaited<ReturnType<typeof getDealers>>) {
  console.log("Seeding addresses...");

  const addressSets: Record<string, Array<{
    label: string; type: string; fullAddress: string; city: string;
    district: string; zipCode: string; phone: string; isDefault: boolean;
  }>> = {
    "kayaticare@test.com": [
      { label: "Merkez Şube", type: "shipping", fullAddress: "İstiklal Mahallesi, Atatürk Caddesi No:45", city: "İstanbul", district: "Kadıköy", zipCode: "34700", phone: "02165551234", isDefault: true },
      { label: "Depo", type: "shipping", fullAddress: "Sanayi Bölgesi, 2. Cadde No:12", city: "İstanbul", district: "Tuzla", zipCode: "34940", phone: "02165559876", isDefault: false },
      { label: "Fatura Adresi", type: "billing", fullAddress: "Merkez Mahallesi, Vergi Dairesi Sk. No:8", city: "İstanbul", district: "Kadıköy", zipCode: "34700", phone: "02165551234", isDefault: false },
    ],
    "aslantekst@test.com": [
      { label: "Ana Mağaza", type: "shipping", fullAddress: "Cumhuriyet Meydanı No:22", city: "Ankara", district: "Çankaya", zipCode: "06400", phone: "03125556677", isDefault: true },
      { label: "Fatura Adresi", type: "billing", fullAddress: "Kızılay Mahallesi, Gazi Mustafa Kemal Bulvarı No:56", city: "Ankara", district: "Çankaya", zipCode: "06420", phone: "03125556677", isDefault: false },
    ],
    "denizhome@test.com": [
      { label: "Merkez Ofis", type: "shipping", fullAddress: "Kordon Boyu Caddesi No:78", city: "İzmir", district: "Karşıyaka", zipCode: "35560", phone: "02325551122", isDefault: true },
      { label: "Şube", type: "shipping", fullAddress: "Alsancak Mahallesi, Kıbrıs Şehitleri Caddesi No:34", city: "İzmir", district: "Konak", zipCode: "35220", phone: "02325553344", isDefault: false },
      { label: "Depo", type: "shipping", fullAddress: "Kemalpaşa Organize Sanayi Bölgesi, 5. Sokak No:3", city: "İzmir", district: "Kemalpaşa", zipCode: "35730", phone: "02325559900", isDefault: false },
      { label: "Fatura Adresi", type: "billing", fullAddress: "Kordon Boyu Caddesi No:78 Kat:2", city: "İzmir", district: "Karşıyaka", zipCode: "35560", phone: "02325551122", isDefault: true },
    ],
    "yıldızi̇th@test.com": [
      { label: "Genel Merkez", type: "shipping", fullAddress: "Bağdat Caddesi No:200", city: "İstanbul", district: "Maltepe", zipCode: "34844", phone: "02165557788", isDefault: true },
      { label: "Fatura Adresi", type: "billing", fullAddress: "Bağdat Caddesi No:200 Kat:3", city: "İstanbul", district: "Maltepe", zipCode: "34844", phone: "02165557788", isDefault: false },
    ],
    "bereketper@test.com": [
      { label: "Mağaza", type: "shipping", fullAddress: "Millet Caddesi No:15", city: "Bursa", district: "Osmangazi", zipCode: "16000", phone: "02245556677", isDefault: true },
      { label: "Fatura Adresi", type: "billing", fullAddress: "Millet Caddesi No:15 Kat:1", city: "Bursa", district: "Osmangazi", zipCode: "16000", phone: "02245556677", isDefault: false },
    ],
  };

  for (const dealer of dealers) {
    const addresses = addressSets[dealer.email] || [];
    for (const addr of addresses) {
      await prisma.address.create({
        data: {
          dealerId: dealer.id,
          label: addr.label,
          type: addr.type,
          fullAddress: addr.fullAddress,
          city: addr.city,
          district: addr.district,
          zipCode: addr.zipCode,
          phone: addr.phone,
          isDefault: addr.isDefault,
        },
      });
    }
  }

  const count = await prisma.address.count();
  console.log(`  Created ${count} addresses`);
}

async function seedDocuments(dealers: Awaited<ReturnType<typeof getDealers>>) {
  console.log("Seeding documents...");

  const docSets: Record<string, Array<{
    title: string; type: string; fileUrl: string; fileName: string; fileSize: number; status: string; adminNote: string;
  }>> = {
    "kayaticare@test.com": [
      { title: "Vergi Levhası 2025", type: "tax_levy", fileUrl: "/uploads/documents/sample-tax.pdf", fileName: "vergi_levhasi_2025.pdf", fileSize: 245000, status: "approved", adminNote: "Onaylandı" },
      { title: "İmza Sirküleri", type: "signature_circular", fileUrl: "/uploads/documents/sample-imza.pdf", fileName: "imza_sirkuleri.pdf", fileSize: 180000, status: "approved", adminNote: "" },
      { title: "Ticaret Sicil Gazetesi", type: "trade_registry", fileUrl: "/uploads/documents/sample-ticaret.pdf", fileName: "ticaret_sicil_gazetesi.pdf", fileSize: 520000, status: "pending", adminNote: "" },
    ],
    "aslantekst@test.com": [
      { title: "Vergi Levhası", type: "tax_levy", fileUrl: "/uploads/documents/sample-tax.pdf", fileName: "vergi_levhasi.pdf", fileSize: 198000, status: "approved", adminNote: "Onaylandı" },
      { title: "İmza Sirküleri", type: "signature_circular", fileUrl: "/uploads/documents/sample-imza.pdf", fileName: "imza_sirkuleri.pdf", fileSize: 210000, status: "pending", adminNote: "İmza örnekleri eksik, yeniden yükleyin" },
    ],
    "denizhome@test.com": [
      { title: "Vergi Levhası 2025", type: "tax_levy", fileUrl: "/uploads/documents/sample-tax.pdf", fileName: "vergi_levhasi_2025.pdf", fileSize: 267000, status: "approved", adminNote: "" },
      { title: "Ticaret Sicil Gazetesi", type: "trade_registry", fileUrl: "/uploads/documents/sample-ticaret.pdf", fileName: "ticaret_sicil_gazetesi.pdf", fileSize: 890000, status: "approved", adminNote: "" },
    ],
    "yıldızi̇th@test.com": [
      { title: "Vergi Levhası", type: "tax_levy", fileUrl: "/uploads/documents/sample-tax.pdf", fileName: "vergi_levhasi.pdf", fileSize: 312000, status: "pending", adminNote: "" },
      { title: "İmza Sirküleri (Güncel)", type: "signature_circular", fileUrl: "/uploads/documents/sample-imza.pdf", fileName: "imza_sirkuleri_guncel.pdf", fileSize: 195000, status: "pending", adminNote: "" },
      { title: "Ticaret Sicil Gazetesi", type: "trade_registry", fileUrl: "/uploads/documents/sample-ticaret.pdf", fileName: "ticaret_sicil_gazetesi.pdf", fileSize: 450000, status: "approved", adminNote: "" },
      { title: "Vergi Levhası 2024", type: "tax_levy", fileUrl: "/uploads/documents/sample-tax.pdf", fileName: "vergi_levhasi_2024.pdf", fileSize: 288000, status: "rejected", adminNote: "Eski tarihli, güncel versiyonu yükleyin" },
    ],
    "bereketper@test.com": [
      { title: "Vergi Levhası", type: "tax_levy", fileUrl: "/uploads/documents/sample-tax.pdf", fileName: "vergi_levhasi.pdf", fileSize: 175000, status: "pending", adminNote: "" },
    ],
  };

  for (const dealer of dealers) {
    const docs = docSets[dealer.email] || [];
    for (const doc of docs) {
      await prisma.dealerDocument.create({
        data: {
          dealerId: dealer.id,
          title: doc.title,
          type: doc.type,
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          status: doc.status,
          adminNote: doc.adminNote,
        },
      });
    }
  }

  const count = await prisma.dealerDocument.count();
  console.log(`  Created ${count} documents`);
}

async function seedOrders(dealers: Awaited<ReturnType<typeof getDealers>>, products: Awaited<ReturnType<typeof getProducts>>) {
  console.log("Seeding orders...");

  const statuses = ["pending", "pending", "approved", "approved", "shipped", "delivered", "delivered", "cancelled"];
  const carriers = ["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo", "PTT Kargo", ""];

  let orderCount = 0;

  for (const dealer of dealers) {
    const dealerUser = dealer.users[0];
    if (!dealerUser) continue;

    for (let i = 0; i < 8; i++) {
      const status = statuses[i % statuses.length];
      const itemCount = Math.floor(Math.random() * 4) + 1;
      const selectedProducts = products.sort(() => Math.random() - 0.5).slice(0, itemCount);

      let total = 0;
      const items: Array<{ productId: string; quantity: number; price: number }> = [];

      for (const p of selectedProducts) {
        const qty = Math.floor(Math.random() * 5) + 1;
        const price = p.price;
        total += price * qty;
        items.push({ productId: p.id, quantity: qty, price });
      }

      const daysAgo = Math.floor(Math.random() * 60) + 1;
      const createdAt = new Date(Date.now() - daysAgo * 86400000);

      const order = await prisma.order.create({
        data: {
          userId: dealerUser.id,
          dealerId: dealer.id,
          total,
          discount: 0,
          status,
          notes: i === 0 ? "Lütfen hızlı gönderim yapın." : "",
          address: `${dealer.location || "İstanbul"}, ${dealer.name}`,
          trackingNumber: status === "shipped" || status === "delivered" ? `TR${String(Math.random()).slice(2, 12)}` : "",
          carrier: status === "shipped" || status === "delivered" ? carriers[i % carriers.length] : "",
          createdAt,
          updatedAt: createdAt,
        },
      });

      for (const item of items) {
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          },
        });
      }

      if (status === "delivered" || status === "shipped") {
        await prisma.dealerTransaction.create({
          data: {
            dealerId: dealer.id,
            type: "order",
            amount: -total,
            orderId: order.id,
            note: `Sipariş #${order.id.slice(-6)} - ${i === 0 ? "Peşin" : "Vadeli"} ödeme`,
            balanceAfter: dealer.balance - total * (orderCount + 1) * 0.1,
            createdAt,
          },
        });
      }

      if (status === "delivered" || status === "shipped") {
        await prisma.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: "pending",
            note: "Sipariş oluşturuldu",
            changedBy: "dealer",
            createdAt: new Date(createdAt.getTime() + 1000),
          },
        });
        await prisma.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: "approved",
            note: "Sipariş onaylandı",
            changedBy: "admin",
            createdAt: new Date(createdAt.getTime() + 3600000),
          },
        });
        await prisma.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status,
            note: status === "shipped" ? "Kargoya verildi" : "Teslim edildi",
            changedBy: "admin",
            createdAt: new Date(createdAt.getTime() + 7200000),
          },
        });
      }

      orderCount++;
    }
  }

  console.log(`  Created ${orderCount} orders with items and status history`);
}

async function seedNotifications(dealers: Awaited<ReturnType<typeof getDealers>>) {
  console.log("Seeding notifications...");

  const notificationTemplates = [
    { title: "Sipariş Onaylandı", message: "Son siparişiniz onaylanmıştır. Detaylar için siparişler sayfasını ziyaret edin.", type: "success", link: "/dealer/orders" },
    { title: "Yeni Ürünler Eklendi", message: "Kataloğumuza yeni ürünler eklenmiştir. Göz atmayı unutmayın!", type: "info", link: "/products" },
    { title: "Hesap Bildirimi", message: "Bakiye bildiriminiz bulunmaktadır. Güncel bakiyenizi kontrol edin.", type: "warning", link: "/dealer/balance" },
    { title: "Sözleşme Güncellemesi", message: "Bayilik sözleşmenizde güncelleme yapılmıştır. Lütfen inceleyin.", type: "info", link: "/account#contracts" },
    { title: "İndirim Kampanyası", message: "Seçili ürünlerde %20'ye varan indirim fırsatı! Kaçırmayın.", type: "promo", link: "/products" },
  ];

  let notifCount = 0;
  for (const dealer of dealers) {
    for (const tpl of notificationTemplates) {
      const daysAgo = Math.floor(Math.random() * 14);
      await prisma.notification.create({
        data: {
          dealerId: dealer.id,
          title: tpl.title,
          message: tpl.message,
          type: tpl.type,
          read: daysAgo > 3,
          link: tpl.link,
          createdAt: new Date(Date.now() - daysAgo * 86400000),
        },
      });
      notifCount++;
    }
  }
  console.log(`  Created ${notifCount} notifications`);
}

async function seedQuotes(dealers: Awaited<ReturnType<typeof getDealers>>, products: Awaited<ReturnType<typeof getProducts>>) {
  console.log("Seeding quotes...");

  let quoteCount = 0;
  for (const dealer of dealers) {
    const numQuotes = dealer.email === "yıldızi̇th@test.com" ? 3 : 1;
    for (let i = 0; i < numQuotes; i++) {
      const selectedProducts = products.sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 3) + 2);
      const statuses = ["pending", "pending", "approved", "rejected", "countered"];
      const status = statuses[(i + dealer.email.length) % statuses.length];

      const items = selectedProducts.map(p => ({
        productId: p.id,
        quantity: Math.floor(Math.random() * 20) + 5,
        price: p.price * (1 - Math.random() * 0.15),
      }));

      const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const quote = await prisma.quote.create({
        data: {
          dealerId: dealer.id,
          status,
          note: i === 0 ? "Toplu alım için fiyat teklifi istiyorum." : "",
          adminNote: status === "rejected" ? "Fiyatlarımız güncel değil, lütfen güncel liste için iletişime geçin." : status === "countered" ? "Size özel %8 indirim yapabiliriz." : "",
          total,
          validUntil: new Date(Date.now() + 30 * 86400000),
        },
      });

      for (const item of items) {
        await prisma.quoteItem.create({
          data: {
            quoteId: quote.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          },
        });
      }
      quoteCount++;
    }
  }
  console.log(`  Created ${quoteCount} quotes with items`);
}

async function seedReturns(dealers: Awaited<ReturnType<typeof getDealers>>) {
  console.log("Seeding returns...");

  const orders = await prisma.order.findMany({
    where: { dealerId: { in: dealers.map(d => d.id) }, status: "delivered" },
    include: { items: { take: 2 } },
    take: 10,
  });

  let returnCount = 0;
  for (let i = 0; i < orders.length && i < 5; i++) {
    const order = orders[i];
    if (order.items.length === 0) continue;

    const statuses = ["pending", "pending", "approved", "rejected"];
    const status = statuses[i % statuses.length];
    const reasons = ["Ürün hasarlı geldi", "Yanlış ürün gönderildi", "Müşteri iade etti", "Ölçüler uyuşmuyor"];

    const returnReq = await prisma.returnRequest.create({
      data: {
        dealerId: order.dealerId!,
        orderId: order.id,
        reason: reasons[i % reasons.length],
        status,
        adminNote: status === "rejected" ? "Ürün kullanılmış durumda, iade kabul edilemez." : status === "approved" ? "İade onaylandı, kargonuzu bekliyoruz." : "",
      },
    });

    for (const item of order.items.slice(0, 1)) {
      if (!item.productId) continue;
      await prisma.returnItem.create({
        data: {
          requestId: returnReq.id,
          productId: item.productId,
          quantity: Math.min(item.quantity, 1),
          price: item.price,
        },
      });
    }
    returnCount++;
  }
  console.log(`  Created ${returnCount} return requests`);
}

async function main() {
  console.log("=== Full Seed Script ===\n");

  const dealers = await getDealers();
  const products = await getProducts();

  console.log(`Found ${dealers.length} dealers, ${products.length} products\n`);

  await seedContracts(dealers);
  await seedAddresses(dealers);
  await seedDocuments(dealers);
  await seedOrders(dealers, products);
  await seedNotifications(dealers);
  await seedQuotes(dealers, products);
  await seedReturns(dealers);

  console.log("\n=== Seed completed successfully! ===");
  console.log("\nTest users:");
  for (const d of dealers) {
    const user = d.users[0];
    console.log(`  Dealer: ${d.name} / ${d.email} / user123 (${d.group})`);
  }
}

main()
  .catch((e) => { console.error("Seed error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
