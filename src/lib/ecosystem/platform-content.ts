import type { ShowcaseFaq, ShowcasePlan } from "./types";

export type PlatformSection = {
  id: string;
  title: string;
  description?: string;
  items?: { title: string; description: string; icon?: string }[];
};

export type PlatformContent = {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  themeColor: string;
  accentColor: string;
  badgeText: string;
  cardFeatures: string[];
  hero: { title: string; subtitle: string; description: string };
  problems: { title: string; description: string }[];
  solution: { title: string; description: string };
  features: { title: string; description: string; icon?: string }[];
  sections: PlatformSection[];
  flow: { label: string; steps: string[] };
  stats: { value: number; suffix: string; label: string }[];
  plans: ShowcasePlan[];
  faq: ShowcaseFaq[];
  cta: {
    title: string;
    description: string;
    primaryText: string;
    primaryUrl: string;
    secondaryText?: string;
    secondaryUrl?: string;
  };
};

const enaPlans: ShowcasePlan[] = [
  { id: "ena-starter", name: "Starter", description: "Küçük bayi ağları için", monthlyPrice: 0, features: ["50 Bayi", "Temel Sipariş", "Katalog"], sortOrder: 0, ctaText: "Başvur", ctaUrl: "/auth/register" },
  { id: "ena-pro", name: "Professional", description: "Büyüyen operasyonlar", monthlyPrice: 1499, features: ["500 Bayi", "Teklif & Cari", "Entegrasyonlar", "Raporlar"], sortOrder: 1, highlighted: true, ctaText: "Demo Al", ctaUrl: "/auth/register" },
  { id: "ena-ent", name: "Enterprise", description: "Kurumsal ölçek", monthlyPrice: undefined, features: ["Sınırsız Bayi", "Özel SLA", "Dedicated Support", "API"], sortOrder: 2, ctaText: "İletişim", ctaUrl: "/is-ortakligi" },
];

const thyPlans: ShowcasePlan[] = [
  { id: "thy-starter", name: "Starter", description: "İlk feed operasyonu", monthlyPrice: 299, features: ["3 Kaynak", "Temel Kurallar", "XML/CSV"], sortOrder: 0, ctaText: "Başla", ctaUrl: "/thyronix/pricing" },
  { id: "thy-pro", name: "Professional", description: "Çok kanallı yayın", monthlyPrice: 599, features: ["10 Kaynak", "AI Optimizasyon", "28 Format", "Otomasyon"], sortOrder: 1, highlighted: true, ctaText: "Başla", ctaUrl: "/thyronix/pricing" },
  { id: "thy-ent", name: "Enterprise", description: "Yüksek hacim", monthlyPrice: 1299, features: ["Sınırsız Kaynak", "Öncelikli Destek", "Custom Mapping"], sortOrder: 2, ctaText: "Teklif Al", ctaUrl: "/thyronix/pricing" },
];

const hivePlans: ShowcasePlan[] = [
  { id: "hive-starter", name: "Starter", description: "Tek marka büyümesi", monthlyPrice: 499, features: ["1 Site", "10 İçerik/ay", "Temel SEO"], sortOrder: 0, ctaText: "Başla", ctaUrl: "/hive/pricing" },
  { id: "hive-pro", name: "Professional", description: "GEO + Publisher", monthlyPrice: 999, features: ["5 Site", "GEO Engine", "Entity Graph", "AI İçerik"], sortOrder: 1, highlighted: true, ctaText: "Başla", ctaUrl: "/hive/pricing" },
  { id: "hive-ent", name: "Enterprise", description: "Authority ağı", monthlyPrice: 1999, features: ["Sınırsız Site", "Publisher Network", "Authority Mesh"], sortOrder: 2, ctaText: "Teklif Al", ctaUrl: "/hive/pricing" },
];

const linkSlashPlans: ShowcasePlan[] = [
  {
    id: "ls-starter",
    name: "Starter",
    description: "Bireysel link yönetimi",
    monthlyPrice: 149,
    yearlyPrice: 1490,
    features: ["WhatsApp import", "AI kategorizasyon", "IndexedDB yedek", "PWA", "Chrome eklentisi"],
    sortOrder: 0,
    ctaText: "Başla",
    ctaUrl: "/payment/checkout?type=module&moduleKey=LINKSLASH&planKey=starter",
  },
  {
    id: "ls-pro",
    name: "Pro",
    description: "Yoğun kullanım ve AI agent",
    monthlyPrice: 299,
    yearlyPrice: 2990,
    features: ["Starter +", "Bulk AI agent", "Dead link kontrolü", "Bookmark import", "Öncelikli sync"],
    sortOrder: 1,
    highlighted: true,
    ctaText: "Başla",
    ctaUrl: "/payment/checkout?type=module&moduleKey=LINKSLASH&planKey=pro",
  },
  {
    id: "ls-team",
    name: "Team",
    description: "Ekip ve ajans kullanımı",
    monthlyPrice: undefined,
    features: ["Pro +", "Paylaşımlı kütüphane", "SSO", "Dedicated onboarding"],
    sortOrder: 2,
    ctaText: "İletişim",
    ctaUrl: "/iletisim",
  },
];

const pageFactoryPlans: ShowcasePlan[] = [
  {
    id: "pf-starter",
    name: "Starter",
    description: "Sayfa evreni planlama başlangıç",
    monthlyPrice: 299,
    yearlyPrice: 2990,
    features: ["5 proje", "Topology engine", "Cluster engine", "Blueprint şablonları", "Data Universe TR"],
    sortOrder: 0,
    ctaText: "Başla",
    ctaUrl: "/payment/checkout?type=module&moduleKey=AI_PAGE_FACTORY&planKey=starter",
  },
  {
    id: "pf-pro",
    name: "Pro",
    description: "Geniş ölçekli GEO + SEO planlama",
    monthlyPrice: 799,
    yearlyPrice: 7990,
    features: ["50 proje", "GEO engine", "Page estimator", "Bulk import", "Öncelikli destek"],
    sortOrder: 1,
    highlighted: true,
    ctaText: "Başla",
    ctaUrl: "/payment/checkout?type=module&moduleKey=AI_PAGE_FACTORY&planKey=pro",
  },
  {
    id: "pf-ent",
    name: "Enterprise",
    description: "Kurumsal sayfa evreni operasyonu",
    monthlyPrice: undefined,
    features: ["Sınırsız proje", "Özel GEO import", "Dedicated onboarding", "SLA"],
    sortOrder: 2,
    ctaText: "İletişim",
    ctaUrl: "/iletisim",
  },
];

export const PLATFORM_CONTENT: Record<string, PlatformContent> = {
  ena: {
    slug: "ena",
    name: "ENA B2B",
    subtitle: "B2B Ticaret Platformu",
    description: "Bayi yönetimi, sipariş süreçleri, teklif yönetimi, cari hesap, finans ve operasyon süreçlerini tek merkezden yönetin.",
    icon: "Building2",
    themeColor: "#e50914",
    accentColor: "#f97316",
    badgeText: "CORE",
    cardFeatures: ["Bayi Yönetimi", "Sipariş Yönetimi", "Teklif Sistemi", "Cari Hesap", "Finans", "Entegrasyonlar"],
    hero: {
      title: "B2B Ticaretin Yeni Nesli",
      subtitle: "ENA B2B",
      description: "Bayi ağınızı, siparişlerinizi ve finansal süreçlerinizi tek ekosistemde birleştirin. Kurumsal ölçekte hız, kontrol ve görünürlük.",
    },
    problems: [
      { title: "Dağınık Bayi Süreçleri", description: "Sipariş, teklif ve cari bilgiler farklı sistemlerde; operasyon yavaşlıyor." },
      { title: "Manuel Operasyon Yükü", description: "Excel, e-posta ve telefon trafiği hata riskini ve maliyeti artırıyor." },
      { title: "Görünürlük Eksikliği", description: "Yönetim katmanı anlık stok, sipariş ve finans durumunu göremiyor." },
      { title: "Entegrasyon Karmaşası", description: "ERP, muhasebe ve pazaryeri bağlantıları parça parça yönetiliyor." },
    ],
    solution: {
      title: "Tek Merkezden B2B Operasyonu",
      description: "ENA B2B; bayi yönetiminden siparişe, tekliften cari hesaba kadar tüm ticaret döngüsünü tek platformda toplar. Ekipleriniz aynı veriyle çalışır, kararlar hızlanır.",
    },
    features: [
      { title: "Bayi Yönetimi", description: "Segmentasyon, yetkilendirme ve performans takibi.", icon: "Store" },
      { title: "Sipariş Yönetimi", description: "Onay akışları, stok kontrolü ve sevkiyat entegrasyonu.", icon: "Package" },
      { title: "Teklif Sistemi", description: "Dinamik fiyatlandırma ve onay süreçleri.", icon: "FileText" },
      { title: "Cari Hesap", description: "Bakiye, limit ve vade yönetimi tek ekranda.", icon: "Wallet" },
      { title: "Finans", description: "Tahsilat, fatura ve ödeme görünürlüğü.", icon: "BarChart3" },
      { title: "Entegrasyonlar", description: "ERP, kargo ve pazaryeri bağlantıları.", icon: "Plug" },
    ],
    sections: [
      {
        id: "process",
        title: "Süreç Akışı",
        description: "Bayiden siparişe, finanstan rapora uçtan uca dijital akış.",
        items: [
          { title: "Bayi Kaydı", description: "Onboarding ve evrak süreçleri dijitalleşir." },
          { title: "Teklif & Sipariş", description: "Fiyat onayı ve sipariş tek akışta ilerler." },
          { title: "Sevkiyat & Fatura", description: "Operasyon ve finans senkronize çalışır." },
          { title: "Raporlama", description: "Yönetim panelinde anlık KPI görünürlüğü." },
        ],
      },
    ],
    flow: { label: "Operasyon Döngüsü", steps: ["Bayi", "Teklif", "Sipariş", "Sevkiyat", "Cari", "Rapor"] },
    stats: [
      { value: 500, suffix: "+", label: "Aktif Bayi Kapasitesi" },
      { value: 40, suffix: "%", label: "Operasyon Hızı Artışı" },
      { value: 1, suffix: "", label: "Tek Platform" },
    ],
    plans: enaPlans,
    faq: [
      { id: "ena-1", question: "ENA B2B kimler için uygundur?", answer: "Toptan satış yapan, bayi ağı yöneten ve B2B sipariş hacmi olan tüm işletmeler için tasarlanmıştır.", sortOrder: 0, active: true },
      { id: "ena-2", question: "Mevcut ERP sistemimle entegre olur mu?", answer: "Evet. API ve standart entegrasyon katmanları ile ERP, muhasebe ve lojistik sistemlerine bağlanabilir.", sortOrder: 1, active: true },
      { id: "ena-3", question: "Bayi başına farklı fiyat listesi tanımlanabilir mi?", answer: "Evet. Bayi grubu, bölge ve segment bazlı fiyat listeleri desteklenir.", sortOrder: 2, active: true },
      { id: "ena-4", question: "Teklif süreci nasıl işler?", answer: "Bayi teklif oluşturur, onay kuralları devreye girer ve onaylanan teklif doğrudan siparişe dönüşebilir.", sortOrder: 3, active: true },
      { id: "ena-5", question: "Cari hesap ve limit kontrolü var mı?", answer: "Evet. Cari bakiye, vade ve kredi limiti sipariş anında kontrol edilir.", sortOrder: 4, active: true },
      { id: "ena-6", question: "Mobil uyumlu mu?", answer: "Bayi paneli ve yönetim ekranları responsive tasarımla mobil ve tablette çalışır.", sortOrder: 5, active: true },
      { id: "ena-7", question: "Kurulum süresi ne kadar?", answer: "Standart kurulum 2–4 hafta; entegrasyon kapsamına göre proje planı özelleştirilir.", sortOrder: 6, active: true },
      { id: "ena-8", question: "Verilerim güvende mi?", answer: "Rol bazlı erişim, audit log ve güvenli oturum yönetimi ile kurumsal güvenlik standartları uygulanır.", sortOrder: 7, active: true },
      { id: "ena-9", question: "Demo veya deneme imkânı var mı?", answer: "Evet. Başvuru sonrası demo ortamı ve ihtiyaç analizi sunulur.", sortOrder: 8, active: true },
      { id: "ena-10", question: "Destek nasıl sağlanıyor?", answer: "E-posta, ticket ve kurumsal paketlerde öncelikli destek kanalları mevcuttur.", sortOrder: 9, active: true },
    ],
    cta: {
      title: "B2B operasyonunuzu dönüştürün",
      description: "Bayi ağınızı tek platformda yönetmeye bugün başlayın.",
      primaryText: "Hemen Başvur",
      primaryUrl: "/auth/register",
      secondaryText: "Katalogu İncele",
      secondaryUrl: "/catalog",
    },
  },
  thyronix: {
    slug: "thyronix",
    name: "THYRONIX",
    subtitle: "Ürün Operasyon Motoru",
    description: "Tedarikçi verilerini toplayın, normalize edin, kurallar uygulayın, AI ile optimize edin ve tüm kanallara yayınlayın.",
    icon: "Zap",
    themeColor: "#2563eb",
    accentColor: "#60a5fa",
    badgeText: "PREMIUM",
    cardFeatures: ["XML", "CSV", "Excel", "API", "Feed", "AI", "Mapping", "Automation"],
    hero: {
      title: "Ürün Verisini Operasyon Gücüne Dönüştürün",
      subtitle: "THYRONIX",
      description: "Kaynaklardan kanallara uçtan uca ürün veri hattı. Normalize, kural, AI ve feed yayını tek motorda.",
    },
    problems: [
      { title: "Kırık Veri Kaynakları", description: "XML, Excel ve API formatları uyumsuz; manuel düzeltme sürekli tekrarlanıyor." },
      { title: "Yavaş Yayın Döngüsü", description: "Fiyat ve stok güncellemeleri pazaryerlerine geç ulaşıyor." },
      { title: "Kural Karmaşası", description: "IF/THEN mantığı kodda; iş birimi değişiklik yapamıyor." },
      { title: "Ölçeklenemeyen Operasyon", description: "Ürün sayısı arttıkça hata oranı ve operasyon maliyeti yükseliyor." },
    ],
    solution: {
      title: "Tek Motor, Tüm Kanallar",
      description: "THYRONIX tedarikçi verisini standartlaştırır, kurallarınızı uygular, AI ile optimize eder ve 28+ formatta canlı feed üretir.",
    },
    features: [
      { title: "Çoklu Kaynak", description: "XML, CSV, Excel ve API kaynaklarını tek havuzda toplayın.", icon: "Database" },
      { title: "Mapping", description: "Alan eşleme ve dönüşüm kuralları görsel arayüzde.", icon: "GitBranch" },
      { title: "Kurallar", description: "IF/THEN motoru ile fiyat, stok ve başlık kuralları.", icon: "Workflow" },
      { title: "AI Optimizasyon", description: "Başlık, açıklama ve kategori önerileri.", icon: "Bot" },
      { title: "Feed Yayını", description: "Canlı URL ile pazaryeri ve kanal entegrasyonu.", icon: "Rss" },
      { title: "Otomasyon", description: "Zamanlanmış senkron ve hata bildirimleri.", icon: "Clock" },
    ],
    sections: [
      { id: "sources", title: "Kaynaklar", description: "Tüm tedarikçi formatlarını tek pipeline'da birleştirin.", items: [
        { title: "XML Feed", description: "Tedarikçi XML'lerini otomatik izleyin." },
        { title: "Excel / CSV", description: "Toplu yükleme ve zamanlanmış import." },
        { title: "REST API", description: "Gerçek zamanlı veri çekimi." },
      ]},
      { id: "rules", title: "Kurallar", description: "İş mantığını koddan çıkarın, operasyona verin.", items: [
        { title: "Fiyat Kuralları", description: "Marj, kampanya ve minimum fiyat." },
        { title: "Stok Kuralları", description: "Eşik, buffer ve kanal bazlı stok." },
        { title: "Kalite Kuralları", description: "Eksik alan ve validasyon kontrolleri." },
      ]},
      { id: "feeds", title: "Feedler", description: "Her kanal için optimize çıktı.", items: [
        { title: "28+ Format", description: "Trendyol, Hepsiburada, Amazon ve daha fazlası." },
        { title: "Canlı URL", description: "Güncel feed adresi ile anlık senkron." },
        { title: "Delta Yayın", description: "Sadece değişen kayıtları gönderin." },
      ]},
      { id: "ai", title: "AI", description: "Ürün verisini akıllıca zenginleştirin.", items: [
        { title: "Başlık Optimizasyonu", description: "SEO ve pazaryeri uyumlu başlıklar." },
        { title: "Açıklama Üretimi", description: "Tutarlı ve ölçeklenebilir içerik." },
        { title: "Kategori Eşleme", description: "Otomatik kategori önerileri." },
      ]},
      { id: "automation", title: "Otomasyon", description: "7/24 çalışan operasyon hattı.", items: [
        { title: "Zamanlanmış Sync", description: "Dakika, saat veya günlük döngüler." },
        { title: "Hata Yönetimi", description: "Retry, alert ve rollback." },
        { title: "Audit Log", description: "Her değişiklik izlenebilir." },
      ]},
    ],
    flow: { label: "Veri Hattı", steps: ["XML", "Normalize", "Kurallar", "AI", "Feed", "Yayın"] },
    stats: [
      { value: 28, suffix: "+", label: "Feed Formatı" },
      { value: 10, suffix: "M+", label: "Ürün Kapasitesi" },
      { value: 99, suffix: "%", label: "Uptime Hedefi" },
    ],
    plans: thyPlans,
    faq: [
      { id: "thy-1", question: "THYRONIX hangi kaynak formatlarını destekler?", answer: "XML, CSV, Excel ve REST API kaynakları desteklenir. Özel formatlar mapping ile uyarlanabilir.", sortOrder: 0, active: true },
      { id: "thy-2", question: "Kaç pazaryerine feed çıkarabilirim?", answer: "Paketinize göre birden fazla kanala eş zamanlı feed yayını yapabilirsiniz.", sortOrder: 1, active: true },
      { id: "thy-3", question: "Kuralları kod yazmadan tanımlayabilir miyim?", answer: "Evet. IF/THEN kural motoru görsel arayüz üzerinden yönetilir.", sortOrder: 2, active: true },
      { id: "thy-4", question: "AI özellikleri neleri kapsar?", answer: "Başlık optimizasyonu, açıklama üretimi ve kategori eşleme önerileri sunulur.", sortOrder: 3, active: true },
      { id: "thy-5", question: "Feed URL'leri canlı mı güncellenir?", answer: "Evet. Kaynak değişiklikleri kural ve AI adımlarından sonra feed'e yansır.", sortOrder: 4, active: true },
      { id: "thy-6", question: "Hata olduğunda ne olur?", answer: "Otomatik retry, bildirim ve gerektiğinde rollback mekanizmaları devreye girer.", sortOrder: 5, active: true },
      { id: "thy-7", question: "Mevcut THYRONIX hesabım etkilenir mi?", answer: "Hayır. Mevcut /thyronix uygulaması ve gateway entegrasyonları aynen çalışmaya devam eder.", sortOrder: 6, active: true },
      { id: "thy-8", question: "Tenant yapısı destekleniyor mu?", answer: "Evet. Çoklu tenant ve erişim kontrolü kurumsal paketlerde mevcuttur.", sortOrder: 7, active: true },
      { id: "thy-9", question: "Deneme süresi var mı?", answer: "Starter paket ile sınırlı deneme ve demo ortamı sunulabilir.", sortOrder: 8, active: true },
      { id: "thy-10", question: "Destek ve onboarding nasıl?", answer: "Dokümantasyon, ticket desteği ve Enterprise'ta öncelikli onboarding.", sortOrder: 9, active: true },
      { id: "thy-11", question: "Ürün sayısı limiti var mı?", answer: "Paket bazlı kaynak ve ürün limitleri tanımlıdır; Enterprise'ta ölçeklenebilir.", sortOrder: 10, active: true },
      { id: "thy-12", question: "Özel mapping ihtiyacım olursa?", answer: "Professional ve Enterprise paketlerde gelişmiş mapping ve özel dönüşüm desteği sunulur.", sortOrder: 11, active: true },
    ],
    cta: {
      title: "Ürün operasyonunuzu hızlandırın",
      description: "Kaynaklardan kanallara tek motorla yayın yapın.",
      primaryText: "THYRONIX'e Giriş",
      primaryUrl: "/thyronix/login",
      secondaryText: "Paketleri Gör",
      secondaryUrl: "#plans",
    },
  },
  hive: {
    slug: "hive",
    name: "HIVE",
    subtitle: "Büyüme Motoru",
    description: "SEO, GEO, Entity Graph, Publisher Network ve AI görünürlüğü ile dijital varlığınızı büyütün.",
    icon: "Sparkles",
    themeColor: "#7c3aed",
    accentColor: "#a78bfa",
    badgeText: "PREMIUM",
    cardFeatures: ["AI SEO", "GEO Engine", "Entity Graph", "Publisher Hub", "Site Factory", "Authority Mesh"],
    hero: {
      title: "Google'da Görünmek Yetmez.\nHakim Olun.",
      subtitle: "HIVE",
      description: "Entity Graph'tan Publisher Network'e, GEO'dan AI görünürlüğüne — dijital otoritenizi sistematik olarak inşa edin.",
    },
    problems: [
      { title: "Parçalı SEO Çabaları", description: "İçerik, teknik SEO ve otorite çalışmaları birbirinden kopuk." },
      { title: "GEO Görünürlük Boşluğu", description: "Yapay zeka arama motorlarında markanız yeterince temsil edilmiyor." },
      { title: "Yavaş İçerik Üretimi", description: "Kaliteli içerik ölçeklenemiyor; rakipler hız kazanıyor." },
      { title: "Dağınık Site Portföyü", description: "Çoklu site ve kanal yönetimi merkezi strateji olmadan büyüyor." },
    ],
    solution: {
      title: "Büyüme İçin Entegre Motor",
      description: "HIVE; entity modelleme, içerik üretimi, publisher dağıtımı ve authority mesh ile sürdürülebilir dijital büyüme sağlar.",
    },
    features: [
      { title: "Entity Graph", description: "Marka, ürün ve konu varlıklarını ilişkilendirin.", icon: "Network" },
      { title: "GEO Engine", description: "Generative Engine Optimization ile AI aramalarda görünün.", icon: "Globe" },
      { title: "Publisher Hub", description: "İçerikleri ağınıza otomatik dağıtın.", icon: "Share2" },
      { title: "Site Factory", description: "Şablon tabanlı hızlı site üretimi.", icon: "Layout" },
      { title: "Authority Mesh", description: "Otorite sinyallerini sistematik güçlendirin.", icon: "Shield" },
      { title: "AI Visibility", description: "LLM ve arama motorlarında marka varlığı.", icon: "Eye" },
    ],
    sections: [
      { id: "entity", title: "Entity Graph", description: "Bilgi mimarinizi varlık tabanlı modelleyin.", items: [
        { title: "Varlık Modelleme", description: "Marka, ürün ve konu düğümleri." },
        { title: "İlişki Haritası", description: "Semantik bağlar ve iç link ağı." },
        { title: "Knowledge Panel", description: "Merkezi entity yönetim paneli." },
      ]},
      { id: "geo", title: "GEO", description: "Yeni nesil arama motorlarında konumlanın.", items: [
        { title: "AI Snippet Optimizasyonu", description: "Yanıt motorları için içerik yapısı." },
        { title: "Citation Tracking", description: "AI kaynak gösterimlerini izleyin." },
        { title: "Entity Signals", description: "Güven ve otorite sinyalleri." },
      ]},
      { id: "publisher", title: "Publisher Network", description: "İçeriği ölçeklenebilir dağıtın.", items: [
        { title: "Hub Yönetimi", description: "Yayıncı ağı merkezi kontrol." },
        { title: "Otomatik Dağıtım", description: "Zamanlanmış yayın akışları." },
        { title: "Performans Takibi", description: "Kanal bazlı metrikler." },
      ]},
      { id: "authority", title: "Authority Mesh", description: "Domain otoritesini sistematik büyütün.", items: [
        { title: "Backlink Stratejisi", description: "Kaliteli bağlantı planlaması." },
        { title: "Topical Authority", description: "Konu derinliği ve kapsam." },
        { title: "Trust Signals", description: "E-E-A-T uyumlu sinyaller." },
      ]},
      { id: "site-factory", title: "Site Factory", description: "Dakikalar içinde yeni dijital varlıklar.", items: [
        { title: "Şablon Kütüphanesi", description: "Sektöre özel site şablonları." },
        { title: "Otomatik Deploy", description: "Hızlı yayına alma." },
        { title: "SEO Hazır Yapı", description: "Teknik SEO gömülü." },
      ]},
      { id: "ai-vis", title: "AI Visibility", description: "LLM çağında marka görünürlüğü.", items: [
        { title: "Brand Presence", description: "AI yanıtlarında marka temsili." },
        { title: "Content Intelligence", description: "Akıllı içerik önerileri." },
        { title: "Competitive GEO", description: "Rakip AI görünürlük analizi." },
      ]},
    ],
    flow: { label: "Büyüme Hattı", steps: ["Entity", "Content", "Publisher", "Authority", "GEO", "AI Visibility"] },
    stats: [
      { value: 5, suffix: "x", label: "İçerik Hızı" },
      { value: 100, suffix: "+", label: "Publisher Noktası" },
      { value: 360, suffix: "°", label: "Görünürlük" },
    ],
    plans: hivePlans,
    faq: [
      { id: "hive-1", question: "HIVE nedir?", answer: "SEO, GEO, entity modelleme ve publisher ağı ile dijital büyüme sağlayan premium modüldür.", sortOrder: 0, active: true },
      { id: "hive-2", question: "GEO Engine ne işe yarar?", answer: "Generative arama motorlarında markanızın görünürlüğünü ve citation oranını artırır.", sortOrder: 1, active: true },
      { id: "hive-3", question: "Entity Graph nasıl çalışır?", answer: "Marka, ürün ve konu varlıklarını ilişkilendirerek semantik bir bilgi ağı oluşturur.", sortOrder: 2, active: true },
      { id: "hive-4", question: "Publisher Network kimler için?", answer: "Çoklu site ve kanalda içerik dağıtımı yapan markalar ve ajanslar için idealdir.", sortOrder: 3, active: true },
      { id: "hive-5", question: "Site Factory ile ne kadar hızlı site açabilirim?", answer: "Şablon seçimi ve konfigürasyonla dakikalar içinde yayına hazır site üretilebilir.", sortOrder: 4, active: true },
      { id: "hive-6", question: "Mevcut HIVE hesabım etkilenir mi?", answer: "Hayır. /hive uygulaması, gateway ve lisans sistemi aynen çalışmaya devam eder.", sortOrder: 5, active: true },
      { id: "hive-7", question: "AI içerik üretimi dahil mi?", answer: "Professional ve Enterprise paketlerde AI destekli içerik üretimi sunulur.", sortOrder: 6, active: true },
      { id: "hive-8", question: "Authority Mesh nasıl ölçülür?", answer: "Domain otoritesi, topical depth ve backlink kalite metrikleri panelde izlenir.", sortOrder: 7, active: true },
      { id: "hive-9", question: "Kaç site yönetebilirim?", answer: "Paketinize göre 1'den sınırsıza kadar site yönetimi mümkündür.", sortOrder: 8, active: true },
      { id: "hive-10", question: "Rakip analizi var mı?", answer: "Evet. AI Visibility modülünde rekabetçi GEO analizi sunulur.", sortOrder: 9, active: true },
      { id: "hive-11", question: "Entegrasyonlar neler?", answer: "CMS, analytics ve arama konsolu entegrasyonları desteklenir.", sortOrder: 10, active: true },
      { id: "hive-12", question: "Onboarding süreci nasıl?", answer: "Entity kurulumu, site bağlantısı ve ilk içerik planı ile yapılandırılmış onboarding.", sortOrder: 11, active: true },
    ],
    cta: {
      title: "Dijital otoritenizi inşa edin",
      description: "HIVE ile SEO'dan GEO'ya tam spektrum büyüme.",
      primaryText: "HIVE'a Giriş",
      primaryUrl: "/hive/login",
      secondaryText: "Paketleri Gör",
      secondaryUrl: "#plans",
    },
  },
  linkslash: {
    slug: "linkslash",
    name: "LinkSlash",
    subtitle: "Akıllı Link Arşivi",
    description:
      "Web, sosyal medya ve mesajlaşma uygulamalarından linkleri tek tuşla kaydedin; yapay zekayla özetleyin ve tüm cihazlarınızda senkronize edin.",
    icon: "Link2",
    themeColor: "#22d3ee",
    accentColor: "#a855f7",
    badgeText: "NEW",
    cardFeatures: [
      "Tek Tıkla Kayıt",
      "Chrome Extension",
      "Android Paylaş",
      "Cloud Sync",
      "AI Özet",
      "SEO Brief",
    ],
    hero: {
      title: "Gördüğün Her Şeyi\nKaybetmeden Kaydet",
      subtitle: "LinkSlash",
      description:
        "Instagram, X, YouTube, WhatsApp, Telegram ve daha fazlasından linkleri yakalayın. AI ile özetleyin, etiketleyin ve araştırma hafızanızı bulutta tutun.",
    },
    problems: [
      { title: "Kaybolan Linkler", description: "DM, hikaye ve tarayıcı sekmelerinde biriken linkler kayboluyor." },
      { title: "Dağınık Kaynaklar", description: "Her platform farklı yerde; arşiv ve arama imkânsız hale geliyor." },
      { title: "Manuel Not Alma", description: "Kopyala-yapıştır ve ekran görüntüsü ile zaman kaybediliyor." },
      { title: "Cihazlar Arası Kopukluk", description: "Telefonda kaydettiğiniz link masaüstünde yok." },
    ],
    solution: {
      title: "Tek Kütüphane, Her Kaynak",
      description:
        "LinkSlash; tarayıcı eklentisi, Android paylaşım menüsü ve PWA ile linkleri tek merkeze toplar. AI özet, etiket ve içerik fikri üretimiyle araştırmanızı hızlandırır.",
    },
    features: [
      { title: "Tek Tıkla Kayıt", description: "Herhangi bir sayfadan veya paylaşım menüsünden anında kayıt.", icon: "Zap" },
      { title: "Chrome Extension", description: "Tarayıcıda tek tıkla yakalama ve ENAUNITY oturumu ile güvenli bağlantı.", icon: "Plug" },
      { title: "Android Paylaş", description: "WhatsApp, Instagram, Chrome ve daha fazlasından paylaşım menüsü ile kayıt.", icon: "Share2" },
      { title: "Cloud Sync", description: "Tüm cihazlarda aynı kütüphane — çakışma çözümü dahil.", icon: "Cloud" },
      { title: "AI Özet", description: "Kaydedilen içeriği yapay zeka ile kısa özete dönüştürün.", icon: "Sparkles" },
      { title: "SEO Brief", description: "Linklerden SEO brief ve içerik fikri üretin.", icon: "FileText" },
    ],
    sections: [
      {
        id: "sources",
        title: "Desteklenen Kaynaklar",
        description: "20+ platform ve genel web desteği.",
        items: [
          { title: "Sosyal Medya", description: "Instagram, X, Threads, LinkedIn, TikTok, Facebook." },
          { title: "Video & Topluluk", description: "YouTube, YouTube Shorts, Reddit." },
          { title: "Mesajlaşma", description: "WhatsApp, Telegram paylaşım menüsü entegrasyonu." },
          { title: "Üretkenlik", description: "Notion, Google Docs, PDF, GitHub, Medium, Substack." },
        ],
      },
      {
        id: "use-cases",
        title: "Kimler İçin?",
        description: "Bireysel araştırmacıdan ajansa kadar.",
        items: [
          { title: "İçerik Üreticileri", description: "İlham kaynaklarını ve referansları arşivleyin." },
          { title: "SEO Uzmanları", description: "Rakip ve kaynak linklerinden brief üretin." },
          { title: "Ajanslar", description: "Müşteri araştırmalarını tek kütüphanede toplayın." },
          { title: "Öğrenciler", description: "Ders ve makale linklerini AI ile özetleyin." },
        ],
      },
    ],
    flow: {
      label: "LinkSlash Akışı",
      steps: ["Paylaş / Kaydet", "LinkSlash", "AI Analiz", "Cloud Sync", "İçerik Fikri"],
    },
    stats: [
      { value: 20, suffix: "+", label: "Kaynak Platform" },
      { value: 1, suffix: "", label: "Tek Kütüphane" },
      { value: 3, suffix: "", label: "Cihaz Tipi" },
    ],
    plans: linkSlashPlans,
    faq: [
      { id: "ls-1", question: "LinkSlash nedir?", answer: "Web ve sosyal medyadan linkleri kaydeden, AI ile özetleyen ve cihazlar arası senkronize eden ENAUNITY modülüdür.", sortOrder: 0, active: true },
      { id: "ls-2", question: "Hangi platformlardan kayıt yapabilirim?", answer: "Instagram, X, YouTube, WhatsApp, Telegram, Chrome ve 20+ kaynak desteklenir.", sortOrder: 1, active: true },
      { id: "ls-3", question: "Chrome eklentisi var mı?", answer: "Evet. ENAUNITY oturumu ile bağlanan Chrome eklentisi tek tıkla kayıt sağlar.", sortOrder: 2, active: true },
      { id: "ls-4", question: "Android uygulaması nasıl çalışır?", answer: "Paylaşım menüsünden LinkSlash'ı seçerek herhangi bir uygulamadan link gönderebilirsiniz.", sortOrder: 3, active: true },
      { id: "ls-5", question: "AI özellikleri neler?", answer: "Özet, otomatik etiketleme, SEO brief ve sosyal medya taslakları sunulur.", sortOrder: 4, active: true },
      { id: "ls-6", question: "Offline çalışır mı?", answer: "Evet. Bağlantı yokken kayıt kuyruğa alınır; senkron olunca otomatik gönderilir.", sortOrder: 5, active: true },
      { id: "ls-7", question: "Mevcut /linkslash sayfası etkilenir mi?", answer: "Hayır. Özel tanıtım sayfası ve indirme merkezi aynen çalışmaya devam eder.", sortOrder: 6, active: true },
      { id: "ls-8", question: "Paket fiyatları nedir?", answer: "Starter 149₺/ay, Pro 299₺/ay. Yıllık ödemede indirim uygulanır.", sortOrder: 7, active: true },
      { id: "ls-9", question: "ENAUNITY hesabım gerekli mi?", answer: "Evet. Tek oturum ile gateway, eklenti ve mobil uygulama bağlanır.", sortOrder: 8, active: true },
      { id: "ls-10", question: "Verilerim güvende mi?", answer: "ENAUNITY kimlik doğrulama ve şifreli senkron ile kişisel kütüphaneniz korunur.", sortOrder: 9, active: true },
    ],
    cta: {
      title: "Link arşivinizi birleştirin",
      description: "Extension, Android ve PWA ile tek kütüphanede toplayın.",
      primaryText: "LinkSlash'a Giriş",
      primaryUrl: "/gateway/linkslash",
      secondaryText: "İndirmeler",
      secondaryUrl: "/linkslash/downloads",
    },
  },
  "page-factory": {
    slug: "page-factory",
    name: "AI Page Factory",
    subtitle: "Sayfa Evreni Planlama",
    description:
      "Topology, cluster ve blueprint motorları ile GEO + SEO sayfa evreninizi planlayın. Data Universe ile 81 il, 973 ilçe ve mahalle/köy verisi. Faz 1: içerik üretimi yok.",
    icon: "Layers",
    themeColor: "#7c3aed",
    accentColor: "#a855f7",
    badgeText: "ENGINE",
    cardFeatures: ["Topology Engine", "Cluster Engine", "Blueprint", "GEO Data Universe", "Page Estimator", "Bulk Import"],
    hero: {
      title: "Sayfa Evreninizi\nÖnce Planlayın",
      subtitle: "AI Page Factory",
      description:
        "Cam tablo, otel, gayrimenkul veya herhangi bir sektör için GEO + SEO sayfa ağını topology ve cluster mantığıyla tasarlayın. İçerik basmadan evreninizi görün.",
    },
    problems: [
      { title: "Plansız GEO Üretimi", description: "İl/ilçe bazlı sayfalar rastgele açılıyor; yapı ve ölçek kontrol edilemiyor." },
      { title: "Dağınık Veri Kaynakları", description: "GEO verileri Excel ve farklı kaynaklarda; import ve dedup yok." },
      { title: "Tahmin Edilemeyen Maliyet", description: "Kaç sayfa üretileceği plan aşamasında net değil." },
      { title: "Modül Kopukluğu", description: "HIVE, Page Factory ve B2B aynı GEO evrenini paylaşmıyor." },
    ],
    solution: {
      title: "Tek Data Universe, Net Plan",
      description:
        "AI Page Factory; Data Universe Engine ile Türkiye GEO verisini merkezileştirir. Topology, cluster ve blueprint katmanlarıyla sayfa evreninizi üretim öncesi modeller.",
    },
    features: [
      { title: "Topology Engine", description: "Ülke → il → ilçe → mahalle hiyerarşisinde düğüm ağacı.", icon: "GitBranch" },
      { title: "Cluster Engine", description: "Sektör + GEO + niyet kombinasyonlarıyla cluster zincirleri.", icon: "Layers" },
      { title: "Blueprint Engine", description: "Sayfa tipi ve hiyerarşi şablonları — içerik yok.", icon: "FileStack" },
      { title: "Data Universe", description: "81 il, 973 ilçe, mahalle/köy bulk import ve admin CRUD.", icon: "Database" },
      { title: "Page Estimator", description: "Plan aşamasında tahmini sayfa sayısı ve formül.", icon: "Calculator" },
      { title: "HIVE Paylaşımı", description: "Aynı GEO katmanı HIVE GEO Engine ile ortak.", icon: "Sparkles" },
    ],
    sections: [
      {
        id: "engines",
        title: "Planlama Motorları",
        description: "Faz 1 — içerik üretimi ve sayfa basma yok.",
        items: [
          { title: "Topology", description: "GEO hiyerarşisi ve düğüm sayıları." },
          { title: "Cluster", description: "Sektör × lokasyon × niyet yolları." },
          { title: "Blueprint", description: "Sayfa tipi şablonları ve metadata." },
          { title: "Estimator", description: "Toplam sayfa tahmini ve breakdown." },
        ],
      },
      {
        id: "data",
        title: "Data Universe V2",
        description: "CSV, JSON, XLSX bulk import pipeline.",
        items: [
          { title: "Tam Türkiye GEO", description: "81 il, 973 ilçe seed + bulk import." },
          { title: "Mahalle / Köy", description: "Admin import ile genişletilebilir katmanlar." },
          { title: "Dry-run & Dedup", description: "Import öncesi doğrulama ve tekrar kontrolü." },
          { title: "Import Job Geçmişi", description: "Her import için rapor ve istatistik." },
        ],
      },
    ],
    flow: {
      label: "Page Factory Akışı",
      steps: ["Proje Oluştur", "GEO + Sektör", "Topology Üret", "Cluster + Blueprint", "Tahmin"],
    },
    stats: [
      { value: 81, suffix: "", label: "İl" },
      { value: 973, suffix: "", label: "İlçe" },
      { value: 6, suffix: "", label: "Planlama Motoru" },
    ],
    plans: pageFactoryPlans,
    faq: [
      { id: "pf-1", question: "AI Page Factory içerik üretir mi?", answer: "Hayır. Faz 1 yalnızca topology, cluster, blueprint planlama ve Data Universe veri yönetimidir.", sortOrder: 0, active: true },
      { id: "pf-2", question: "Data Universe nedir?", answer: "GEO, sektör, niyet ve soru kalıplarını tek veri katmanında toplayan paylaşımlı engine'dir.", sortOrder: 1, active: true },
      { id: "pf-3", question: "Hangi dosya formatları desteklenir?", answer: "CSV, JSON ve XLSX ile il, ilçe, mahalle, köy ve sokak importu yapılabilir.", sortOrder: 2, active: true },
      { id: "pf-4", question: "HIVE ile ilişkisi nedir?", answer: "Aynı Data Universe GEO katmanını HIVE GEO Engine de kullanır.", sortOrder: 3, active: true },
      { id: "pf-5", question: "Starter ve Pro farkı nedir?", answer: "Starter 5 proje, Pro 50 proje ve bulk import içerir.", sortOrder: 4, active: true },
    ],
    cta: {
      title: "Sayfa evreninizi planlamaya başlayın",
      description: "Data Universe ile GEO altyapınızı kurun, projelerinizi modelleyin.",
      primaryText: "Satın Al ve Başla",
      primaryUrl: "/payment/checkout?type=module&moduleKey=AI_PAGE_FACTORY&planKey=starter",
      secondaryText: "Paketleri İncele",
      secondaryUrl: "#plans",
    },
  },
  "product-library": {
    slug: "product-library",
    name: "Hazır Ürün Deposu",
    subtitle: "Excel/XML Ürün Motoru",
    description: "Tedarikçi Excel/XML dosyalarını paket olarak yükleyin, alan dönüşüm kuralları tanımlayın, bayi bazlı reçetelerle mağazalarınıza özel ürünler oluşturun ve pazaryerlerine gönderin.",
    icon: "Package",
    themeColor: "#f59e0b",
    accentColor: "#fbbf24",
    badgeText: "YENİ",
    cardFeatures: [
      "Excel/XML Yükleme",
      "Alan Kuralları",
      "Reçete Motoru",
      "Canlı Önizleme",
      "Pazaryeri Çıktısı",
      "Versiyon Takibi",
      "Chrome Eklentisi",
    ],
    hero: {
      title: "Tedarikçi Ürünlerini Hazır Ürün Deposu'na Dönüştürün",
      subtitle: "Hazır Ürün Deposu",
      description: "Excel ve XML dosyalarınızı tek merkezden yönetin, her bayi için ayrı dönüşüm kuralları belirleyin, ürünleri Trendyol, Hepsiburada, n11 ve Temu'ya otomatik gönderin.",
    },
    problems: [
      { title: "Dağınık Tedarikçi Dosyaları", description: "Excel, CSV ve XML dosyaları farklı formatlarda geliyor, her seferinde manuel düzenleme gerekiyor. Zaman kaybı ve hata riski yüksek." },
      { title: "Bayi Bazlı Dönüşüm Karmaşası", description: "Her bayinin fiyat, barkod, başlık gibi alanlarda farklı talepleri var. Tek tek uygulamak imkansız, hata kaçınılmaz." },
      { title: "Versiyon Takibi Eksikliği", description: "Tedarikçi dosyası güncellendiğinde hangi bayi hangi versiyonu kullanıyor, kim ne zaman güncellemiş — kontrol yok." },
      { title: "Pazaryeri Hazırlık Süreci", description: "Trendyol, Hepsiburada, n11, Temu gibi kanalların her biri için ayrı format hazırlamak saatler alıyor." },
    ],
    solution: {
      title: "Bir Kere Yükle, Her Kanala Gönder",
      description: "Hazır Ürün Deposu ile Excel/XML dosyanızı bir kere yükleyin, admin kurallarını tanımlayın, her bayi kendi mağazasına özel reçeteyi uygulasın ve sistem pazaryerine otomatik göndersin.",
    },
    features: [
      { title: "Excel/XML Yükleme", description: "Tedarikçi dosyalarını sürükle-bırak ile yükleyin, sistem otomatik parse etsin ve alanları tanısın.", icon: "Upload" },
      { title: "Alan Kuralları", description: "Admin hangi alanların değiştirilebileceğini belirler: prefix, suffix, fiyat formülü, kilit, gizle.", icon: "Workflow" },
      { title: "Reçete Motoru", description: "Bayi kendi mağazasına özel dönüşüm kurallarını görsel arayüzde tanımlar, canlı önizleme ile görür.", icon: "FileText" },
      { title: "Canlı Önizleme", description: "Dönüşüm öncesi/sonrası değerleri yan yana görün, hataları anında yakalayın ve düzeltin.", icon: "Eye" },
      { title: "Pazaryeri Çıktısı", description: "Trendyol, Hepsiburada, n11, Temu için hazır formatlarda dışa aktarın veya Chrome eklentisi ile doğrudan gönderin.", icon: "Store" },
      { title: "Versiyon Takibi", description: "Her dosya güncellemesi versiyonlanır, eski veriye dönüş mümkündür, değişim geçmişi kayıt altındadır.", icon: "Clock" },
    ],
    sections: [
      {
        id: "what-is",
        title: "Hazır Ürün Deposu Nedir?",
        description: "Tedarikçi Excel/XML dosyalarını tek merkezden yönetmenizi, her bayi için ayrı dönüşüm kuralları tanımlamanızı ve ürünleri doğrudan pazaryerlerine göndermenizi sağlayan güçlü bir ürün motorudur.",
        items: [
          { title: "Tedarikçi Dosyalarını Tek Merkezde Toplar", description: "Farklı formatlardaki Excel, CSV ve XML dosyaları aynı platformda birleşir. Her tedarikçi için ayrı paket oluşturabilir, dosyaları versiyonlarıyla birlikte saklayabilirsiniz." },
          { title: "Admin Kontrollü Dönüşüm Kuralları", description: "Hangi alanların bayi tarafından değiştirilebileceğini siz belirlersiniz. Marka, barkod, fiyat, KDV, stok, başlık gibi alanlar için prefix, suffix, formül, kilit gibi kurallar tanımlayabilirsiniz." },
          { title: "Bayi Bazlı Reçete Sistemi", description: "Her bayi kendi mağazasına özel dönüşüm kurallarını (reçete) görsel arayüzde tanımlar. Aynı paket için farklı mağazalarda farklı reçeteler kullanılabilir." },
          { title: "Pazaryerlerine Otomatik Gönderim", description: "Dönüştürülen ürünler Trendyol, Hepsiburada, n11 ve Temu'ya doğrudan gönderilir. Chrome eklentisi sayesinde pazaryeri paneline manuel giriş yapmadan otomatik işlem yapılır." },
        ],
      },
      {
        id: "why",
        title: "Neden Hazır Ürün Deposu?",
        description: "Tedarikçi ürünlerini yönetmek sandığınızdan daha karmaşık. İşte bu modülün var olma nedeni:",
        items: [
          { title: "Zaman Kazancı", description: "Tedarikçi dosyalarını elle düzenlemek, her bayi için ayrı ayrı uğraşmak saatler alır. Hazır Ürün Deposu ile bu süre dakikalara iner." },
          { title: "Hata Oranını Düşürür", description: "Manuel müdahale arttıkça hata oranı yükselir. Barkod çakışması, yanlış fiyat, eksik başlık gibi sorunlar otomatik kontrollerle önlenir." },
          { title: "Bayi Bağımsızlığı", description: "Admin kuralları belirler ama her bayi kendi mağazasına özel dönüşümü kendisi yapar. Admin onayına gerek kalmaz, operasyon hızlanır." },
          { title: "Ölçeklenebilir Altyapı", description: "100 ürün de 100.000 ürün de aynı sistemle yönetilir. Ayrı katalog yapısı sayesinde ana ürün yönetimi etkilenmez." },
        ],
      },
      {
        id: "groups",
        title: "Desteklenen Gruplar ve Kullanım Alanları",
        description: "Hazır Ürün Deposu farklı sektörlerden farklı ölçekteki işletmelere hitap eder:",
        items: [
          { title: "Toptancılar ve Distribütörler", description: "Tedarikçi XML/Excel dosyalarını paketleyip kendi bayi ağınıza dağıtın. Her bayi kendi fiyat ve marka dönüşümünü yapsın." },
          { title: "E-Ticaret Operasyonları", description: "Pazaryerlerine ürün gönderen firmalar için ideal. Tek dosyadan Trendyol, Hepsiburada, n11 ve Temu'ya eş zamanlı gönderim." },
          { title: "Ajanslar", description: "Birden fazla müşteri ve mağaza yöneten ajanslar için. Her müşteriye özel ayrı paket ve reçete tanımlayın." },
          { title: "Üretici Firmalar", description: "Kendi ürün listesini Excel/XML olarak sunan üreticiler, bayilerine hazır ürün paketi olarak iletebilir." },
        ],
      },
      {
        id: "extension-setup",
        title: "Chrome Eklentisi Kurulumu",
        description: "Pazaryerlerine otomatik ürün gönderimi için ENA Marketplace Connector eklentisini kurmanız gerekiyor. İşte adım adım kurulum:",
        items: [
          { title: "1. Eklentiyi İndirin", description: "Bayi panelindeki 'Connector İndir' butonunu kullanarak zip dosyasını bilgisayarınıza indirin ve klasöre çıkarın." },
          { title: "2. Chrome Uzantılar Sayfasını Açın", description: "Chrome tarayıcınızda address çubuğuna chrome://extensions yazın ve Enter'a basın." },
          { title: "3. Geliştirici Modunu Açın", description: "Sağ üst köşedeki 'Geliştirici modu' (Developer mode) anahtarını aktif edin." },
          { title: "4. Eklentiyi Yükleyin", description: "Soldaki 'Paketlenmemiş öğe yükle' (Load unpacked) butonuna tıklayın ve zip'ten çıkardığınız klasörü seçin." },
          { title: "5. ENA Hesabınıza Bağlanın", description: "Eklenti otomatik olarak ENA hesabınıza bağlanacaktır. Popup üzerinden bağlantı durumunu kontrol edebilirsiniz." },
          { title: "6. Kullanmaya Başlayın", description: "Bayi panelinde bir paketin reçetesinden 'Mağazaya Gönder' ile iş oluşturun. Eklenti otomatik olarak pazaryeri paneline gidip ürünleri yükleyecektir." },
        ],
      },
    ],
    flow: { label: "Hazır Ürün Deposu Akışı", steps: ["Yükle", "Parse Et", "Kural Belirle", "Reçete Oluştur", "Önizle", "Pazaryerine Gönder"] },
    stats: [
      { value: 100, suffix: "K+", label: "Ürün Kapasitesi" },
      { value: 4, suffix: "", label: "Pazaryeri" },
      { value: 6, suffix: "", label: "Adımda Çözüm" },
    ],
    plans: [
      {
        id: "pl-free",
        name: "Ücretsiz",
        description: "Küçük ölçekli kullanım",
        monthlyPrice: 0,
        features: ["1 Paket", "100 Ürün", "Temel Dönüşüm", "Excel Çıktı"],
        sortOrder: 0,
        ctaText: "Başla",
        ctaUrl: "/dealer/product-library",
      },
      {
        id: "pl-starter",
        name: "Starter",
        description: "Büyüyen operasyonlar",
        monthlyPrice: 299,
        yearlyPrice: 2990,
        features: ["5 Paket", "10.000 Ürün", "Gelişmiş Kurallar", "XML/CSV Çıktı", "Versiyon Takibi"],
        sortOrder: 1,
        highlighted: true,
        ctaText: "Başla",
        ctaUrl: "/dealer/modules",
      },
      {
        id: "pl-enterprise",
        name: "Enterprise",
        description: "Kurumsal ölçek",
        monthlyPrice: undefined,
        features: ["Sınırsız Paket", "Sınırsız Ürün", "Özel Kurallar", "Pazaryeri Otomasyonu", "Öncelikli Destek"],
        sortOrder: 2,
        ctaText: "İletişim",
        ctaUrl: "/iletisim",
      },
    ],
    faq: [
      { id: "pl-1", question: "Hazır Ürün Deposu nedir?", answer: "Tedarikçi Excel/XML dosyalarını paket halinde yükleyip bayi bazlı dönüşüm kuralları uygulayarak pazaryerlerine göndermenizi sağlayan ürün motorudur.", sortOrder: 0, active: true },
      { id: "pl-2", question: "Hangi dosya formatları destekleniyor?", answer: "Excel (.xlsx, .xls), CSV ve XML formatları desteklenir. Ayrıca tedarikçi URL'lerinden otomatik çekim yapılabilir.", sortOrder: 1, active: true },
      { id: "pl-3", question: "Bayi hangi alanları değiştirebilir?", answer: "Admin tarafından belirlenen alanlar (marka, barkod prefix, model kodu, stok kodu, başlık, açıklama, fiyat formülü, KDV, stok, hazırlık süresi) bayi tarafından dönüştürülebilir.", sortOrder: 2, active: true },
      { id: "pl-4", question: "Hangi pazaryerlerine gönderim yapılabilir?", answer: "Trendyol, Hepsiburada, n11 ve Temu desteklenir. Yeni pazaryerleri için adaptör eklenebilir.", sortOrder: 3, active: true },
      { id: "pl-5", question: "Reçete nedir?", answer: "Bayinin kendi mağazası için tanımladığı dönüşüm kuralları bütünüdür. Prefix, suffix, fiyat formülü (SET/ADD/MULTIPLY/PERCENT), min değer, yuvarlama gibi kurallar içerir.", sortOrder: 4, active: true },
      { id: "pl-6", question: "Versiyon takibi nasıl çalışır?", answer: "Her dosya güncellemesi otomatik versiyonlanır. Eski versiyona dönüş, değişiklik geçmişi görüntüleme ve kimin ne zaman güncellediği takip edilebilir.", sortOrder: 5, active: true },
      { id: "pl-7", question: "Mevcut ürün yönetimimi etkiler mi?", answer: "Hayır. Hazır Ürün Deposu ürünleri ayrı katalogda (ProductCatalogItem) tutulur, ana ENA ürün yönetimi, sipariş akışları ve stok sistemi etkilenmez.", sortOrder: 6, active: true },
      { id: "pl-8", question: "Kaç ürün yükleyebilirim?", answer: "Paket başına ürün sayısı planınıza göre değişir. Ücretsiz pakette 100 ürün, Starter'da 10.000 ürün, Enterprise'ta sınırsızdır.", sortOrder: 7, active: true },
      { id: "pl-9", question: "Chrome eklentisi zorunlu mu?", answer: "Hayır. Manuel dışa aktarım ile Excel/XML/CSV olarak indirip pazaryerine elle yükleyebilirsiniz. Chrome eklentisi otomatik gönderim için kolaylık sağlar.", sortOrder: 8, active: true },
      { id: "pl-10", question: "Bir paketi birden fazla mağazada kullanabilir miyim?", answer: "Evet. Aynı paket için farklı mağazalarda farklı reçeteler tanımlayabilir, her mağazaya ayrı dönüşüm uygulayabilirsiniz.", sortOrder: 9, active: true },
      { id: "pl-11", question: "Admin erişim türlerini nasıl belirler?", answer: "Admin paket yüklerken erişim türünü seçer: Ücretsiz (bayi tek tıkla ekler), Ücretli (bayi satın alır), Atanmış (yalnızca seçili bayi/gruplarına özel).", sortOrder: 10, active: true },
      { id: "pl-12", question: "Destek nasıl sağlanıyor?", answer: "E-posta ve ticket desteği; Enterprise pakette öncelikli destek ve dedicated onboarding sunulur.", sortOrder: 11, active: true },
    ],
    cta: {
      title: "Tedarikçi ürün operasyonunuzu otomatize edin",
      description: "Excel/XML dosyalarınızı yükleyin, dönüşüm kurallarını tanımlayın, pazaryerlerine gönderin. Dakikalar içinde başlayın.",
      primaryText: "Hemen Başla",
      primaryUrl: "/product-library",
      secondaryText: "Nasıl Çalışır?",
      secondaryUrl: "#sections",
    },
  },
  "dropship": {
    slug: "dropship",
    name: "AI Dropship Store",
    subtitle: "Yapay Zeka Destekli Mağaza Oluşturucu",
    description: "Kendi e-ticaret mağazanı saniyeler içinde aç. Hazır Ürün Deposu'ndan ürünleri seç, fiyatlandır, subdomain'inde satışa başla. Sepet, ödeme, kargo — hepsi hazır.",
    icon: "Store",
    themeColor: "#f97316",
    accentColor: "#ef4444",
    badgeText: "YENİ",
    cardFeatures: [
      "Alt Domain",
      "Ürün Seçimi",
      "Kendi Fiyatın",
      "Hazır Ödeme",
      "Sipariş Yönetimi",
      "Tema Özelleştirme",
      "Özel Domain",
      "Pazaryeri (Yakında)",
    ],
    hero: {
      title: "Dakikalar İçinde Kendi E-Ticaret Mağazanı Aç",
      subtitle: "AI Dropship Store Builder",
      description: "Hiç teknik bilgi gerektirmeden, Hazır Ürün Deposu'ndan seçtiğin ürünlerle kendi mağazanı kur. Subdomain, ödeme altyapısı, kargo — her şey hazır. Sen sadece sat.",
    },
    problems: [
      { title: "E-Ticaret Maliyeti Çok Yüksek", description: "Kendi siteni kurmak, hosting, domain, ödeme entegrasyonu derken binlerce lira harcamak gerek. AI Dropship Store ile tüm altyapı hazır." },
      { title: "Teknik Bilgi Gerekiyor", description: "E-ticaret sitesi kurmak için yazılımcıya ihtiyacın var. Tema, checkout, entegrasyon derken haftalar sürer." },
      { title: "Ürün Tedarik Etmek Zor", description: "Tedarikçi bulmak, ürün fotoğrafı çekmek, açıklama yazmak, stok takibi yapmak... Hepsi ayrı dert." },
      { title: "Ödeme ve Kargo Karmaşası", description: "Kendi POS'unu bağlatmak, kargo şirketiyle anlaşma yapmak, fatura kesmek — her biri ayrı bir operasyon." },
    ],
    solution: {
      title: "Altyapı Bizden, Satış Senden",
      description: "AI Dropship Store Builder ile ihtiyacın olan tek şey bir ENA hesabı. Mağazanı aç, Hazır Ürün Deposu'ndan ürünleri seç, kendi fiyatını belirle ve satmaya başla. Ödeme, kargo, fatura — her şey ENAUNITY'de.",
    },
    features: [
      { title: "Alt Domain", description: "istediğin.enaunity.com.tr adresinde anında mağazan açılır. Profesyonel görünümlü, ücretsiz subdomain.", icon: "Globe" },
      { title: "Ürün Seçimi", description: "Hazır Ürün Deposu'ndaki binlerce ürün arasından dilediğini seç, mağazana ekle. Stok ve tedarik ENAUNITY'de.", icon: "Package" },
      { title: "Kendi Fiyatın", description: "Her ürün için kendi satış fiyatını belirle. Kar marjını sen kontrol et, rekabetçi fiyatlandırma yap.", icon: "DollarSign" },
      { title: "Ödeme Altyapısı", description: "Müşterilerinden ödemeyi ENAUNITY üzerinden al. Kendi POS'una gerek yok. Her ay marjını havale ile al.", icon: "CreditCard" },
      { title: "Sepet ve Sipariş", description: "Çalışan bir sepet sistemi, sipariş yönetimi ve müşteri takibi. Gelen siparişleri tek panelden yönet.", icon: "ShoppingCart" },
      { title: "Tema Özelleştirme", description: "Renkler, fontlar, logo — mağazanın görünümünü kişiselleştir. Markana uygun bir tasarım oluştur.", icon: "Palette" },
      { title: "Özel Domain Desteği", description: "Kendi domain'ini bağla veya Cloudflare üzerinden yeni bir domain satın al. Profesyonel bir mağazaya dönüş.", icon: "Globe" },
      { title: "Pazaryeri Entegrasyonu (Yakında)", description: "Mağazandaki ürünleri tek tıkla Trendyol, Hepsiburada, Amazon'da da satışa çıkar.", icon: "Store" },
    ],
    sections: [
      {
        id: "what-is",
        title: "AI Dropship Store Builder Nedir?",
        description: "Hiçbir teknik bilgi gerektirmeden, dakikalar içinde kendi e-ticaret mağazanı kurmanı sağlayan yapay zeka destekli dropshipping platformudur.",
        items: [
          { title: "Anında Mağaza Kurulumu", description: "Mağaza adını ve alt domainini gir, saniyeler içinde mağazan hazır. Logo, renkler ve tema ile kişiselleştir." },
          { title: "Hazır Ürün Deposu Entegrasyonu", description: "ENAUNITY'nin geniş ürün havuzundan dilediğini seç. Stok, tedarik, kalite kontrol — hepsi ENAUNITY'de." },
          { title: "Kendi Fiyatlandırman", description: "Her ürün için baz fiyatın üzerine kendi marjını koy. Ne kadara satacağına sen karar ver." },
          { title: "Otomatik Sipariş İşleme", description: "Müşteri sipariş verdiğinde ürün otomatik olarak ENAUNITY fulfillment'ına düşer. Sen hiçbir şey yapmazsın." },
        ],
      },
      {
        id: "why",
        title: "Neden AI Dropship Store Builder?",
        description: "E-ticarete başlamak hiç bu kadar kolay olmamıştı.",
        items: [
          { title: "Sıfır Sermaye", description: "Stok yatırımı yapmana gerek yok. Ürünler satıldıkça komisyon kazanırsın." },
          { title: "Sıfır Teknik Bilgi", description: "Domain, hosting, ödeme entegrasyonu, kargo anlaşması — hepsi bizde. Sen sadece satışa odaklan." },
          { title: "Dakikalarda Açılır", description: "Geleneksel e-ticaret sitesi kurulumu haftalar sürer. AI Dropship Store Builder ile dakikalar içinde mağazan yayında." },
          { title: "Ölçeklenebilir", description: "10 ürün de 10.000 ürün de aynı sistem üzerinde yönetilir. İşin büyüdükçe kapasiten de büyür." },
        ],
      },
      {
        id: "groups",
        title: "Kimler İçin Uygun?",
        description: "AI Dropship Store Builder farklı profillerden herkesin kullanabileceği bir sistemdir:",
        items: [
          { title: "Girişimciler", description: "Yan gelir elde etmek isteyen, kendi işini kurmak isteyen herkes. Hiçbir ön şart yok." },
          { title: "Öğrenciler", description: "Okul harçlığını çıkarmak veya girişimciliği deneyimlemek isteyen öğrenciler için ideal." },
          { title: "Mevcut Bayiler", description: "ENAUNITY bayileri ek gelir kapısı olarak kendi mağazalarını açabilir, kendi müşterilerine satış yapabilir." },
          { title: "KOBİ'ler", description: "Dijital dönüşüm yapmak isteyen ama yüksek maliyetlerden kaçınan küçük işletmeler." },
        ],
      },
    ],
    flow: { label: "AI Dropship Store Kurulum Akışı", steps: ["Mağaza Oluştur", "Ürün Seç", "Fiyatlandır", "Yayına Al", "Satışa Başla"] },
    stats: [
      { value: 5, suffix: "Dakika", label: "Kurulum Süresi" },
      { value: 3, suffix: "Adım", label: "Kurulum Adımı" },
      { value: 0, suffix: "TL", label: "Başlangıç Maliyeti" },
    ],
    plans: [
      {
        id: "ds-free",
        name: "Ücretsiz",
        description: "Başlangıç seviyesi",
        monthlyPrice: 0,
        features: ["1 Mağaza", "10 Ürün", "Alt Domain", "Temel Tema"],
        sortOrder: 0,
        ctaText: "Başla",
        ctaUrl: "/dealer/modules",
      },
      {
        id: "ds-starter",
        name: "Starter",
        description: "Büyüyen mağazalar",
        monthlyPrice: 99,
        yearlyPrice: 990,
        features: ["1 Mağaza", "100 Ürün", "Alt Domain", "Tema Özelleştirme", "Öncelikli Destek"],
        sortOrder: 1,
        ctaText: "Başla",
        ctaUrl: "/dealer/modules",
      },
      {
        id: "ds-business",
        name: "Business",
        description: "Profesyonel satıcılar",
        monthlyPrice: 299,
        yearlyPrice: 2990,
        features: ["1 Mağaza", "1.000 Ürün", "Özel Domain", "Gelişmiş Tema", "Öncelikli Destek", "Düşük Komisyon"],
        sortOrder: 2,
        highlighted: true,
        ctaText: "Başla",
        ctaUrl: "/dealer/modules",
      },
    ],
    faq: [
      { id: "ds-1", question: "AI Dropship Store Builder nedir?", answer: "Hiçbir teknik bilgi gerektirmeden, dakikalar içinde kendi e-ticaret mağazanı kurmanı sağlayan dropshipping platformudur.", sortOrder: 0, active: true },
      { id: "ds-2", question: "Ne kadar sürede mağaza açabilirim?", answer: "Mağaza adı ve alt domain bilgilerini gir, 5 dakika içinde mağazan hazır.", sortOrder: 1, active: true },
      { id: "ds-3", question: "Ürünleri nereden buluyorum?", answer: "ENAUNITY Hazır Ürün Deposu'ndaki binlerce ürün arasından seçim yaparsın. Stok, kalite ve tedarik ENAUNITY garantisinde.", sortOrder: 2, active: true },
      { id: "ds-4", question: "Fiyatlandırmayı ben mi belirliyorum?", answer: "Evet. Her ürünün baz fiyatı bellidir, sen üzerine kendi marjını koyarak satış fiyatını belirlersin.", sortOrder: 3, active: true },
      { id: "ds-5", question: "Ödemeyi nasıl alıyorum?", answer: "Müşteriden ödeme ENAUNITY üzerinden alınır. Her ay sonu satışlardan elde ettiğin marj sana havale edilir.", sortOrder: 4, active: true },
      { id: "ds-6", question: "Kargoyu kim yapıyor?", answer: "Siparişler ENAUNITY fulfillment merkezine düşer, ürünler hazırlanır ve kargolanır. Sen hiçbir şey yapmazsın.", sortOrder: 5, active: true },
      { id: "ds-7", question: "Kendi domain'imi kullanabilir miyim?", answer: "Evet. İlerleyen aşamalarda kendi domain'ini bağlayabilir veya Cloudflare üzerinden yeni domain satın alabilirsin.", sortOrder: 6, active: true },
      { id: "ds-8", question: "Kaç ürün ekleyebilirim?", answer: "Planına göre değişir. Ücretsiz planda 10 ürün, Starter'da 100 ürün, Business'ta 1.000 ürün ekleyebilirsin.", sortOrder: 7, active: true },
    ],
    cta: {
      title: "Kendi e-ticaret mağazanı hemen aç",
      description: "Dakikalar içinde kurulum, sıfır sermaye, tam kontrol. AI Dropship Store Builder ile satışa başlamak için hemen başvur.",
      primaryText: "Hemen Başla",
      primaryUrl: "/dealer/modules",
      secondaryText: "Nasıl Çalışır?",
      secondaryUrl: "#sections",
    },
  },
};

export const PLATFORM_SLUGS = ["ena", "thyronix", "hive", "linkslash", "page-factory", "product-library", "dropship"] as const;
export type PlatformSlug = (typeof PLATFORM_SLUGS)[number];

export function getPlatformContent(slug: string): PlatformContent | null {
  return PLATFORM_CONTENT[slug] ?? null;
}
