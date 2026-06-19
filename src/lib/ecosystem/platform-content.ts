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
};

export const PLATFORM_SLUGS = ["ena", "thyronix", "hive"] as const;
export type PlatformSlug = (typeof PLATFORM_SLUGS)[number];

export function getPlatformContent(slug: string): PlatformContent | null {
  return PLATFORM_CONTENT[slug] ?? null;
}
