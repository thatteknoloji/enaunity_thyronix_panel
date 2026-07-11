"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Building2, Handshake, Link2, ChevronDown, FileText, CheckCircle, ArrowRight, Users, Truck, TrendingUp, Shield, Mail, Phone, MapPin, X, Loader2, Upload, Store } from "lucide-react";
import toast from "react-hot-toast";

const models = [
  {
    id: "tedarikci",
    title: "Tedarikçi Ortağı",
    icon: Truck,
    shortDesc: "Ürünlerinizi Enaunity®'nin B4B platformunda milyonlarca kurumsal müşteriye ulaştırın.",
    stats: [
      { label: "Komisyon Oranı", value: "%8-15" },
      { label: "Ödeme Dönemi", value: "30 Gün" },
      { label: "Minimum Ürün", value: "20 Adet" },
    ],
    benefits: [
      "Geniş kurumsal müşteri ağına anında erişim",
      "Otomatik sipariş ve envanter yönetimi",
      "Düzenli ödeme (net 30)",
      "Lojistik ve kargo desteği",
      "Ürün fotoğrafçılığı ve içerik desteği",
      "Gerçek zamanlı satış raporları",
    ],
    process: [
      { step: "Başvuru", desc: "Tedarikçi başvuru formunu doldurun" },
      { step: "Değerlendirme", desc: "Ürün kalitesi ve kapasite değerlendirmesi" },
      { step: "Sözleşme", desc: "Tedarikçi sözleşmesinin imzalanması" },
      { step: "Entegrasyon", desc: "Ürün ve stok entegrasyonu" },
      { step: "Aktivasyon", desc: "Platformda canlı yayın" },
    ],
  },
  {
    id: "satis",
    title: "Satış Ortağı",
    icon: TrendingUp,
    shortDesc: "Enaunity® ürünlerini kendi kanallarınızda satın, her satıştan komisyon kazanın.",
    stats: [
      { label: "Komisyon Oranı", value: "%12-20" },
      { label: "Ödeme Dönemi", value: "15 Gün" },
      { label: "Asgari Satış", value: "Yok" },
    ],
    benefits: [
      "Satış başına yüksek komisyon",
      "Özel affiliate link ve kodlar",
      "Gerçek zamanlı takip paneli",
      "Pazarlama materyali desteği",
      "Hızlı ödeme (net 15)",
      "Özel indirim ve kampanya erişimi",
    ],
    process: [
      { step: "Başvuru", desc: "Affiliate başvuru formunu doldurun" },
      { step: "Onay", desc: "Başvurunuzun değerlendirilmesi" },
      { step: "Sözleşme", desc: "Satış ortaklığı sözleşmesinin imzalanması" },
      { step: "Erişim", desc: "Affiliate panel ve materyallerin teslimi" },
      { step: "Satış", desc: "Kendi kanallarınızda satışa başlayın" },
    ],
  },
  {
    id: "stratejik",
    title: "Stratejik İş Ortağı",
    icon: Handshake,
    shortDesc: "Ortak projeler, co-marketing ve uzun vadeli iş birlikleri ile büyüyün.",
    stats: [
      { label: "İş Birliği Süresi", value: "12+ Ay" },
      { label: "Gelir Paylaşımı", value: "Özel" },
      { label: "Öncelik", value: "VIP" },
    ],
    benefits: [
      "Özel fiyatlandırma ve kar marjı",
      "Co-marketing ve ortak lansman desteği",
      "Öncelikli teknik ve operasyonel destek",
      "Birlikte ürün/hizmet geliştirme",
      "Ortak etkinlik ve webinar organizasyonu",
      "Stratejik planlama ve büyüme danışmanlığı",
    ],
    process: [
      { step: "Başvuru", desc: "Stratejik iş birliği başvurusu" },
      { step: "Keşif", desc: "Hedef ve vizyon uyum görüşmesi" },
      { step: "Fizibilite", desc: "Detaylı iş planı ve fizibilite çalışması" },
      { step: "Sözleşme", desc: "Kapsamlı iş ortaklığı sözleşmesi" },
      { step: "Lansman", desc: "Ortak go-to-market aktivasyonu" },
    ],
  },
  {
    id: "bayi",
    title: "Bayi (B2B)",
    icon: Store,
    shortDesc: "Enaunity® ürünlerini toptan fiyatlarla satın alın, kendi bayi panelinizle yönetin.",
    stats: [
      { label: "Toptan İndirim", value: "%25-45" },
      { label: "Ödeme Vadesi", value: "45 Gün" },
      { label: "Min. Sipariş", value: "2.000 TL" },
    ],
    benefits: [
      "Özel toptan fiyat listesi ve aşamalı iskonto",
      "Kişisel bayi paneli (dashboard, sipariş, bakiye)",
      "45 güne varan ödeme vadesi",
      "Özel stok havuzu ve öncelikli tedarik",
      "Pazarlama ve satış materyali desteği",
      "7/24 öncelikli teknik destek hattı",
    ],
    process: [
      { step: "Başvuru", desc: "Bayi başvuru formunu doldurun ve evrakları yükleyin" },
      { step: "Değerlendirme", desc: "Referans ve ticari sicil değerlendirmesi" },
      { step: "Sözleşme", desc: "Bayilik sözleşmesinin imzalanması" },
      { step: "Onboarding", desc: "Bayi paneli kurulumu ve eğitim" },
      { step: "Aktivasyon", desc: "İlk sipariş ve canlı satış başlangıcı" },
    ],
  },
];

const tedarikciSozlesme = {
  baslik: "TEDARİKÇİ ORTAKLIĞI SÖZLEŞMESİ",
  taraflar: `İşbu Tedarikçi Ortaklığı Sözleşmesi ("Sözleşme"), aşağıda bilgileri yer alan taraflar arasında akdedilmiştir.

TEDARİK EDEN ("Tedarikçi")
Ad/Unvan: ________________________________
Adres: ________________________________
Vergi Dairesi/No: ________________________________
Yetkili: ________________________________
Telefon/E-posta: ________________________________

TEDARİK EDİLEN ("ENAUNITY®")
Ad/Unvan: Candan Kaynar Ena Unity
Adres: Akdeniz Mahallesi, Şehit Fethi Bey Caddesi, Kızıl Kanat İşmerkezi Kat 8 No: 83, Konak/İzmir
Vergi Dairesi/No: ________________________________
Yetkili: Candan Kaynar
Telefon: 0541 188 14 35
E-posta: info@enaunity.com`,
  maddeler: [
    {
      baslik: "1. SÖZLEŞMENİN KONUSU VE AMACI",
      icerik: "İşbu Sözleşme'nin konusu, Tedarikçi'nin ürettiği/pazarladığı ürünlerin Enaunity® platformu üzerinden B4B müşterilere satışına aracılık edilmesi ve bu satışlardan doğan hak ve yükümlülüklerin belirlenmesidir. Taraflar, Sözleşme kapsamında iş birliği yaparak karşılıklı ticari fayda sağlamayı amaçlar.",
    },
    {
      baslik: "2. TANIMLAR",
      icerik: `2.1. Platform: Enaunity® B4B e-ticaret platformu (www.enaunity.com)
2.2. Ürün: Tedarikçi tarafından temin edilen, platformda listelenen her türlü mal
2.3. Brüt Satış Bedeli: KDV dahil müşteriden tahsil edilen toplam bedel
2.4. Net Satış Bedeli: Brüt Satış Bedeli'nden iade, kargo ve diğer kesintiler düşüldükten sonra kalan tutar
2.5. Komisyon: Enaunity®'nin satışa aracılık hizmeti karşılığı aldığı bedel`,
    },
    {
      baslik: "3. TARAFLARIN HAK VE YÜKÜMLÜLÜKLERİ",
      icerik: `3.1. Tedarikçi'nin Yükümlülükleri:
a) Ürünlerin stok, fiyat ve görsel bilgilerini güncel tutmak
b) Siparişlerin en geç 48 iş saati içinde kargoya teslimini sağlamak
c) Ürünlerin mevzuata uygunluğunu garanti etmek
d) Müşteri iade ve şikayetlerini 24 saat içinde yanıtlamak
e) Fatura ve sevk irsaliyesini eksiksiz düzenlemek
f) Rekabet etmeme yükümlülüğü kapsamında platform dışında Enaunity® müşterilerine doğrudan satış yapmamak

3.2. Enaunity®'nin Yükümlülükleri:
a) Ürünlerin platformda uygun şekilde sergilenmesini sağlamak
b) Satış tahsilatını gerçekleştirmek
c) Satış raporlarını gerçek zamanlı sunmak
d) Ödemeleri sözleşmede belirtilen vadede yapmak
e) Pazarlama ve tanıtım faaliyetlerini yürütmek`,
    },
    {
      baslik: "4. KOMİSYON VE ÖDEME KOŞULLARI",
      icerik: `4.1. Enaunity®, her bir satış için Net Satış Bedeli üzerinden %8 (sekiz) ile %15 (on beş) arasında değişen oranlarda komisyon kesintisi yapar. Kesin komisyon oranı, taraflar arasında ayrıca imzalanan Ek-1 Komisyon Cetveli'nde belirtilir.

4.2. Ödeme dönemi 30 (otuz) takvim günüdür. Her ayın son iş günü, bir önceki aya ait satışların raporu düzenlenir ve ödeme 30 gün içinde Tedarikçi'nin bildirdiği banka hesabına EFT/havale yoluyla yatırılır.

4.3. İade edilen ürünlerin komisyonu, ilgili ödeme döneminden mahsup edilir.

4.4. Enaunity®, ödemeleri yapmadan önce fatura kesilmesini talep etme hakkına sahiptir.`,
    },
    {
      baslik: "5. FİKRİ MÜLKİYET HAKLARI",
      icerik: `5.1. Tedarikçi, platformda kullanılmak üzere sağladığı ürün görselleri, açıklamalar ve diğer içeriklerin kullanım haklarını Enaunity®'ye verir.

5.2. Enaunity®'nin platform yazılımı, markası ve ticari bilgileri üzerindeki tüm fikri mülkiyet hakları Enaunity®'ye aittir.

5.3. Taraflar, sözleşme süresince edindikleri ticari bilgileri üçüncü kişilerle paylaşamaz.`,
    },
    {
      baslik: "6. GİZLİLİK VE VERİ KORUMA",
      icerik: `6.1. Taraflar, sözleşme kapsamında edindikleri ticari sır, müşteri verisi ve gizli bilgileri 6698 sayılı KVKK'ya uygun şekilde işlemek ve korumakla yükümlüdür.

6.2. Müşteri verileri yalnızca sözleşmenin ifası amacıyla kullanılabilir, üçüncü kişilerle paylaşılamaz.

6.3. Gizlilik yükümlülüğü sözleşmenin feshinden sonra 5 (beş) yıl süreyle devam eder.`,
    },
    {
      baslik: "7. MVA (MİNİMUM SATIŞ HACMİ)",
      icerik: `7.1. Tedarikçi, sözleşme süresince aylık minimum ___ TL (________ Türk Lirası) satış hacmi taahhüt eder.

7.2. MVA tutarı, tarafların mutabakatı ile Ek-1'de belirlenir. MVA'nın 3 (üç) ardışık ay boyunca sağlanamaması halinde Enaunity® sözleşmeyi feshetme hakkına sahiptir.

7.3. Mütakip dönemlerde MVA tutarı, tarafların karşılıklı anlaşmasıyla güncellenebilir.`,
    },
    {
      baslik: "8. SÖZLEŞME SÜRESİ VE FESİH",
      icerik: `8.1. Sözleşme, imza tarihinden itibaren 12 (on iki) ay süreyle yürürlüktedir. Süre sonunda taraflardan biri aksini bildirmezse sözleşme 12'şer aylık dönemler halinde otomatik olarak yenilenir.

8.2. Taraflar, 30 (otuz) gün önceden yazılı bildirimde bulunarak sözleşmeyi haklı sebep olmaksızın feshedebilir.

8.3. Aşağıdaki hallerde haklı fesih mümkündür:
a) Taraflardan birinin ifa etmemesi ve 15 günlük ihtara rağmen ifanın gerçekleşmemesi
b) Tedarikçi'nin ürün kalite standartlarını sürekli ihlal etmesi
c) Taraflardan birinin iflası veya konkordato ilan etmesi
d) Gizlilik yükümlülüklerinin ihlali
e) Rekabet yasağının ihlali`,
    },
    {
      baslik: "9. CEZAİ ŞART VE SORUMLULUK",
      icerik: `9.1. Siparişin zamanında teslim edilmemesi halinde Tedarikçi, her bir gecikme günü için sipariş tutarının %0,5'i oranında cezai şart öder.

9.2. Rekabet yasağının ihlali halinde Tedarikçi, son 12 aylık toplam komisyon tutarının 5 (beş) katı cezai şart öder.

9.3. Gizlilik ihlali halinde ispatlanan zararın 3 (üç) katı tazminat olarak ödenir.`,
    },
    {
      baslik: "10. MÜCBİR SEBEP",
      icerik: "Deprem, sel, yangın, savaş, terör, salgın hastalık, grev ve benzeri mücbir sebeplerin varlığında tarafların yükümlülükleri mücbir sebep süresince askıya alınır. Mücbir sebebin 60 (altmış) günden uzun sürmesi halinde taraflar sözleşmeyi feshedebilir.",
    },
    {
      baslik: "11. DENETİM HAKKI",
      icerik: "Enaunity®, Tedarikçi'nin stok, kalite ve sipariş süreçlerini denetleme hakkına sahiptir. Denetim, önceden haber verilmek suretiyle yılda en fazla 2 (iki) kez yapılabilir.",
    },
    {
      baslik: "12. DEVRİR VE ALT YÜKLENİCİ",
      icerik: "Taraflar, sözleşmeden doğan hak ve borçlarını diğer tarafın yazılı onayı olmaksızın üçüncü kişilere devredemez veya alt yükleniciye yaptıramaz. Aykırı davranış halinde sözleşme feshedilebilir.",
    },
    {
      baslik: "13. BAĞIMSIZLIK VE FERAGAT",
      icerik: `13.1. Taraflar bağımsız ticari işletmelerdir. Bu sözleşme, taraflar arasında hiçbir şekilde ortaklık, acentelik veya işçi-işveren ilişkisi oluşturmaz.

13.2. Taraflardan birinin sözleşmeden doğan bir hakkını kullanmaması veya geç kullanması, bu haktan feragat ettiği anlamına gelmez.`,
    },
    {
      baslik: "14. UYUŞMAZLIKLARIN ÇÖZÜMÜ",
      icerik: "İşbu sözleşmeden doğan uyuşmazlıklarda İzmir Adliyesi Mahkemeleri ve İcra Daireleri yetkilidir. Sözleşmeye Türkiye Cumhuriyeti hukuku uygulanır.",
    },
    {
      baslik: "15. TEBLİĞ VE İHBARLAR",
      icerik: "Sözleşme kapsamındaki bildirimler yazılı olarak yapılır. Bildirimler, tarafların sözleşmede belirttiği adreslere iadeli taahhütlü mektupla veya kurye ile gönderilir. Kayıtlı e-posta (KEP) adresleri üzerinden yapılan bildirimler de geçerlidir.",
    },
    {
      baslik: "16. UYUM YÜKÜMLÜLÜĞÜ",
      icerik: `16.1. Tedarikçi, ürünlerin ilgili tüm yasal düzenlemelere (tüketici hakları, CE işareti, REACH, vs.) uygun olduğunu beyan ve taahhüt eder.

16.2. Tedarikçi, Enaunity®'nin etik kurallarına ve tedarikçi davranış ilkelerine uygun hareket edeceğini kabul eder.`,
    },
    {
      baslik: "17. YÜRÜRLÜK",
      icerik: "İşbu Sözleşme 17 (on yedi) ana madde ve eklerinden oluşmaktadır. Sözleşme, taraflarca elektronik ortamda onaylanması veya ıslak imza ile imzalanması halinde yürürlüğe girer.",
    },
  ],
};

const satisSozlesme = {
  baslik: "SATIŞ ORTAKLIĞI (AFFİLİATE) SÖZLEŞMESİ",
  taraflar: `İşbu Satış Ortaklığı Sözleşmesi ("Sözleşme"), aşağıda bilgileri yer alan taraflar arasında akdedilmiştir.

SATIŞ ORTAĞI ("Affiliate")
Ad/Unvan: ________________________________
Adres: ________________________________
Vergi Dairesi/No: ________________________________
Web Sitesi/Sosyal Medya: ________________________________
Telefon/E-posta: ________________________________

İŞLETMECİ ("ENAUNITY®")
Ad/Unvan: Candan Kaynar Ena Unity
Adres: Akdeniz Mahallesi, Şehit Fethi Bey Caddesi, Kızıl Kanat İşmerkezi Kat 8 No: 83, Konak/İzmir
Yetkili: Candan Kaynar
Telefon: 0541 188 14 35
E-posta: info@enaunity.com`,
  maddeler: [
    {
      baslik: "1. SÖZLEŞMENİN KONUSU",
      icerik: "İşbu Sözleşme'nin konusu, Satış Ortağı'nın (Affiliate) kendi kanalları (web sitesi, blog, sosyal medya, e-posta listesi vb.) aracılığıyla Enaunity® ürünlerinin tanıtımını yapması ve yönlendirdiği müşterilerin gerçekleştirdiği satışlardan komisyon kazanmasıdır.",
    },
    {
      baslik: "2. TANIMLAR",
      icerik: `2.1. Affiliate Link: Satış Ortağı'na özel oluşturulan, yönlendirmeleri takip eden benzersiz URL
2.2. Komisyon: Affiliate link üzerinden yapılan satışlardan Satış Ortağı'na ödenen bedel
2.3. Dönüşüm: Affiliate linke tıklayan ziyaretçinin 30 gün içinde satın alma yapması
2.4. Çerez Süresi: Affiliate linke tıklama ile satış arasında tanınan 30 günlük referans süresi`,
    },
    {
      baslik: "3. AFFİLİATE HAK VE YÜKÜMLÜLÜKLERİ",
      icerik: `3.1. Satış Ortağı:
a) Enaunity® ürünlerini kendi kanallarında tanıtmak
b) Sağlanan pazarlama materyallerini kullanmak
c) Reklam ve tanıtımlarda doğru ve yanıltıcı olmayan bilgiler paylaşmak
d) Enaunity® markasına zarar verecek içeriklerden kaçınmak
e) Spam, sahte yönlendirme veya hileli trafik oluşturmamak
f) Rekabet eden platformları tanıtmamak`,
    },
    {
      baslik: "4. KOMİSYON VE ÖDEME KOŞULLARI",
      icerik: `4.1. Satış Ortağı, her bir başarılı satış için Net Satış Bedeli üzerinden %12 (on iki) ile %20 (yirmi) arasında komisyon kazanır. Kesin oran Ek-1'de belirlenir.

4.2. Komisyon hesaplamasında çerez süresi 30 (otuz) gündür.

4.3. Ödemeler 15 (on beş) günde bir yapılır. Asgari ödeme tutarı 100 TL (yüz Türk Lirası)'dır. Bu tutarın altındaki bakiye bir sonraki döneme devreder.

4.4. İade ve iptal edilen siparişlerin komisyonu mahsup edilir.`,
    },
    {
      baslik: "5. YASAKLANMIŞ YÖNTEMLER",
      icerik: `5.1. Satış Ortağı aşağıdaki yöntemleri kullanamaz:
a) Spam e-posta veya istenmeyen mesaj gönderimi
b) Tıklama botları veya otomatik tıklama yazılımları
c) Enaunity® markasını arama reklamlarında (SEM) izinsiz kullanım
d) Sahte veya yanıltıcı yönlendirmeler
e) Kupon/promo kodu paylaşım sitelerinde kontrolsüz paylaşım
f) Kendi kendine satış yapmak veya sahte hesaplar oluşturmak

5.2. Yasaklı yöntem tespit edilmesi halinde kazanılmış tüm komisyonlar iptal edilir ve sözleşme derhal feshedilir.`,
    },
    {
      baslik: "6. GİZLİLİK VE VERİ KORUMA",
      icerik: "Satış Ortağı, Enaunity® müşteri verilerine erişemez. Affiliate linkler üzerinden toplanan veriler yalnızca Enaunity® tarafından işlenir. Satış Ortağı, KVKK kapsamında veri sorumlusu değildir ancak kendi kanallarında topladığı verilerden kendisi sorumludur.",
    },
    {
      baslik: "7. SÖZLEŞME SÜRESİ VE FESİH",
      icerik: `7.1. Sözleşme imza tarihinde yürürlüğe girer ve belirsiz sürelidir.

7.2. Taraflar 7 (yedi) gün önceden yazılı bildirimde bulunarak sözleşmeyi herhangi bir gerekçe göstermeksizin feshedebilir.

7.3. Haklı fesih halleri:
a) Yasaklı yöntem kullanımı
b) Marka itibarını zedeleyici davranışlar
c) 6 ay boyunca hiç satış gerçekleştirmeme
d) Gizlilik ihlali`,
    },
    {
      baslik: "8. FİKRİ MÜLKİYET",
      icerik: "Satış Ortağı'na sağlanan marka, logo, görsel ve içeriklerin mülkiyeti Enaunity®'ye aittir. Satış Ortağı, bu materyalleri yalnızca sözleşme süresince ve sözleşme amaçları için kullanabilir. Sözleşmenin feshinde tüm materyaller imha edilmelidir.",
    },
    {
      baslik: "9. SORUMLULUK VE TAZMİNAT",
      icerik: "Satış Ortağı, sözleşme ihlali nedeniyle Enaunity®'nin uğradığı doğrudan ve dolaylı zararları tazmin etmekle yükümlüdür. Satış Ortağı'nın kusurlu davranışından kaynaklanan üçüncü kişi taleplerinde Satış Ortağı sorumludur.",
    },
    {
      baslik: "10. BAĞIMSIZLIK",
      icerik: "Satış Ortağı bağımsız bir yüklenicidir. Taraflar arasında işçi-işveren, ortaklık veya acentelik ilişkisi yoktur. Satış Ortağı, kendi vergisel yükümlülüklerini yerine getirmekten sorumludur.",
    },
    {
      baslik: "11. UYUŞMAZLIKLARIN ÇÖZÜMÜ",
      icerik: "İzmir Mahkemeleri ve İcra Daireleri yetkilidir. Türkiye Cumhuriyeti hukuku uygulanır.",
    },
    {
      baslik: "12. YÜRÜRLÜK",
      icerik: "İşbu Sözleşme 12 (on iki) ana maddeden oluşmaktadır. Sözleşme taraflarca onaylandığı tarihte yürürlüğe girer.",
    },
  ],
};

const stratejikSozlesme = {
  baslik: "STRATEJİK İŞ ORTAKLIĞI SÖZLEŞMESİ",
  taraflar: `İşbu Stratejik İş Ortaklığı Sözleşmesi ("Sözleşme"), aşağıda bilgileri yer alan taraflar arasında akdedilmiştir.

İŞ ORTAĞI
Ad/Unvan: ________________________________
Adres: ________________________________
İş Alanı: ________________________________
Yetkili: ________________________________
Telefon/E-posta: ________________________________

ENAUNITY®
Ad/Unvan: Candan Kaynar Ena Unity
Adres: Akdeniz Mahallesi, Şehit Fethi Bey Caddesi, Kızıl Kanat İşmerkezi Kat 8 No: 83, Konak/İzmir
Yetkili: Candan Kaynar
Telefon: 0541 188 14 35
E-posta: info@enaunity.com`,
  maddeler: [
    {
      baslik: "1. SÖZLEŞMENİN KONUSU VE KAPSAMI",
      icerik: "İşbu Sözleşme, taraflar arasında stratejik iş birliği çerçevesinde ortak ürün geliştirme, co-marketing faaliyetleri, karşılıklı müşteri yönlendirme, ortak satış kanalları oluşturma ve diğer stratejik girişimlerin yürütülmesine ilişkin hak, yükümlülük ve esasları düzenler.",
    },
    {
      baslik: "2. İŞ BİRLİĞİ ALANLARI",
      icerik: `2.1. Ortak Pazarlama (Co-Marketing): Ortak webinarlar, etkinlikler, case study'ler, içerik pazarlaması
2.2. Ürün Geliştirme: Birlikte yeni ürün/hizmet geliştirme veya mevcut ürünlerin entegrasyonu
2.3. Satış İş Birliği: Karşılıklı müşteri yönlendirme ve ortak satış faaliyetleri
2.4. Teknik Entegrasyon: API ve sistem entegrasyonları
2.5. Bilgi Paylaşımı: Sektörel içgörüler ve pazar istihbaratı`,
    },
    {
      baslik: "3. YÖNETİM VE İLETİŞİM",
      icerik: `3.1. Taraflar, iş birliğini yönetmek üzere birer kıdemli temsilci atar.

3.2. Ayda bir kez düzenli ilerleme toplantısı yapılır.

3.3. Her 3 ayda bir stratejik değerlendirme toplantısı düzenlenir.

3.4. Taraflar, iş birliğine ilişkin tüm iletişimde iyi niyet ve şeffaflık ilkelerine uyar.`,
    },
    {
      baslik: "4. GELİR PAYLAŞIMI VE FİNANSAL ŞARTLAR",
      icerik: `4.1. Gelir paylaşım modeli, her bir iş birliği alanı için ayrı ayrı belirlenir ve Ek-1'de detaylandırılır.

4.2. Ortak projelerde maliyetler, tarafların mutabakatına göre eşit veya belirlenen oranlarda paylaşılır.

4.3. Faturalandırma, her bir tarafın kendi hizmet/ürün bedeli için ayrı ayrı yapılır.

4.4. Ödeme koşulları: Net 30 (otuz) gün.`,
    },
    {
      baslik: "5. FİKRİ MÜLKİYET HAKLARI",
      icerik: `5.1. Mevcut Fikri Mülkiyet: Sözleşme öncesinde taraflara ait olan fikri mülkiyet hakları ilgili tarafın mülkiyetinde kalır.

5.2. Ortak Geliştirilen Ürünler: Birlikte geliştirilen ürün/hizmetlerin fikri mülkiyeti taraflar arasında eşit (%50-%50) olarak paylaşılır.

5.3. Lisans: Taraflar, iş birliği kapsamında gerekli olan fikri mülkiyet haklarını birbirlerine sözleşme süresince ücretsiz lisanslar.

5.4. Marka Kullanımı: Taraflar, markalarını ortak tanıtım faaliyetlerinde kullanabilir ancak her kullanım önceden yazılı onaya tabidir.`,
    },
    {
      baslik: "6. GİZLİLİK VE VERİ KORUMA",
      icerik: `6.1. Taraflar, iş birliği kapsamında paylaşılan tüm ticari, teknik ve stratejik bilgileri gizli tutmakla yükümlüdür.

6.2. Gizlilik yükümlülüğü sözleşmenin feshinden sonra 5 (beş) yıl süreyle devam eder.

6.3. Kişisel veriler, 6698 sayılı KVKK ve ilgili mevzuata uygun şekilde işlenir.

6.4. Veri sızıntısı veya yetkisiz erişim durumunda taraf diğerini 24 saat içinde bilgilendirmekle yükümlüdür.`,
    },
    {
      baslik: "7. MVA, KPI VE SLA",
      icerik: `7.1. Minimum Performans Kriterleri (KPI):
- Aylık ortak üretilen lead sayısı: ___
- Ortak proje teslimat süresi: ___ gün
- Müşteri memnuniyet skoru: ___/10

7.2. SLA: Teknik sistemlerde %99,5 uptime, e-posta yanıtlama süresi maksimum 4 saat.

7.3. KPI'lar 3 ayda bir değerlendirilir ve hedefler tarafların mutabakatı ile güncellenir.`,
    },
    {
      baslik: "8. REKABET YASAĞI",
      icerik: "Sözleşme süresince taraflar, iş birliği konusu ile doğrudan rekabet eden üçüncü taraflarla benzer bir stratejik iş birliğine giremez. Rekabet yasağı kapsamı Ek-2'de belirlenir.",
    },
    {
      baslik: "9. SÖZLEŞME SÜRESİ VE FESİH",
      icerik: `9.1. Sözleşme, imza tarihinden itibaren 12 (on iki) ay süreyle yürürlüktedir.

9.2. Sözleşme bitiminden 60 (altmış) gün önce yazılı bildirim yapılmazsa sözleşme 12 ay daha uzar.

9.3. Haklı fesih halleri:
a) KPI hedeflerinin 3 ardışık dönemde karşılanamaması
b) Gizlilik ihlali
c) Rekabet yasağı ihlali
d) Taraflardan birinin ödeme aczine düşmesi
e) Mücbir sebebin 90 günü aşması`,
    },
    {
      baslik: "10. CEZAİ ŞARTLAR",
      icerik: `10.1. Rekabet yasağı ihlali: Son 12 aylık toplam gelir paylaşımı tutarının 3 katı

10.2. Gizlilik ihlali: İspatlanan zararın 5 katı

10.3. SLA ihlali: Her bir ihlal için ___ TL`,
    },
    {
      baslik: "11. MÜCBİR SEBEP",
      icerik: "Deprem, sel, yangın, savaş, terör, salgın hastalık, grev, tedarik zinciri kesintisi gibi tarafların kontrolü dışındaki olaylar mücbir sebep olarak kabul edilir. Mücbir sebep halinde yükümlülükler süresince askıya alınır.",
    },
    {
      baslik: "12. DENETİM VE RAPORLAMA",
      icerik: "Taraflar, karşılıklı denetim hakkına sahiptir. Denetim talebi yazılı olarak iletilir ve yılda en fazla 2 kez yapılır. Her bir taraf, diğer tarafa 3 aylık dönemsel faaliyet raporu sunar.",
    },
    {
      baslik: "13. DEVRİR",
      icerik: "Taraflar, bu sözleşmeden doğan hak ve borçlarını diğer tarafın yazılı onayı olmadan devredemez. Şirket birleşmesi veya devralma hallerinde devir hakkı saklıdır.",
    },
    {
      baslik: "14. UYUŞMAZLIKLARIN ÇÖZÜMÜ",
      icerik: `14.1. Uyuşmazlıklar öncelikle müzakere yoluyla çözülmeye çalışılır.

14.2. Müzakere sonuç vermezse İzmir Arabuluculuk Merkezi'nde arabuluculuk yoluna başvurulur.

14.3. Arabuluculuktan da sonuç alınamazsa İzmir Mahkemeleri ve İcra Daireleri yetkilidir.

14.4. Türkiye Cumhuriyeti hukuku uygulanır.`,
    },
    {
      baslik: "15. TEBLİĞLER",
      icerik: "Tüm bildirimler yazılı yapılır. Tarafların adres değişikliklerini birbirlerine bildirmemesi halinde eski adrese yapılan bildirimler geçerlidir.",
    },
    {
      baslik: "16. YÜRÜRLÜK",
      icerik: "İşbu Sözleşme 16 (on altı) ana madde ve eklerinden oluşmaktadır. Taraflarca onaylandığı tarihte yürürlüğe girer.",
    },
  ],
};

const bayiSozlesme = {
  baslik: "BAYİLİK (B2B) SÖZLEŞMESİ",
  taraflar: `İşbu Bayilik Sözleşmesi ("Sözleşme"), aşağıda bilgileri yer alan taraflar arasında akdedilmiştir.

BAYİ ("Alıcı")
Ad/Unvan: ________________________________
Adres: ________________________________
Vergi Dairesi/No: ________________________________
Yetkili: ________________________________
Telefon/E-posta: ________________________________

BAYİLİK VEREN ("ENAUNITY®")
Ad/Unvan: Candan Kaynar Ena Unity
Adres: Akdeniz Mahallesi, Şehit Fethi Bey Caddesi, Kızıl Kanat İşmerkezi Kat 8 No: 83, Konak/İzmir
Yetkili: Candan Kaynar
Telefon: 0541 188 14 35
E-posta: info@enaunity.com`,
  maddeler: [
    {
      baslik: "1. SÖZLEŞMENİN KONUSU",
      icerik: "İşbu Sözleşme'nin konusu, Bayi'nin Enaunity® ürünlerini toptan fiyatlarla satın alarak kendi kanallarında perakende olarak satmasına ilişkin esasların belirlenmesidir. Bayi, Enaunity® ürünlerini kendi markasıyla veya Enaunity® markasıyla satışa sunabilir.",
    },
    {
      baslik: "2. TANIMLAR",
      icerik: `2.1. Bayi Paneli: Bayi'ye özel oluşturulan web tabanlı yönetim paneli
2.2. Toptan Fiyat: Bayi'ye uygulanacak özel fiyat listesi
2.3. Tavsiye Edilen Perakende Satış Fiyatı (TPSF): Bayi'nin nihai tüketiciye önereceği satış fiyatı
2.4. Minimum Sipariş: Bir siparişte bulunması gereken asgari tutar
2.5. Kotalar: Belirli dönemlerde satın alınması taahhüt edilen ürün miktarı`,
    },
    {
      baslik: "3. BAYİ HAK VE YÜKÜMLÜLÜKLERİ",
      icerik: `3.1. Bayi:
a) Ürünleri kendi işyerinde, web sitesinde veya pazar yerlerinde satabilir
b) TPSF'ye uymakla yükümlüdür, yetkisiz indirim yapamaz
c) Enaunity® markasını ve logolarını sözleşme amaçlarıyla sınırlı olarak kullanabilir
d) Aylık satış raporunu bayi paneli üzerinden düzenli olarak girmelidir
e) Müşteri memnuniyeti ve garanti süreçlerinde Enaunity® ile iş birliği yapmalıdır
f) Rekabet eden markaların ürünlerini aynı kanalda öne çıkaramaz`,
    },
    {
      baslik: "4. FİYATLANDIRMA VE ÖDEME KOŞULLARI",
      icerik: `4.1. Bayi'ye uygulanacak toptan fiyat listesi, cari yıl için Ek-1'de belirtilmiştir.

4.2. Fiyatlar KDV hariç olup, her takvim yılı başında güncellenir.

4.3. Aşamalı iskonto sistemi:
- 2.000 - 10.000 TL: Liste fiyatından %25 indirim
- 10.001 - 50.000 TL: Liste fiyatından %35 indirim
- 50.001 TL ve üzeri: Liste fiyatından %45 indirim

4.4. Ödeme vadesi 45 (kırk beş) gündür. Vade aşımında aylık %5 gecikme faizi uygulanır.

4.5. Bayi panelinde bakiye ve cari hesap takibi yapılabilir.`,
    },
    {
      baslik: "5. MVA (MİNİMUM ALIM TAAHHÜDÜ)",
      icerik: `5.1. Bayi, sözleşme süresince 3 aylık dönemler halinde minimum ___ TL (________ Türk Lirası) alım taahhüdü verir.

5.2. Karta ayı (ilk 3 ay) MVA uygulanmaz.

5.3. MVA'nın 2 (iki) ardışık dönemde karşılanamaması halinde Enaunity® sözleşmeyi feshetme hakkına sahiptir.`,
    },
    {
      baslik: "6. BAYİ PANELİ VE DİJİTAL ALTYAPI",
      icerik: `6.1. Bayi'ye özel kullanıcı adı ve şifre ile erişilebilen bir bayi paneli sağlanır.

6.2. Panel üzerinden:
a) Ürün kataloğu ve anlık stok durumu
b) Toptan fiyat listesi
c) Sipariş oluşturma ve takip
d) Sipariş geçmişi ve fatura görüntüleme
e) Bakiye ve cari hesap durumu
f) Satış ve performans raporları
g) Destek talebi oluşturma

6.3. Panel anahtar teslimi hazır olup, Bayi'ye özel markalama yapılabilir.`,
    },
    {
      baslik: "7. TESLİMAT VE STOK",
      icerik: `7.1. Siparişler, onayı takiben 3-5 iş günü içinde kargoya teslim edilir.

7.2. 10.000 TL ve üzeri siparişlerde kargo ücretsizdir.

7.3. Acil siparişlerde 24 saat içinde sevkiyat yapılabilir (ek ücret talep edilebilir).

7.4. Bayi, özel stok havuzundan faydalanabilir; belirli ürünlerde stok ayrımı yapılabilir.`,
    },
    {
      baslik: "8. İADE VE GARANTİ",
      icerik: `8.1. Ayıplı/hasarlı ürünler teslimattan itibaren 7 gün içinde bildirilmelidir.

8.2. Stok fazlası ürünlerde iade, fatura tarihinden itibaren 30 güne kadar kabul edilir. İade edilen ürünlerin %10 restorasyon bedeli düşülür.

8.3. Garanti kapsamındaki ürünlerde bayi, müşteri ile Enaunity® arasında köprü görevi görür.`,
    },
    {
      baslik: "9. GİZLİLİK VE VERİ KORUMA",
      icerik: `9.1. Taraflar, işbu sözleşme kapsamında edindikleri ticari bilgileri 6698 sayılı KVKK kapsamında korur.

9.2. Bayi, Enaunity® müşteri verilerini yalnızca sözleşme amaçları için kullanabilir.

9.3. Gizlilik yükümlülüğü sözleşmenin feshinden sonra 5 (beş) yıl süreyle devam eder.`,
    },
    {
      baslik: "10. REKABET YASAĞI",
      icerik: "Bayi, sözleşme süresince ve fesihten sonra 1 (bir) yıl boyunca Enaunity® ile doğrudan rekabet eden ürünleri aynı ticari kanalda satamaz. Rekabet yasağı ihlali halinde son 12 aylık toplam alım tutarının %20'si cezai şart olarak ödenir.",
    },
    {
      baslik: "11. BÖLGESEL HAKLAR",
      icerik: "Bayi'ye tanınan bölgesel satış hakkı Ek-2'de belirtilmiştir. Bayi, belirlenen bölge dışında fiziksel mağaza açamaz ancak e-ticaret kanallarında Türkiye geneline satış yapabilir.",
    },
    {
      baslik: "12. DENETİM HAKKI",
      icerik: "Enaunity®, bayi mağazalarını ve satış süreçlerini yılda en fazla 2 (iki) kez denetleme hakkına sahiptir. Denetim, önceden haber verilmek suretiyle yapılır.",
    },
    {
      baslik: "13. SÖZLEŞME SÜRESİ VE FESİH",
      icerik: `13.1. Sözleşme 12 (on iki) ay süreyle yürürlüktedir. 30 gün önceden bildirim yapılmazsa 12 ay daha uzar.

13.2. Haklı fesih halleri:
a) MVA'nın 2 ardışık dönem karşılanamaması
b) TPSF'ye uyulmaması
c) Rekabet yasağı ihlali
d) Ödeme vadesinin 90 gün aşılması
e) Bayi panelinin yetkisiz kullanımı
f) Marka itibarını zedeleyici davranışlar`,
    },
    {
      baslik: "14. CEZAİ ŞARTLAR",
      icerik: `14.1. Rekabet yasağı ihlali: Son 12 aylık toplam alım tutarının %20'si
14.2. TPSF ihlali: Her bir ihlal için 1.000 TL
14.3. Gizlilik ihlali: İspatlanan zararın 3 katı
14.4. Vade aşımı: Aylık %5 gecikme faizi`,
    },
    {
      baslik: "15. BAĞIMSIZLIK",
      icerik: "Bayi bağımsız bir ticari işletmedir. Taraflar arasında işçi-işveren, ortaklık veya acentelik ilişkisi yoktur. Bayi kendi vergisel yükümlülüklerinden sorumludur.",
    },
    {
      baslik: "16. MÜCBİR SEBEP",
      icerik: "Mücbir sebepler halinde tarafların yükümlülükleri süresince askıya alınır. Mücbir sebebin 60 günü aşması halinde taraflar sözleşmeyi feshedebilir.",
    },
    {
      baslik: "17. UYUŞMAZLIKLARIN ÇÖZÜMÜ",
      icerik: "İzmir Mahkemeleri ve İcra Daireleri yetkilidir. Türkiye Cumhuriyeti hukuku uygulanır. Uyuşmazlıklarda öncelikle arabuluculuk yoluna başvurulur.",
    },
    {
      baslik: "18. YÜRÜRLÜK",
      icerik: "İşbu Sözleşme 18 (on sekiz) ana madde ve eklerinden oluşmaktadır. Taraflarca onaylandığı tarihte yürürlüğe girer.",
    },
  ],
};

function ContractModal({ contract, onClose }: { contract: typeof tedarikciSozlesme; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-10 pb-20">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-4xl mx-4"
      >
        <div className="rounded-xl border border-ena-border bg-ena-dark p-6 md:p-10 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <FileText size={24} className="text-ena-primary" />
              <h3 className="text-lg font-bold text-ena-text">{contract.baslik}</h3>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-ena-light hover:text-ena-text hover:bg-ena-card/50 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-8 text-sm leading-relaxed text-ena-light">
            <div className="whitespace-pre-line text-ena-text font-medium">
              {contract.taraflar}
            </div>

            {contract.maddeler.map((madde, i) => (
              <div key={i}>
                <h4 className="font-bold text-ena-text mb-2">{madde.baslik}</h4>
                <div className="whitespace-pre-line text-ena-light/90">{madde.icerik}</div>
              </div>
            ))}

            <div className="pt-6 border-t border-ena-border text-center text-ena-light/60 text-xs">
              İşbu sözleşme taraflar arasında elektronik ortamda onaylanmak suretiyle yürürlüğe girmiştir.
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ModelCard({ model, index }: { model: typeof models[0]; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);

  let contractData: typeof tedarikciSozlesme;
  if (model.id === "tedarikci") contractData = tedarikciSozlesme;
  else if (model.id === "satis") contractData = satisSozlesme;
  else if (model.id === "stratejik") contractData = stratejikSozlesme;
  else contractData = bayiSozlesme;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.12, duration: 0.5 }}
        className="rounded-xl border border-ena-border bg-ena-card/30 overflow-hidden"
      >
        <div className="p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-ena-primary/10 p-3 shrink-0">
              <model.icon size={28} className="text-ena-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-ena-text">{model.title}</h3>
              <p className="mt-2 text-sm text-ena-light leading-relaxed">{model.shortDesc}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-6">
            {model.stats.map((s, i) => (
              <div key={i} className="text-center p-3 rounded-lg bg-ena-card/50 border border-ena-border/50">
                <p className="text-base font-bold text-ena-primary">{s.value}</p>
                <p className="text-[11px] text-ena-light/70 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <Button onClick={() => setContractOpen(true)} variant="outline" size="sm" className="gap-2 text-xs">
              <FileText size={14} />
              Sözleşmeyi İncele
            </Button>
            <Button onClick={() => setExpanded(!expanded)} variant="ghost" size="sm" className="gap-2 text-xs text-ena-light">
              Detaylar <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
            </Button>
          </div>

          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-6 pt-6 border-t border-ena-border space-y-6"
            >
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-ena-primary mb-4">Avantajlar</h4>
                <div className="grid sm:grid-cols-2 gap-2">
                  {model.benefits.map((b, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-ena-light">
                      <CheckCircle size={14} className="text-ena-primary shrink-0 mt-0.5" />
                      {b}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-ena-primary mb-4">Başvuru Süreci</h4>
                <div className="space-y-0">
                  {model.process.map((p, i) => (
                    <div key={i} className="flex gap-4 pb-6 last:pb-0 relative">
                      <div className="absolute left-[15px] top-8 bottom-0 w-px bg-ena-border last:hidden" />
                      <span className="shrink-0 w-8 h-8 rounded-full border border-ena-border bg-ena-card flex items-center justify-center text-xs font-bold text-ena-primary">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="pt-0.5">
                        <h5 className="text-sm font-semibold text-ena-text">{p.step}</h5>
                        <p className="text-xs text-ena-light/70 mt-0.5">{p.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {contractOpen && <ContractModal contract={contractData} onClose={() => setContractOpen(false)} />}
    </>
  );
}

export default function IsOrtakligiPage() {
  const [formData, setFormData] = useState({
    partnerType: "tedarikci",
    name: "",
    title: "",
    email: "",
    phone: "",
    company: "",
    website: "",
    location: "",
    companySize: "",
    markets: "",
    portfolio: "",
    techLevel: "",
    motivation: "",
    kvkk: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState<Record<string, { name: string; url: string } | null>>({
    vergiLevhas: null,
    imzaSirkuler: null,
    ticaretSicil: null,
    iletisimYetki: null,
    kapasiteRapor: null,
    kaliteSertifika: null,
    referansMektup: null,
  });
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);

  const documentLabels: Record<string, string> = {
    vergiLevhas: "Vergi Levhası",
    imzaSirkuler: "İmza Sirküleri",
    ticaretSicil: "Ticaret Sicil Gazetesi",
    iletisimYetki: "İletişim Yetki Belgesi",
    kapasiteRapor: "Kapasite Raporu",
    kaliteSertifika: "Kalite Sertifikaları",
    referansMektup: "Referans Mektupları",
  };

  const modelFields: Record<string, { questions: { label: string; placeholder: string; field: string; required?: boolean }[]; documents: { key: string; required?: boolean }[] }> = {
    tedarikci: {
      questions: [
        { label: "Ürün Kategorileriniz *", placeholder: "Hangi ürün gruplarında üretim/tedarik yapıyorsunuz?", field: "markets", required: true },
        { label: "Üretim & Kapasite *", placeholder: "Aylık üretim kapasiteniz, tesis bilgileriniz ve varsa yurt dışı üretim ağınız", field: "portfolio", required: true },
        { label: "Kalite Belgeleri", placeholder: "ISO, CE, KK diğer kalite belgeleriniz", field: "motivation", required: false },
        { label: "Mevcut Müşteri Portföyü", placeholder: "Hali hazırda çalıştığınız önemli müşteriler ve sektörler", field: "techLevel" },
      ],
      documents: [
        { key: "vergiLevhas", required: true },
        { key: "imzaSirkuler", required: true },
        { key: "kapasiteRapor", required: false },
        { key: "kaliteSertifika", required: false },
      ],
    },
    satis: {
      questions: [
        { label: "Satış Kanallarınız *", placeholder: "Hangi kanallarda satış yapıyorsunuz? (E-ticaret, perakende, pazar yerleri, vs.)", field: "markets", required: true },
        { label: "Mevcut Trafik & Performans", placeholder: "Aylık ortalama trafiğiniz, sipariş adediniz veya dönüşüm oranlarınız", field: "portfolio", required: false },
        { label: "Pazarlama Yöntemleriniz", placeholder: "Sosyal medya, e-posta, reklam, influencer vb. hangi kanalları kullanıyorsunuz?", field: "motivation", required: false },
        { label: "Ortaklık Beklentiniz", placeholder: "En çok hangi ürün gruplarında ve ne tür bir iş birliği hedefliyorsunuz?", field: "techLevel" },
      ],
      documents: [
        { key: "vergiLevhas", required: true },
        { key: "imzaSirkuler", required: true },
      ],
    },
    stratejik: {
      questions: [
        { label: "Şirket Vizyonu & Stratejik Hedefler *", placeholder: "Şirketinizin uzun vadeli vizyonu ve bu ortaklıktan beklediğiniz stratejik katkı", field: "markets", required: true },
        { label: "Potansiyel İş Birliği Alanları *", placeholder: "Hangi spesifik alanlarda iş birliği yapmak istiyorsunuz? (Ar-Ge, pazarlama, dağıtım, teknoloji)", field: "motivation", required: true },
        { label: "Referans Projeler & Deneyim", placeholder: "Daha önce gerçekleştirdiğiniz stratejik ortaklıklar veya referans projeleriniz", field: "portfolio", required: false },
        { label: "Pazar & Sektör Analizi", placeholder: "Faaliyet gösterdiğiniz sektördeki pazar büyüklüğü ve rekabet avantajınız", field: "techLevel" },
      ],
      documents: [
        { key: "vergiLevhas", required: true },
        { key: "imzaSirkuler", required: false },
        { key: "referansMektup", required: false },
      ],
    },
    bayi: {
      questions: [
        { label: "Hedef Satış Bölgeniz *", placeholder: "Hangi şehir/bölgede satış yapacaksınız? Fiziksel mağazanız var mı?", field: "markets", required: true },
        { label: "Hedef Müşteri Kitleniz", placeholder: "Perakende müşteri mi, kurumsal müşteri mi? Hangi segment?", field: "portfolio", required: false },
        { label: "Mağaza / Şube Bilgileri", placeholder: "Varsa mağaza sayınız, lokasyonlarınız ve toplam satış alanınız", field: "techLevel", required: false },
        { label: "Neden Enaunity® Bayisi olmak istiyorsunuz? *", placeholder: "Bayilik beklentiniz, hedef sipariş hacminiz ve büyüme planlarınız", field: "motivation", required: true },
      ],
      documents: [
        { key: "vergiLevhas", required: true },
        { key: "imzaSirkuler", required: true },
        { key: "ticaretSicil", required: true },
        { key: "iletisimYetki", required: true },
      ],
    },
  };

  const handleFileUpload = async (docKey: string, file: File) => {
    setUploadingFile(docKey);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/partnership/upload", { method: "POST", body: form });
      const data = await res.json();
      if (data.success) {
        setFiles((prev) => ({ ...prev, [docKey]: { name: file.name, url: data.url } }));
        toast.success(`${documentLabels[docKey]} yüklendi`);
      } else {
        toast.error(data.error || "Yükleme hatası");
      }
    } catch {
      toast.error("Dosya yüklenemedi");
    } finally {
      setUploadingFile(null);
    }
  };

  const handleRemoveFile = (docKey: string) => {
    setFiles((prev) => ({ ...prev, [docKey]: null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeDocs = modelFields[formData.partnerType].documents.map((d) => d.key);
    const uploadedFiles = Object.entries(files)
      .filter(([key, v]) => v !== null && activeDocs.includes(key))
      .map(([key, v]) => ({ type: documentLabels[key], name: v!.name, url: v!.url }));
    setSubmitting(true);
    try {
      const res = await fetch("/api/partnership/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, files: uploadedFiles }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Başvurunuz alındı! En kısa sürede size dönüş yapacağız.");
        setSubmitted(true);
      } else {
        toast.error(data.error || "Bir hata oluştu");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  };

  const update = (field: string, value: string | boolean) => setFormData((prev) => ({ ...prev, [field]: value }));

  if (submitted) {
    return (
      <div className="bg-ena-dark min-h-screen">
        <div className="mx-auto max-w-2xl px-4 py-32 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="mx-auto w-20 h-20 rounded-full bg-ena-primary/10 flex items-center justify-center mb-6">
              <CheckCircle size={48} className="text-ena-primary" />
            </div>
            <h1 className="text-3xl font-black text-ena-text">Başvurunuz Alındı</h1>
            <p className="mt-3 text-ena-light max-w-md mx-auto">
              İş ortaklığı başvurunuz başarıyla iletilmiştir. Ekibimiz en geç 2 iş günü içinde sizinle iletişime geçecektir.
            </p>
            <div className="mt-8 space-y-2 text-sm text-ena-light/70">
              <p className="flex items-center justify-center gap-2"><Mail size={14} /> info@enaunity.com</p>
              <p className="flex items-center justify-center gap-2"><Phone size={14} /> 0541 188 14 35</p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ena-dark min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden pt-16 pb-12 md:pt-24 md:pb-16">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="https://images.unsplash.com/photo-1557083394-61c1e1b4c0f8?w=1600&q=85"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        >
          <source src="/social-hero.webm" type="video/webm" />
          <source src="/social-hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-ena-red/10 via-ena-dark/60 to-ena-dark" />
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs uppercase tracking-[0.2em] text-ena-primary mb-4 font-semibold"
          >
            İş Ortaklığı
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-black text-ena-text leading-tight"
          >
            Birlikte büyüyen{" "}
            <span className="text-ena-primary">ekosistem</span>
            <br />kuruyoruz.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-sm md:text-base text-ena-light max-w-2xl mx-auto leading-relaxed"
          >
            Enaunity® iş ortaklığı programı; tedarikçi, satış ortaklığı, bayi ve stratejik iş birlikleriyle
            B4B ekosistemimizi daha fazla işletmeye ulaştırmayı hedefler.
          </motion.p>
        </div>
      </section>

      {/* Stats */}
      <section className="pb-12">
        <div className="mx-auto max-w-3xl px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { value: "4", label: "Ortaklık Modeli" },
              { value: "48s", label: "İlk Dönüş Hedefi" },
              { value: "%100", label: "Özel Onboarding" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="rounded-xl border border-ena-border bg-ena-card/30 p-4 md:p-6 text-center"
              >
                <p className="text-2xl md:text-3xl font-bold text-ena-primary">{s.value}</p>
                <p className="text-xs text-ena-light/70 mt-1 uppercase tracking-wider">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Models */}
      <section className="pb-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-bold text-ena-text">Ortaklık Modelleri</h2>
            <p className="mt-2 text-sm text-ena-light">İş modelinize en uygun programı seçin.</p>
          </div>
          <div className="space-y-4">
            {models.map((model, i) => (
              <ModelCard key={model.id} model={model} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Why Enaunity® */}
      <section className="border-t border-ena-border py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-ena-primary font-semibold mb-3">Avantajlar</p>
              <h2 className="text-xl md:text-2xl font-bold text-ena-text mb-6">Neden Enaunity® ortağı olmalısınız?</h2>
              <div className="space-y-3">
                {[
                  { icon: Users, title: "Geniş Müşteri Ağı", desc: "Türkiye'nin dört bir yanındaki kurumsal müşterilere tek platformdan ulaşın." },
                  { icon: TrendingUp, title: "Büyüyen Pazar", desc: "B4B sektörü her yıl %35 büyüyor. Bu pastadan pay alın." },
                  { icon: Shield, title: "Güvenilir Altyapı", desc: "SSL sertifikalı, 7/24 çalışan, kesintisiz e-ticaret altyapısı." },
                  { icon: Building2, title: "Operasyonel Destek", desc: "Sipariş yönetimi, kargo, müşteri hizmetleri ve iade süreçlerinde tam destek." },
                ].map((f, i) => (
                  <div key={i} className="flex gap-3 p-4 rounded-lg border border-ena-border bg-ena-card/20">
                    <f.icon size={20} className="text-ena-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-ena-text">{f.title}</h4>
                      <p className="text-xs text-ena-light/70 mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-ena-primary font-semibold mb-3">Süreç</p>
              <h2 className="text-xl md:text-2xl font-bold text-ena-text mb-6">Başvurudan lansmana</h2>
              <div className="space-y-0">
                {[
                  { step: "Başvuru", desc: "Formu doldurun; ekibimiz 2 iş günü içinde ön değerlendirme yapar." },
                  { step: "Keşif Görüşmesi", desc: "Hedeflerinizi, iş modelinizi ve beklentilerinizi birlikte netleştiririz." },
                  { step: "Sözleşme & Onboarding", desc: "Seçilen modele göre sözleşme hazırlanır ve onboarding süreci başlatılır." },
                  { step: "Aktivasyon & Lansman", desc: "Sistem entegrasyonu, eğitim ve go-to-market ile canlıya geçilir." },
                ].map((p, i) => (
                  <div key={i} className="flex gap-4 pb-8 last:pb-0 relative">
                    <div className="absolute left-[17px] top-10 bottom-0 w-px bg-gradient-to-b from-ena-red/30 to-transparent" />
                    <span className="shrink-0 w-9 h-9 rounded-full border border-ena-border bg-ena-card flex items-center justify-center text-xs font-bold text-ena-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="pt-1">
                      <h4 className="text-sm font-semibold text-ena-text">{p.step}</h4>
                      <p className="text-xs text-ena-light/70 mt-0.5">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="basvuru" className="pb-24 scroll-mt-24">
        <div className="mx-auto max-w-3xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-ena-primary font-semibold mb-2">Başvuru</p>
            <h2 className="text-xl md:text-2xl font-bold text-ena-text">İş Ortaklığı Başvuru Formu</h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border border-ena-border bg-ena-card/30 p-6 md:p-10"
          >
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <h3 className="text-xs uppercase tracking-[0.15em] text-ena-primary/70 mb-4 pb-3 border-b border-ena-border font-semibold">Ortaklık Türü</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: "tedarikci", label: "Tedarikçi", icon: Truck },
                    { id: "satis", label: "Satış Ortağı (Affiliate)", icon: TrendingUp },
                    { id: "stratejik", label: "Stratejik", icon: Handshake },
                    { id: "bayi", label: "Bayi (B2B)", icon: Store },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => update("partnerType", t.id)}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-all ${
                        formData.partnerType === t.id
                          ? "border-ena-primary bg-ena-primary/10 text-ena-text font-semibold"
                          : "border-ena-border bg-ena-card/50 text-ena-light hover:border-ena-border/40"
                      }`}
                    >
                      <t.icon size={16} className={formData.partnerType === t.id ? "text-ena-primary" : "text-ena-light/50"} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-[0.15em] text-ena-primary/70 mb-4 pb-3 border-b border-ena-border font-semibold">İletişim Bilgileri</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-ena-light block mb-1.5">Ad Soyad *</label>
                    <input type="text" required value={formData.name} onChange={(e) => update("name", e.target.value)} placeholder="Adınız Soyadınız" className="w-full rounded-lg border border-ena-border bg-ena-card/50 px-4 py-2.5 text-sm text-ena-text placeholder:text-ena-text-muted/50 focus:outline-none focus:border-ena-primary/50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-ena-light block mb-1.5">Unvan</label>
                    <input type="text" value={formData.title} onChange={(e) => update("title", e.target.value)} placeholder="Kurucu, Satış Müdürü, vs." className="w-full rounded-lg border border-ena-border bg-ena-card/50 px-4 py-2.5 text-sm text-ena-text placeholder:text-ena-text-muted/50 focus:outline-none focus:border-ena-primary/50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-ena-light block mb-1.5">E-posta *</label>
                    <input type="email" required value={formData.email} onChange={(e) => update("email", e.target.value)} placeholder="ornek@sirketiniz.com" className="w-full rounded-lg border border-ena-border bg-ena-card/50 px-4 py-2.5 text-sm text-ena-text placeholder:text-ena-text-muted/50 focus:outline-none focus:border-ena-primary/50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-ena-light block mb-1.5">Telefon</label>
                    <input type="tel" value={formData.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+90 5XX XXX XX XX" className="w-full rounded-lg border border-ena-border bg-ena-card/50 px-4 py-2.5 text-sm text-ena-text placeholder:text-ena-text-muted/50 focus:outline-none focus:border-ena-primary/50 transition-colors" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-[0.15em] text-ena-primary/70 mb-4 pb-3 border-b border-ena-border font-semibold">Şirket Bilgileri</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-ena-light block mb-1.5">Şirket Adı *</label>
                    <input type="text" required value={formData.company} onChange={(e) => update("company", e.target.value)} placeholder="Şirketinizin tam adı" className="w-full rounded-lg border border-ena-border bg-ena-card/50 px-4 py-2.5 text-sm text-ena-text placeholder:text-ena-text-muted/50 focus:outline-none focus:border-ena-primary/50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-ena-light block mb-1.5">Web Sitesi</label>
                    <input type="url" value={formData.website} onChange={(e) => update("website", e.target.value)} placeholder="https://sirketiniz.com" className="w-full rounded-lg border border-ena-border bg-ena-card/50 px-4 py-2.5 text-sm text-ena-text placeholder:text-ena-text-muted/50 focus:outline-none focus:border-ena-primary/50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-ena-light block mb-1.5">Şehir / Ülke *</label>
                    <input type="text" required value={formData.location} onChange={(e) => update("location", e.target.value)} placeholder="İstanbul, Türkiye" className="w-full rounded-lg border border-ena-border bg-ena-card/50 px-4 py-2.5 text-sm text-ena-text placeholder:text-ena-text-muted/50 focus:outline-none focus:border-ena-primary/50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-ena-light block mb-1.5">Çalışan Sayısı *</label>
                    <select required value={formData.companySize} onChange={(e) => update("companySize", e.target.value)} className="w-full rounded-lg border border-ena-border bg-ena-card/50 px-4 py-2.5 text-sm text-ena-text focus:outline-none focus:border-ena-primary/50 transition-colors">
                      <option value="">Seçiniz</option>
                      {["1-10", "11-50", "51-200", "201-500", "500+"].map((s) => (
                        <option key={s} value={s} className="bg-ena-dark">{s} çalışan</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-[0.15em] text-ena-primary/70 mb-4 pb-3 border-b border-ena-border font-semibold">
                  {formData.partnerType === "tedarikci" ? "Tedarikçi Detayları"
                    : formData.partnerType === "satis" ? "Satış Ortaklığı Detayları"
                    : formData.partnerType === "stratejik" ? "Stratejik Ortaklık Detayları"
                    : "Bayi Başvuru Detayları"}
                </h3>
                <div className="space-y-4">
                  {modelFields[formData.partnerType].questions.map((q) => (
                    <div key={q.field}>
                      <label className="text-xs text-ena-light block mb-1.5">{q.label}</label>
                      <textarea
                        required={q.required}
                        value={(formData as any)[q.field] || ""}
                        onChange={(e) => update(q.field, e.target.value)}
                        rows={3}
                        placeholder={q.placeholder}
                        className="w-full rounded-lg border border-ena-border bg-ena-card/50 px-4 py-3 text-sm text-ena-text placeholder:text-ena-text-muted/50 focus:outline-none focus:border-ena-primary/50 transition-colors resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Evrak Yükleme */}
              <div>
                <h3 className="text-xs uppercase tracking-[0.15em] text-ena-primary/70 mb-4 pb-3 border-b border-ena-border font-semibold">Evrak Yükleme</h3>
                <p className="text-xs text-ena-light/60 mb-4">
                  {formData.partnerType === "tedarikci" ? "Tedarikçi başvuruları için gerekli evrakları yükleyiniz."
                    : formData.partnerType === "satis" ? "Satış ortaklığı başvuruları için gerekli evrakları yükleyiniz."
                    : formData.partnerType === "stratejik" ? "Varsa stratejik ortaklık başvurunuzu destekleyen evrakları yükleyiniz."
                    : "Bayi başvuruları için gerekli evrakları yükleyiniz."} PDF, JPG veya PNG formatında yükleyiniz.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {modelFields[formData.partnerType].documents.map((doc) => {
                    const key = doc.key;
                    const label = documentLabels[key];
                    return (
                      <div key={key} className="rounded-lg border border-ena-border bg-ena-card/50 p-4">
                        <p className="text-xs font-medium text-ena-text mb-2">
                          {label}
                          {doc.required && <span className="text-ena-primary ml-1">*</span>}
                        </p>
                        {files[key] ? (
                          <div className="flex items-center justify-between gap-2 text-xs text-ena-light">
                            <span className="truncate">{files[key]!.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(key)}
                              className="shrink-0 text-ena-primary/70 hover:text-ena-primary transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-ena-border/50 text-ena-light/50 hover:text-ena-primary/70 hover:border-ena-primary/30 cursor-pointer transition-all text-xs">
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              disabled={uploadingFile === key}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(key, file);
                              }}
                            />
                            {uploadingFile === key ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Upload size={14} />
                            )}
                            {uploadingFile === key ? "Yükleniyor..." : "Dosya Seç"}
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" required checked={formData.kvkk} onChange={(e) => update("kvkk", e.target.checked)} className="mt-1 w-4 h-4 rounded border-ena-border bg-ena-card/50 accent-ena-red" />
                <span className="text-xs text-ena-light/70 leading-relaxed group-hover:text-ena-light transition-colors">
                  KVKK Aydınlatma Metni ve Gizlilik Politikası'nı okudum; başvuru kapsamında kişisel verilerimin işlenmesini kabul ediyorum.
                </span>
              </label>

              <Button type="submit" disabled={submitting} className="w-full py-3.5 gap-2 font-semibold">
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                {submitting ? "Gönderiliyor..." : "İş Ortaklığı Başvurusu Gönder"}
              </Button>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-ena-light/50">
                <span>veya doğrudan iletişime geçin:</span>
                <a href="mailto:info@enaunity.com" className="text-ena-primary/70 hover:text-ena-primary transition-colors flex items-center gap-1">
                  <Mail size={12} /> info@enaunity.com
                </a>
                <span className="hidden sm:inline">|</span>
                <a href="tel:+905411881435" className="text-ena-primary/70 hover:text-ena-primary transition-colors flex items-center gap-1">
                  <Phone size={12} /> 0541 188 14 35
                </a>
              </div>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
