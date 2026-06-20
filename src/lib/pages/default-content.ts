import type { PageTemplate } from "./types";

export type DefaultPageSeed = {
  title: string;
  slug: string;
  template: PageTemplate;
  order: number;
  content: string;
};

export type DefaultContractSeed = {
  title: string;
  slug: string;
  type: string;
  content: string;
};

export const DEFAULT_PAGES: DefaultPageSeed[] = [
  {
    title: "Hakkımızda",
    slug: "hakkimizda",
    template: "default",
    order: 0,
    content: `<h2>E-Ticarete Girişin En Kolay Yolu</h2>
<p><strong>Ena Unity</strong>, e-ticaret yapmak isteyen girişimciler, işletmeler ve bayiler için geliştirilmiş yeni nesil bir B2B tedarik ve iş ortaklığı platformudur.</p>
<p>Amacımız, ürün üretmek isteyen değil <strong>ürün satmak isteyen</strong> girişimcilerin önündeki maliyet, stok, operasyon ve tedarik engellerini ortadan kaldırmaktır.</p>
<p>Bugün yüzlerce ürün grubunda faaliyet gösteren iş ortaklarımız; stok tutmadan, depo maliyetine katlanmadan ve yüksek yatırım yapmadan satış yapabilmektedir. <strong>Dropshipping</strong>, <strong>XML Bayilik</strong> ve <strong>Stoksuz E-Ticaret</strong> modelleriyle binlerce ürüne tek merkezden ulaşın.</p>
<p>Ena Unity olarak işletmeleri doğru ürünlerle, doğru tedarik ağıyla ve sürdürülebilir ticaret modeliyle buluşturuyoruz.</p>

<h2>Nasıl Çalışıyoruz?</h2>
<p>Geleneksel ticarette ürün bulmak, stoklamak, paketlemek ve yönetmek ciddi maliyetler oluşturur. Ena Unity iş modeli ise bu süreci kolaylaştırır.</p>
<p>İş ortaklarımız;</p>
<ul>
<li><strong>XML ve Excel</strong> ürün entegrasyonlarıyla,</li>
<li><strong>Bayilik sistemi</strong> üzerinden,</li>
<li><strong>Dropshipping</strong> modeliyle,</li>
<li><strong>Stoksuz E-Ticaret</strong> ve toplu ürün tedarikiyle,</li>
</ul>
<p>binlerce ürüne tek merkezden ulaşabilir. Böylece girişimciler zamanlarını operasyon yönetimine değil, satış ve büyümeye ayırabilir.</p>

<h2>Sadece Tedarikçi Değil, İş Ortağıyız</h2>
<p>Bizim için ticaret yalnızca ürün göndermekten ibaret değildir. Bir iş ortağının başarılı olması, Ena Unity'nin başarısıdır.</p>
<p>Bu nedenle;</p>
<ul>
<li>Sürekli güncellenen ürün havuzu,</li>
<li>Bayi destek sistemi,</li>
<li>E-ticaret odaklı çözümler,</li>
<li>Ürün veri yönetimi,</li>
<li>Satış süreçlerine yönelik destekler</li>
</ul>
<p>ile iş ortaklarımızın yanında yer alıyoruz.</p>

<h2>Kimler İçin?</h2>
<h3>Yeni Başlayan Girişimciler</h3>
<p>İlk satışını yapmak isteyen ancak yüksek sermayesi olmayan girişimciler için güçlü bir başlangıç noktasıdır.</p>
<h3>E-Ticaret Satıcıları</h3>
<p>Pazar yerlerinde veya kendi web sitelerinde satış yapan işletmeler için geniş ürün erişimi sunar.</p>
<h3>Bayiler ve Toptancılar</h3>
<p>Daha fazla ürün çeşidiyle müşterilerine ulaşmak isteyen işletmeler için güvenilir bir tedarik ağı oluşturur.</p>
<h3>Kurumsal İşletmeler</h3>
<p>Toplu ürün ihtiyaçlarında sürdürülebilir ve ölçeklenebilir çözümler sağlar.</p>

<h2>Güven, Süreklilik ve Büyüme</h2>
<p>E-ticaret dünyasında başarı yalnızca ürün satmakla değil, doğru tedarik zincirine sahip olmakla mümkündür.</p>
<p>Ena Unity olarak hedefimiz; iş ortaklarımızın büyümesini destekleyen, güvenilir ve sürdürülebilir bir ticaret ekosistemi oluşturmaktır.</p>
<p>Her geçen gün gelişen ürün ağımız, yeni iş ortaklarımız ve büyüyen operasyonlarımızla birlikte Türkiye'nin güçlü B2B ticaret platformlarından biri olma yolunda ilerliyoruz.</p>

<h2>Birlikte Büyüyoruz</h2>
<p>Bugün birçok girişimci ve işletme Ena Unity altyapısını kullanarak satış yapıyor, yeni müşterilere ulaşıyor ve işini büyütüyor.</p>
<p>Çünkü biz yalnızca ürün sunmuyoruz. Yeni fırsatlar, yeni iş modelleri ve yeni kazanç kapıları sunuyoruz.</p>

<p><strong>Ena Unity®</strong><br>
B2B Tedarik • Bayilik Sistemleri • XML &amp; Excel Entegrasyonları • Dropshipping Çözümleri</p>
<p><em>&quot;Ticareti kolaylaştırıyor, büyümeyi hızlandırıyoruz.&quot;</em></p>`,
  },
  {
    title: "SSS",
    slug: "sss",
    template: "faq",
    order: 1,
    content: `<h2>Sıkça Sorulan Sorular</h2>
<p>Enaunity® B4B platformu, bayi başvurusu, sipariş, ödeme ve ürün erişimi hakkında en çok sorulan sorular.</p>
<h3>Enaunity® nedir ve kimler kullanabilir?</h3>
<p>Enaunity®, toptan satış yapan işletmeler ve bayi ağları için tasarlanmış B4B (Business for Business) alışveriş platformudur. Onaylı bayiler, anlaşmalı fiyat listeleri üzerinden sipariş verebilir; bireysel müşteriler katalogu inceleyebilir, bayi başvurusu yapabilir.</p>
<h3>Bayi başvurusu nasıl yapılır?</h3>
<p><a href="/auth/register">Kayıt Ol</a> sayfasından bayi başvurusu oluşturabilirsiniz. Başvurunuz operasyon ekibimiz tarafından değerlendirilir; onay sonrası bayi paneli ve fiyat listelerinize erişim açılır. Ortalama değerlendirme süresi 1–3 iş günüdür.</p>
<h3>Ödeme yöntemleri nelerdir?</h3>
<p>Onaylı bayiler cari hesap, havale/EFT, kredi kartı (EsnekPOS / İyzico) ve tanımlı ödeme koşullarına göre sipariş verebilir. Havale ile verilen siparişlerde dekont yüklemeniz gerekir; 24 saat içinde yüklenmeyen siparişler otomatik iptal edilir.</p>
<h3>THYRONIX ve HIVE modüllerine nasıl erişirim?</h3>
<p>THYRONIX (feed & pazaryeri otomasyonu) ve HIVE (SEO/GEO büyüme) modülleri ayrı lisans gerektirir. Bayi panelinden veya <a href="/products">Müşteri Merkezi</a> üzerinden paket satın alabilir; erişim onay sonrası <a href="/thyronix/login">THYRONIX</a> ve <a href="/hive/login">HIVE</a> giriş ekranlarından sağlanır.</p>
<h3>Minimum sipariş tutarı var mı?</h3>
<p>Minimum sipariş tutarı bayi grubunuza ve fiyat listenize göre değişir. Sepet ekranında ve bayi panelinde geçerli limitler gösterilir. Sorularınız için <a href="/iletisim">İletişim</a> sayfasından bize ulaşabilirsiniz.</p>
<h3>Siparişimi nasıl takip ederim?</h3>
<p>Onaylı bayiler <a href="/dealer/orders">Bayi Paneli → Siparişler</a> bölümünden sipariş durumunu ve kargo takip numarasını görüntüleyebilir. Kargoya verildiğinde e-posta bildirimi de gönderilir.</p>
<h3>İade talebini nasıl oluştururum?</h3>
<p>Bayi panelinden <strong>İade Talepleri</strong> bölümüne giderek teslim aldığınız ürünler için iade başvurusu oluşturabilirsiniz. Detaylı koşullar için <a href="/iade-politikasi">İade Politikası</a> sayfasına bakın.</p>
<h3>Teknik destek nasıl alırım?</h3>
<p>Platform, sipariş ve lisans konularında <a href="/iletisim">İletişim</a> formunu kullanabilir veya <strong>support@enaunity.com</strong> adresine yazabilirsiniz. THYRONIX ve HIVE için modül içi destek kanalları da mevcuttur.</p>`,
  },
  {
    title: "Kargo ve Teslimat",
    slug: "kargo-ve-teslimat",
    template: "default",
    order: 2,
    content: `<h2>Kargo ve Teslimat</h2>
<p>Enaunity® üzerinden verilen siparişler, onay ve ödeme süreçlerinin tamamlanmasının ardından operasyon merkezimizden sevk edilir.</p>
<h3>Teslimat süreleri</h3>
<ul>
<li><strong>Stokta ürünler:</strong> 1–3 iş günü içinde kargoya verilir.</li>
<li><strong>Ön sipariş / üretim:</strong> Ürün sayfasında belirtilen termin geçerlidir.</li>
<li><strong>Toplu siparişler:</strong> 50+ kalem veya palet sevkiyatında operasyon ekibi ayrı planlama yapar.</li>
</ul>
<h3>Kargo firmaları</h3>
<p>Yurtiçi Kargo, Aras Kargo, MNG Kargo ve PTT Kargo ile anlaşmalı gönderim yapılmaktadır. Sipariş bölgesi ve ağırlığa göre en uygun firma seçilir.</p>
<h3>Kargo ücreti</h3>
<ul>
<li><strong>Bayi kendi sitesinden gelen siparişler:</strong> Kargo ücreti sepete yansıtılır.</li>
<li><strong>Pazaryeri siparişleri:</strong> Pazaryeri kargo şablonu geçerlidir; çoğu kanalda kargo ücretsizdir.</li>
<li><strong>Kampanyalı ücretsiz kargo:</strong> Aktif kampanyalarda minimum tutar koşulu sağlandığında kargo bedava uygulanır.</li>
</ul>
<h3>Teslimat adresi</h3>
<p>Bayi siparişlerinde fatura adresi firma bilgilerinizdir. Teslimat adresi sipariş sırasında seçilen depo / şube adresiniz veya pazaryeri kargo şablonundaki adrestir.</p>
<h3>Hasarlı veya eksik teslimat</h3>
<p>Teslim anında kargo görevlisinin yanında paketi kontrol edin. Hasarlı veya eksik ürünlerde 48 saat içinde bayi panelinden destek talebi açın; fotoğraf ve irsaliye bilgisi ekleyin.</p>
<h3>Yurtdışı sevkiyat</h3>
<p>Varsayılan operasyon Türkiye içidir. Yurtdışı sevkiyat talepleri için sipariş öncesi <a href="/iletisim">İletişim</a> üzerinden teklif alınması gerekir.</p>`,
  },
  {
    title: "İade Politikası",
    slug: "iade-politikasi",
    template: "policy",
    order: 3,
    content: `<h2>İade Politikası</h2>
<p>Enaunity® bayi iade süreçleri, tedarik zinciri ve ürün grubuna uygun şekilde yönetilir. Aşağıdaki koşullar onaylı bayiler için geçerlidir.</p>
<h3>İade süresi</h3>
<p>Teslimat tarihinden itibaren <strong>14 gün</strong> içinde iade talebi oluşturulmalıdır. Özel üretim, kişiselleştirilmiş veya hijyen ürünlerinde iade kabul edilmeyebilir — ürün sayfasındaki notlar geçerlidir.</p>
<h3>İade koşulları</h3>
<ol>
<li>Ürün kullanılmamış, hasarsız ve orijinal ambalajında olmalıdır.</li>
<li>İade sebebi bayi panelinde açıkça belirtilmelidir.</li>
<li>Fatura ve irsaliye bilgileri talebe eklenmelidir.</li>
<li>Onay sonrası ürünler belirtilen depo adresine kargolanmalıdır.</li>
</ol>
<h3>İade süreci</h3>
<ol>
<li><strong>Talep:</strong> Bayi paneli → İade Talepleri → Yeni talep</li>
<li><strong>İnceleme:</strong> Operasyon ekibi 1–2 iş günü içinde değerlendirir</li>
<li><strong>Onay:</strong> Onaylanan talepler için iade kargo bilgisi paylaşılır</li>
<li><strong>İade alımı:</strong> Ürün depoya ulaştığında kontrol edilir</li>
<li><strong>İade kredisi:</strong> Onay sonrası cari hesaba iade kredisi yansıtılır</li>
</ol>
<h3>Reddedilen iadeler</h3>
<p>Kullanılmış, hasarlı veya süresi geçmiş talepler reddedilebilir. Red gerekçesi panel üzerinden iletilir.</p>
<h3>Pazaryeri siparişleri</h3>
<p>Pazaryeri kanalından gelen siparişlerde ilgili pazaryerinin iade kuralları önceliklidir; Enaunity operasyon ekibi süreci koordine eder.</p>
<p>Sorularınız için <a href="/iletisim">İletişim</a> sayfasından bize ulaşabilirsiniz.</p>`,
  },
  {
    title: "İletişim",
    slug: "iletisim",
    template: "contact",
    order: 4,
    content: `<h2>Bize Ulaşın</h2>
<p>Bayi başvurusu, sipariş, ödeme, lisans ve teknik konularda ekibimiz size yardımcı olmaya hazır. Formu doldurun veya aşağıdaki kanallardan doğrudan iletişime geçin.</p>
<p><strong>Çalışma saatleri:</strong> Pazartesi – Cuma, 09:00 – 18:00 (TSI)</p>
<p>Acil sipariş ve operasyon konularında bayi paneli bildirimlerinizi de takip edebilirsiniz.</p>`,
  },
];

export const DEFAULT_CONTRACTS: DefaultContractSeed[] = [
  {
    title: "KVKK Aydınlatma Metni",
    slug: "kvkk-aydinlatma-metni",
    type: "public",
    content: `<h2>KVKK Aydınlatma Metni</h2>
<p><strong>Veri Sorumlusu:</strong> Enaunity® (ThatTeknoloji®)</p>
<p>6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında kişisel verileriniz; bayi başvurusu, sipariş, ödeme, cari hesap ve platform kullanımı süreçlerinde işlenmektedir.</p>
<h3>İşlenen veri kategorileri</h3>
<ul>
<li>Kimlik ve iletişim bilgileri (ad, e-posta, telefon, firma unvanı)</li>
<li>Finans ve ödeme bilgileri (fatura, IBAN, cari hareketler)</li>
<li>İşlem güvenliği (IP, oturum, log kayıtları)</li>
<li>Sipariş ve lojistik bilgileri (adres, kargo takip)</li>
</ul>
<h3>İşleme amaçları</h3>
<p>Sözleşmenin ifası, yasal yükümlülükler, meşru menfaat ve açık rıza kapsamında hizmet sunumu, müşteri ilişkileri yönetimi ve güvenlik.</p>
<h3>Haklarınız</h3>
<p>KVKK md. 11 kapsamında bilgi talep etme, düzeltme, silme, itiraz ve şikâyet haklarına sahipsiniz. Taleplerinizi <strong>kvkk@enaunity.com</strong> adresine iletebilirsiniz.</p>`,
  },
  {
    title: "Gizlilik Politikası",
    slug: "gizlilik-politikasi",
    type: "public",
    content: `<h2>Gizlilik Politikası</h2>
<p>Enaunity®, kullanıcı gizliliğine önem verir. Bu politika, platform üzerinde toplanan bilgilerin nasıl kullanıldığını açıklar.</p>
<h3>Toplanan bilgiler</h3>
<p>Kayıt, sipariş ve panel kullanımı sırasında sağladığınız bilgiler; teknik loglar ve çerezler (oturum, tercih, analitik).</p>
<h3>Bilgilerin kullanımı</h3>
<p>Hizmet sunumu, sipariş işleme, güvenlik, yasal uyum ve — onayınız dahilinde — pazarlama iletişimi.</p>
<h3>Üçüncü taraflar</h3>
<p>Ödeme kuruluşları (EsnekPOS, İyzico), kargo firmaları ve yasal zorunluluk halinde yetkili mercilerle sınırlı paylaşım yapılabilir.</p>
<h3>Güvenlik</h3>
<p>Veriler şifreli bağlantı (HTTPS), rol bazlı erişim ve düzenli yedekleme ile korunur.</p>
<h3>İletişim</h3>
<p>Gizlilik talepleri: <strong>privacy@enaunity.com</strong></p>`,
  },
  {
    title: "Mesafeli Satış Sözleşmesi",
    slug: "mesafeli-satis-sozlesmesi",
    type: "public",
    content: `<h2>Mesafeli Satış Sözleşmesi</h2>
<p>İşbu sözleşme, Enaunity® platformu üzerinden elektronik ortamda verilen siparişlere ilişkin 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri çerçevesinde düzenlenmiştir.</p>
<h3>Taraflar</h3>
<p><strong>Satıcı:</strong> Enaunity® / ThatTeknoloji®<br><strong>Alıcı:</strong> Platformda kayıtlı bayi veya onaylı müşteri</p>
<h3>Sözleşme konusu</h3>
<p>Platformda listelenen ürün ve hizmetlerin satışı ve teslimatına ilişkin hak ve yükümlülükler.</p>
<h3>Ödeme ve teslimat</h3>
<p>Ödeme yöntemi sipariş anında seçilir; teslimat süreleri <a href="/kargo-ve-teslimat">Kargo ve Teslimat</a> sayfasında belirtilmiştir.</p>
<h3>Cayma hakkı</h3>
<p>Tüketici niteliğindeki alıcılar için yasal cayma süreleri saklıdır. Ticari (B2B) siparişlerde <a href="/iade-politikasi">İade Politikası</a> geçerlidir.</p>
<h3>Uyuşmazlık</h3>
<p>Tüketici uyuşmazlıklarında ilgili Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.</p>`,
  },
  {
    title: "Bayi / Tedarikçi Sözleşmesi",
    slug: "bayi-sozlesmesi",
    type: "dealer",
    content: `<h2>Bayi / Tedarikçi Sözleşmesi</h2>
<p>Enaunity® platformuna bayi veya tedarikçi olarak dahil olan taraflar aşağıdaki esasları kabul eder.</p>
<h3>Tarafların yükümlülükleri</h3>
<ul>
<li><strong>Enaunity®:</strong> Platform erişimi, fiyat listesi, sipariş ve lojistik koordinasyonu</li>
<li><strong>Bayi:</strong> Doğru firma bilgisi, zamanında ödeme, stok ve sipariş kurallarına uyum</li>
<li><strong>Tedarikçi:</strong> Ürün kalitesi, stok doğruluğu ve teslimat taahhütleri</li>
</ul>
<h3>Fiyatlandırma</h3>
<p>Bayi grubuna tanımlı fiyat listeleri geçerlidir. Enaunity® fiyatları önceden bildirimle güncelleyebilir.</p>
<h3>Ödeme koşulları</h3>
<p>Cari hesap limiti, vade ve ödeme yöntemleri bayi profiline göre tanımlanır. Gecikmede sipariş askıya alınabilir.</p>
<h3>Gizlilik</h3>
<p>Taraflar ticari sırları ve müşteri verilerini üçüncü kişilerle paylaşmaz.</p>
<h3>Süre ve fesih</h3>
<p>Sözleşme süresizdir; taraflar 30 gün önceden yazılı bildirimle feshedebilir.</p>`,
  },
];
