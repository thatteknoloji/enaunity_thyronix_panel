"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Link2, Package, GitBranch, Radio, Brain, Copy,
  CheckCircle2, ArrowRight, Rocket, Play, Clock, Zap
} from "lucide-react";

export default function DemoScriptPage() {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      id: 1,
      title: "Kaynak Eklenir",
      description: "Müşteri XML, Excel veya CSV kaynağını ekler. Alan eşleştirmesi yapılır.",
      icon: Link2,
      color: "text-nexa-primary",
      bg: "bg-nexa-primary/10",
      border: "border-nexa-primary/30",
      href: "/thyronix/sources",
      script: `1. Kaynaklar sayfasına gidin
2. "Yeni Kaynak" butonuna tıklayın
3. Kaynak türünü seçin (XML/Excel/CSV)
4. URL veya dosya yükleyin
5. Alan eşleştirmesini yapın
6. "Kaydet" butonuna tıklayın`,
    },
    {
      id: 2,
      title: "Ürünler Gelir",
      description: "THYRONIX otomatik olarak ürünleri çeker ve havuza ekler.",
      icon: Package,
      color: "text-nexa-success",
      bg: "bg-nexa-success/10",
      border: "border-nexa-success/30",
      href: "/thyronix/products",
      script: `1. Ürünler sayfasına gidin
2. Tüm ürünleri görün
3. Kaynak bazında filtreleyin
4. Ürün detaylarını inceleyin
5. Sorunlu ürünleri tespit edin`,
    },
    {
      id: 3,
      title: "Kurallar Uygulanır",
      description: "Fiyat, stok, kategori ve marka kuralları otomatik uygulanır.",
      icon: GitBranch,
      color: "text-nexa-secondary",
      bg: "bg-nexa-secondary/10",
      border: "border-nexa-secondary/30",
      href: "/thyronix/processing",
      script: `1. İşleme Merkezi'ne gidin
2. "Kurallar" sekmesine tıklayın
3. Yeni kural oluşturun
4. Koşul ve aksiyonu tanımlayın
5. Kuralı kaydedin
6. Kuralların uygulandığını görün`,
    },
    {
      id: 4,
      title: "AI Optimize Eder",
      description: "AI başlık, açıklama ve kategori optimizasyonu yapar.",
      icon: Brain,
      color: "text-nexa-warning",
      bg: "bg-nexa-warning/10",
      border: "border-nexa-warning/30",
      href: "/thyronix/ai",
      script: `1. THYRONIX AI sayfasına gidin
2. "Araçlar" sekmesine tıklayın
3. Ürün seçin
4. AI optimizasyonunu çalıştırın
5. Önerileri inceleyin
6. Kabul veya reddedin`,
    },
    {
      id: 5,
      title: "Feed Oluşturulur",
      description: "XML, CSV veya Excel formatında canlı feed oluşturulur.",
      icon: Radio,
      color: "text-nexa-info",
      bg: "bg-nexa-info/10",
      border: "border-nexa-info/30",
      href: "/thyronix/feeds",
      script: `1. Feed Merkezi'ne gidin
2. "Yeni Feed" butonuna tıklayın
3. Feed adını ve formatını seçin
4. Ürünleri seçin
5. Feed'i oluşturun
6. Feed URL'sini kopyalayın`,
    },
    {
      id: 6,
      title: "Link Kopyalanır",
      description: "Canlı feed URL'si kopyalanır ve entegrasyon sistemine eklenir.",
      icon: Copy,
      color: "text-nexa-accent",
      bg: "bg-nexa-accent/10",
      border: "border-nexa-accent/30",
      href: "/thyronix/feeds",
      script: `1. Feed detay sayfasına gidin
2. Feed URL'sini kopyalayın
3. Entegrasyon sistemine yapıştırın
4. Test edin
5. THYRONIX otomatik güncel tutar`,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-nexa-primary/10">
              <Rocket size={24} className="text-nexa-primary" />
            </div>
            <h1 className="text-3xl font-bold text-nexa-text">Demo Senaryosu</h1>
          </div>
          <p className="text-sm text-nexa-text-secondary">
            THYRONIX'yı müşteriye göstermek için adım adım demo akışı
          </p>
        </div>
        <Link
          href="/thyronix"
          className="px-4 py-2 rounded-lg bg-nexa-card border border-nexa-border hover:border-nexa-primary/30 text-sm text-nexa-text transition-colors"
        >
          Dashboard'a Dön
        </Link>
      </div>

      {/* Sales Story */}
      <div className="rounded-xl border border-nexa-primary/30 bg-gradient-to-br from-nexa-primary/5 to-nexa-card p-6">
        <h2 className="text-lg font-bold text-nexa-text mb-2">Satış Hikayesi</h2>
        <p className="text-base text-nexa-text leading-relaxed">
          "Bir kere kurallarını tanımla. THYRONIX tüm ürün kaynaklarını senin yerine sürekli işler, dönüştürür ve canlı feed olarak güncel tutar."
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-nexa-card border border-nexa-border">
            <p className="text-xs font-semibold text-nexa-primary mb-1">1. KAYNAK EKLE</p>
            <p className="text-xs text-nexa-text-secondary">XML, Excel, CSV</p>
          </div>
          <div className="p-3 rounded-lg bg-nexa-card border border-nexa-border">
            <p className="text-xs font-semibold text-nexa-primary mb-1">2. KURAL TANIMLA</p>
            <p className="text-xs text-nexa-text-secondary">Fiyat, stok, kategori</p>
          </div>
          <div className="p-3 rounded-lg bg-nexa-card border border-nexa-border">
            <p className="text-xs font-semibold text-nexa-primary mb-1">3. FEED AL</p>
            <p className="text-xs text-nexa-text-secondary">Canlı URL, otomatik güncelleme</p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`rounded-xl border ${step.border} bg-nexa-card p-6 transition-all ${
              currentStep === index ? "ring-2 ring-nexa-primary/50" : ""
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`shrink-0 p-3 rounded-lg ${step.bg}`}>
                <step.icon size={24} className={step.color} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-nexa-text-secondary">ADIM {step.id}</span>
                  {currentStep === index && (
                    <span className="px-2 py-0.5 rounded-full bg-nexa-primary/10 text-nexa-primary text-xs font-medium">
                      Şu an
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-nexa-text mb-1">{step.title}</h3>
                <p className="text-sm text-nexa-text-secondary mb-4">{step.description}</p>

                <div className="rounded-lg bg-nexa-bg/50 border border-nexa-border p-4 mb-4">
                  <p className="text-xs font-semibold text-nexa-text-secondary mb-2">DEMO AKIŞI:</p>
                  <pre className="text-xs text-nexa-text whitespace-pre-wrap font-mono">
                    {step.script}
                  </pre>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={step.href}
                    className={`px-4 py-2 rounded-lg ${step.bg} ${step.color} text-sm font-medium hover:opacity-80 transition-opacity`}
                  >
                    Bu Adımı Göster →
                  </Link>
                  <button
                    onClick={() => setCurrentStep(index)}
                    className="px-4 py-2 rounded-lg bg-nexa-card border border-nexa-border hover:border-nexa-primary/30 text-sm text-nexa-text transition-colors"
                  >
                    İşaretlenmiş Adım Yap
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Key Points */}
      <div className="rounded-xl border border-nexa-border bg-nexa-card p-6">
        <h2 className="text-lg font-bold text-nexa-text mb-4">Önemli Noktalar</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-nexa-success shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-nexa-text">Tek Seferlik Kurulum</p>
                <p className="text-xs text-nexa-text-secondary">Kaynak ve kurallar bir kez tanımlanır</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-nexa-success shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-nexa-text">Otomatik Güncelleme</p>
                <p className="text-xs text-nexa-text-secondary">THYRONIX kaynakları sürekli izler</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-nexa-success shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-nexa-text">Canlı Feed</p>
                <p className="text-xs text-nexa-text-secondary">URL her zaman güncel</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-nexa-success shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-nexa-text">AI Destekli</p>
                <p className="text-xs text-nexa-text-secondary">Başlık, açıklama, kategori optimizasyonu</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-nexa-success shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-nexa-text">Esnek Kurallar</p>
                <p className="text-xs text-nexa-text-secondary">Fiyat, stok, kategori, marka dönüşümleri</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-nexa-success shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-nexa-text">Çoklu Format</p>
                <p className="text-xs text-nexa-text-secondary">XML, CSV, Excel çıktısı</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Tips */}
      <div className="rounded-xl border border-nexa-warning/30 bg-nexa-warning/5 p-6">
        <div className="flex items-start gap-3">
          <Zap size={20} className="text-nexa-warning shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-nexa-text mb-2">Demo İpuçları</h3>
            <ul className="space-y-1 text-xs text-nexa-text-secondary">
              <li>• Önce "Demo Verisi Oluştur" butonunu kullanarak örnek veriler oluşturun</li>
              <li>• Her adımı sırayla gösterin, müşterinin anlamasını bekleyin</li>
              <li>• AI optimizasyonunu canlı gösterin, etkileyicidir</li>
              <li>• Feed URL'sini kopyalayıp tarayıcıda açarak canlı veriyi gösterin</li>
              <li>• "Otomatik güncelleme" konusunu vurgulayın, bu en önemli özellik</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
