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
            <p className="login-sub">Paylaşım menüsünden link kaydetmek için giriş yapın.</p>
            <div className="form-row">
              <label htmlFor="loginEmail">E-posta</label>
              <input type="email" id="loginEmail" autoComplete="username" placeholder="ornek@firma.com" />
            </div>
            <div className="form-row">
              <label htmlFor="loginPassword">Şifre</label>
              <input type="password" id="loginPassword" autoComplete="current-password" placeholder="••••••••" />
            </div>
            <button type="button" className="btn btn-primary btn-block" id="loginBtn">
              Giriş Yap
            </button>
            <p className="status-msg" id="loginStatus" />
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
          <section className="hero-card" id="shareCard">
            <p className="hero-label" id="shareLabel">
              LinkSlash
            </p>
            <h1 className="hero-title" id="shareTitle">
              Hoş geldiniz
            </h1>
            <p className="hero-url" id="shareUrl">
              Paylaşım menüsünden bir link gönderin veya aşağıdan kaydedin.
            </p>
            <p className="hero-meta" id="shareMeta">
              Kaynak: —
            </p>
            <button type="button" className="btn btn-primary btn-block hidden" id="saveBtn">
              LinkSlash&apos;a Kaydet
            </button>
            <p className="status-msg" id="statusMsg" />
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

          <section className="panel">
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
      </div>

      <Script src="/linkslash/mobile/js/share-parser.js" strategy="beforeInteractive" />
      <Script src="/linkslash/mobile/js/offline-queue.js" strategy="beforeInteractive" />
      <Script src="/linkslash/mobile/js/mobile-app.js" strategy="afterInteractive" />
    </>
  );
}
