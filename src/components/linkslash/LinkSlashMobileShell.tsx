"use client";

import { useEffect } from "react";
import Script from "next/script";

/**
 * İzole LinkSlash mobil shell — EnaUnity header/footer/nav yok.
 * UI mantığı public/linkslash/mobile/js/mobile-app.js içinde.
 */
export function LinkSlashMobileShell() {
  useEffect(() => {
    document.documentElement.classList.add("linkslash-mobile-shell");
    document.body.classList.add("linkslash-mobile-shell");
    return () => {
      document.documentElement.classList.remove("linkslash-mobile-shell");
      document.body.classList.remove("linkslash-mobile-shell");
    };
  }, []);

  return (
    <>
      <div className="mobile-app">
        <header className="mobile-header">
          <div className="brand">
            <span>Link</span>Slash
          </div>
          <div className="header-actions">
            <span className="sync-pill" id="syncPill">
              —
            </span>
            <button type="button" className="icon-btn hidden" id="logoutBtn" title="Çıkış">
              ↩
            </button>
          </div>
        </header>

        <main className="mobile-main screen" id="screenLogin">
          <section className="hero-card login-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/linkslash/icon192.png" alt="LinkSlash" className="login-logo" />
            <h1 className="login-title">LinkSlash Mobile</h1>
            <p className="login-sub">Paylaş menüsünden linkler otomatik kaydedilir. WhatsApp sohbet dosyası da içe aktarılabilir.</p>
            <form id="loginForm" noValidate>
              <div className="form-row">
                <label htmlFor="loginEmail">E-posta</label>
                <input type="email" id="loginEmail" autoComplete="username" placeholder="ornek@firma.com" required />
              </div>
              <div className="form-row">
                <label htmlFor="loginPassword">Şifre</label>
                <input type="password" id="loginPassword" autoComplete="current-password" placeholder="••••••••" required />
              </div>
              <button type="submit" className="btn btn-primary btn-block" id="loginBtn">
                Giriş Yap
              </button>
            </form>
            <p className="status-msg" id="loginStatus" role="alert" aria-live="polite" />
          </section>
        </main>

        <main className="mobile-main screen hidden" id="screenLicense">
          <section className="hero-card license-card">
            <div className="license-icon">🔒</div>
            <h1 className="login-title">Bu modül hesabınıza tanımlı değil</h1>
            <p className="login-sub" id="licenseMessage">
              LinkSlash lisansı gerekli. Bu uygulama ana siteye yönlendirmez.
            </p>
            <p className="hint" id="licenseHint">
              Tarayıcıdan ENAUNITY → LinkSlash → Lisans satın al
            </p>
            <div className="form-row">
              <label htmlFor="activationCode">Aktivasyon Kodu</label>
              <input type="text" id="activationCode" placeholder="LS-XXXX-XXXX-XXXX" autoComplete="off" />
            </div>
            <button type="button" className="btn btn-primary btn-block" id="activateBtn">
              Kodu Aktive Et
            </button>
            <p className="status-msg" id="activateStatus" />
            <button type="button" className="btn btn-secondary btn-block" id="retrySessionBtn">
              Durumu Yenile
            </button>
            <button type="button" className="btn btn-ghost btn-block" id="logoutLicenseBtn">
              Farklı hesapla giriş
            </button>
          </section>
        </main>

        <main className="mobile-main screen hidden" id="screenDevice">
          <section className="hero-card license-card">
            <div className="license-icon">📱</div>
            <h1 className="login-title">Bu lisans başka bir cihazda aktif</h1>
            <p className="login-sub" id="deviceMessage">
              Bu lisans yalnızca kayıtlı cihazda kullanılabilir.
            </p>
            <button type="button" className="btn btn-secondary btn-block" id="retryDeviceBtn">
              Tekrar Dene
            </button>
            <button type="button" className="btn btn-ghost btn-block" id="logoutDeviceBtn">
              Çıkış
            </button>
          </section>
        </main>

        <main className="mobile-main screen hidden" id="screenUpdate">
          <section className="hero-card license-card">
            <div className="license-icon">⬆️</div>
            <h1 className="login-title" id="updateTitle">
              Güncelleme gerekli
            </h1>
            <p className="login-sub" id="updateMessage">
              LinkSlash&apos;ın yeni sürümünü indirmeniz gerekiyor.
            </p>
            <button type="button" className="btn btn-primary btn-block" id="downloadUpdateBtn">
              Yeni APK İndir
            </button>
            <p className="hint" id="updateVersionInfo" />
          </section>
        </main>

        <main className="mobile-main screen hidden" id="screenApp">
          <section className="hero-card dashboard-hero">
            <p className="hero-label">Dashboard</p>
            <h1 className="hero-title" id="dashboardGreeting">
              Hoş geldiniz
            </h1>
            <p className="hero-url" id="dashboardHint">
              Link kaydetmek için aşağıdaki işlemleri kullanın.
            </p>
            <p className="status-msg" id="dashboardStatus" role="alert" aria-live="polite" />
            <div className="cta-grid">
              <button type="button" className="btn btn-primary btn-block" id="addLinkBtn">
                Link Ekle
              </button>
              <button type="button" className="btn btn-primary btn-block" id="whatsappImportBtn">
                WhatsApp Sohbeti İçe Aktar
              </button>
              <button type="button" className="btn btn-secondary btn-block" id="waitShareBtn">
                Paylaşımı Bekle
              </button>
              <button type="button" className="btn btn-secondary btn-block" id="openRecordsBtn">
                Son Kayıtları Aç
              </button>
              <button type="button" className="btn btn-ghost btn-block" id="dashboardLogoutBtn">
                Çıkış
              </button>
            </div>
          </section>

          <section className="user-strip hidden" id="userStrip">
            <span id="userName">—</span>
          </section>

          <section className="stats-row">
            <div className="stat">
              <span id="pendingCount">0</span>
              <small>Bekleyen</small>
            </div>
            <div className="stat">
              <span id="recentCount">0</span>
              <small>Son kayıt</small>
            </div>
          </section>

          <section className="panel" id="recentPanel">
            <div className="panel-head">
              <h2>Son Kaydedilenler</h2>
              <button type="button" className="link-btn" id="syncQueueBtn">
                Sync
              </button>
            </div>
            <ul className="recent-list" id="recentList" />
          </section>

          <section className="panel ai-panel" id="aiPanel">
            <div className="panel-head">
              <h2>Yapay Zeka Bağlantısı</h2>
              <span className="ai-badge missing" id="aiBadge">
                Anahtar yok
              </span>
            </div>
            <p className="hint">Kategorize ve özet için Groq/DeepSeek anahtarınızı girin.</p>
            <div className="form-row">
              <label htmlFor="aiProviderSelect">Sağlayıcı</label>
              <select id="aiProviderSelect">
                <option value="groq">Groq (ücretsiz tier)</option>
                <option value="deepseek">DeepSeek</option>
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="mobileApiKey">API Key</label>
              <input type="password" id="mobileApiKey" placeholder="gsk_... veya sk-..." autoComplete="off" />
            </div>
            <button type="button" className="btn btn-secondary btn-block" id="saveAiKeyBtn">
              Anahtarı Kaydet
            </button>
            <p className="ai-status" id="aiKeyStatus" />
          </section>

          <section className="panel offline-panel hidden" id="offlinePanel">
            <h2>Offline Kuyruk</h2>
            <ul className="queue-list" id="queueList" />
          </section>
        </main>

        <main className="mobile-main screen hidden" id="screenImport">
          <section className="hero-card import-card">
            <p className="hero-label" id="importLabel">
              Link Ekle
            </p>
            <h1 className="hero-title" id="importHeading">
              Yeni kayıt
            </h1>
            <p className="hero-meta" id="importShareMeta" />
            <form id="importForm" noValidate>
              <div className="form-row">
                <label htmlFor="importUrl">URL</label>
                <input type="url" id="importUrl" placeholder="https://ornek.com/urun" required />
              </div>
              <div className="form-row">
                <label htmlFor="importTitle">Başlık (opsiyonel)</label>
                <input type="text" id="importTitle" placeholder="Kayıt başlığı" />
              </div>
              <div className="form-row">
                <label htmlFor="importSourceType">Kaynak / Platform</label>
                <select id="importSourceType">
                  <option value="web">Web</option>
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                  <option value="twitter">Twitter / X</option>
                  <option value="facebook">Facebook</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="other">Diğer</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-block" id="importSaveBtn">
                Kaydet
              </button>
              <button type="button" className="btn btn-ghost btn-block" id="importBackBtn">
                Dashboard&apos;a Dön
              </button>
            </form>
            <p className="status-msg" id="importStatus" role="alert" aria-live="polite" />
          </section>
        </main>

        <main className="mobile-main screen hidden" id="screenWhatsApp">
          <section className="hero-card import-card">
            <p className="hero-label">WhatsApp İçe Aktar</p>
            <h1 className="hero-title">Sohbetten linkleri çıkar</h1>
            <p className="hero-meta">
              WhatsApp&apos;ta sohbeti dışa aktarın (.txt veya .zip), dosyayı seçin veya Dosyalar&apos;dan
              Paylaş → LinkSlash ile gönderin.
            </p>
            <input
              type="file"
              id="whatsappFileInput"
              accept=".txt,.zip,text/plain,application/zip,application/octet-stream,*/*"
              className="hidden"
            />
            <button type="button" className="btn btn-primary btn-block" id="whatsappFileBtn">
              WhatsApp Dosyası (.txt / .zip)
            </button>
            <button type="button" className="btn btn-secondary btn-block" id="bookmarkFileBtn">
              Yer İmi Dosyası (.html)
            </button>
            <input
              type="file"
              id="bookmarkFileInput"
              accept=".html,text/html"
              className="hidden"
            />
            <button type="button" className="btn btn-ghost btn-block" id="whatsappBackBtn">
              Dashboard&apos;a Dön
            </button>
            <p className="status-msg" id="whatsappStatus" role="alert" aria-live="polite" />
            <p className="hint" id="whatsappProgress" />
          </section>
        </main>

        <main className="mobile-main screen hidden" id="screenRecords">
          <section className="panel records-panel">
            <div className="panel-head">
              <h2>Son Kayıtlar</h2>
              <button type="button" className="link-btn" id="recordsBackBtn">
                ← Dashboard
              </button>
            </div>
            <ul className="recent-list" id="recordsList" />
            <p className="hint records-empty hidden" id="recordsEmpty">
              Henüz kayıt yok.{" "}
              <button type="button" className="link-btn" id="recordsAddBtn">
                İlk linkini ekle
              </button>
            </p>
            <p className="status-msg" id="recordsStatus" role="alert" aria-live="polite" />
          </section>
        </main>
      </div>

      <Script src="/linkslash/js/parser.js" strategy="beforeInteractive" />
      <Script src="/linkslash/mobile/js/jszip.min.js" strategy="beforeInteractive" />
      <Script src="/linkslash/mobile/js/share-parser.js" strategy="beforeInteractive" />
      <Script src="/linkslash/mobile/js/offline-queue.js" strategy="beforeInteractive" />
      <Script src="/linkslash/mobile/js/whatsapp-import.js" strategy="beforeInteractive" />
      <Script
        src="/linkslash/mobile/js/mobile-app.js"
        strategy="afterInteractive"
        onReady={() => {
          const boot = (window as Window & { LinkSlashMobileBoot?: () => void }).LinkSlashMobileBoot;
          boot?.();
        }}
      />
    </>
  );
}
