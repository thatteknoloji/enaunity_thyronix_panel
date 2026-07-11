/**
 * LinkSlash Mobile App — isolated shell (never navigates to main ENAUNITY site)
 */
(function() {
  var state = {
    session: null,
    share: null,
    hasShare: false,
    serverRecent: [],
    online: navigator.onLine,
    saving: false,
    screen: 'login',
    pendingWhatsApp: null
  };

  var APP_VERSION = '1.2.0';

  var CONFIG = {
    apiBase: window.LINKSLASH_API_BASE || '',
    checkoutPath: '/payment/checkout?type=module&moduleKey=LINKSLASH&planKey=starter',
    fullAppPath: '/dealer/linkslash'
  };

  var MOBILE_BASE = '/linkslash/mobile';

  var PATH_ROUTES = {
    '/linkslash/mobile/login': 'login',
    '/linkslash/mobile/dashboard': 'app',
    '/linkslash/mobile/license': 'license',
    '/linkslash/mobile/device': 'device',
    '/linkslash/mobile/update': 'update',
    '/linkslash/mobile/import': 'import',
    '/linkslash/mobile/whatsapp': 'whatsapp',
    '/linkslash/mobile/records': 'records'
  };

  var SCREEN_ROUTES = {
    login: MOBILE_BASE + '/login',
    license: MOBILE_BASE + '/license',
    device: MOBILE_BASE + '/device',
    update: MOBILE_BASE + '/update',
    app: MOBILE_BASE + '/dashboard',
    import: MOBILE_BASE + '/import',
    whatsapp: MOBILE_BASE + '/whatsapp',
    records: MOBILE_BASE + '/records'
  };

  function normalizePath(path) {
    if (!path) return MOBILE_BASE;
    var p = String(path).split('?')[0].split('#')[0].replace(/\/$/, '');
    if (!p) return MOBILE_BASE;
    return p;
  }

  function isShellPath(path) {
    var p = normalizePath(path);
    return p === MOBILE_BASE || p.indexOf(MOBILE_BASE + '/') === 0;
  }

  function isAllowedExternalUrl(url) {
    if (!url) return false;
    if (url.indexOf('/api/') !== -1) return true;
    if (url.indexOf('/dealer/linkslash') !== -1) return true;
    if (url.indexOf('/linkslash/index.html') !== -1) return true;
    if (url.indexOf('/gateway/linkslash') !== -1) return true;
    if (url.indexOf('/payment/checkout') !== -1) return true;
    return false;
  }

  function openFullWebApp() {
    var target = (CONFIG.apiBase || '') + CONFIG.fullAppPath;
    window.location.replace(target);
  }

  function navigateShell(routePath, replace) {
    var path = routePath || MOBILE_BASE + '/login';
    if (!isShellPath(path)) path = MOBILE_BASE + '/login';
    var method = replace ? 'replaceState' : 'pushState';
    if (window.history && window.history[method]) {
      window.history[method]({}, '', path);
    }
    syncRouteFromPath();
  }

  function syncRouteFromPath() {
    var path = normalizePath(window.location.pathname);
    if (path === MOBILE_BASE) return;
    var screen = PATH_ROUTES[path];
    if (!screen) return;
    if (screen === 'import') {
      showScreen('import');
      populateImportFromShare();
      return;
    }
    if (screen === 'whatsapp') {
      showScreen('whatsapp');
      return;
    }
    if (screen === 'records') {
      showScreen('records');
      renderRecordsList(getRecentItems());
      return;
    }
    if (screen === 'app') {
      showScreen('app');
      renderDashboard();
      return;
    }
    showScreen(screen);
  }

  function installNavigationGuard() {
    document.documentElement.classList.add('linkslash-mobile-shell');
    document.body.classList.add('linkslash-mobile-shell');

    document.addEventListener('click', function(e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (href.indexOf('http') === 0) {
        e.preventDefault();
        return;
      }
      if (href.charAt(0) === '/' && !isShellPath(href) && !isAllowedExternalUrl(href)) {
        e.preventDefault();
        console.warn('[LinkSlash Mobile] Dış rota engellendi:', href);
      }
    }, true);

    var origAssign = window.location.assign.bind(window.location);
    window.location.assign = function(url) {
      var path = url;
      if (typeof url === 'string' && url.indexOf('http') === 0) {
        try { path = new URL(url).pathname; } catch (_) { path = url; }
      }
      if (typeof path === 'string' && !isShellPath(path) && !isAllowedExternalUrl(path)) {
        console.warn('[LinkSlash Mobile] location.assign engellendi:', url);
        return;
      }
      origAssign(url);
    };

    try {
      var hrefDesc = Object.getOwnPropertyDescriptor(window.Location.prototype, 'href');
      if (hrefDesc && hrefDesc.set) {
        var origHrefSet = hrefDesc.set;
        Object.defineProperty(window.location, 'href', {
          get: hrefDesc.get ? hrefDesc.get.bind(window.location) : function() { return window.location.toString(); },
          set: function(url) {
            var path = url;
            if (typeof url === 'string' && url.indexOf('http') === 0) {
              try { path = new URL(url).pathname; } catch (_) { path = url; }
            }
            if (typeof path === 'string' && !isShellPath(path) && !isAllowedExternalUrl(path)) {
              console.warn('[LinkSlash Mobile] location.href engellendi:', url);
              return;
            }
            origHrefSet.call(window.location, url);
          },
          configurable: true
        });
      }
    } catch (_) {}

    window.addEventListener('popstate', function() {
      if (!isShellPath(window.location.pathname)) {
        navigateShell(SCREEN_ROUTES[state.screen] || MOBILE_BASE + '/login', true);
        return;
      }
      syncRouteFromPath();
    });
  }

  var SCREEN_MAP = {
    login: 'screenLogin',
    license: 'screenLicense',
    device: 'screenDevice',
    update: 'screenUpdate',
    app: 'screenApp',
    import: 'screenImport',
    whatsapp: 'screenWhatsApp',
    records: 'screenRecords'
  };

  function getDeviceId() {
    var id = localStorage.getItem('linkslash_device_id');
    if (!id) {
      id = 'ls-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
      localStorage.setItem('linkslash_device_id', id);
    }
    return id;
  }

  function getDeviceName() {
    var ua = navigator.userAgent || '';
    if (/Android/i.test(ua)) return 'Android';
    if (/iPhone|iPad/i.test(ua)) return 'iOS';
    return 'Mobile Web';
  }

  function $(id) { return document.getElementById(id); }

  function setStatus(text, type, elId) {
    var el = $(elId || 'statusMsg');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'status-msg' + (type ? ' ' + type : '');
  }

  function showScreen(name) {
    state.screen = name;
    Object.keys(SCREEN_MAP).forEach(function(key) {
      var el = $(SCREEN_MAP[key]);
      if (el) el.classList.toggle('hidden', key !== name);
    });
    var logoutBtn = $('logoutBtn');
    if (logoutBtn) {
      logoutBtn.classList.toggle('hidden', name === 'login' || name === 'update');
    }
    var route = SCREEN_ROUTES[name];
    if (route && normalizePath(window.location.pathname) !== normalizePath(route)) {
      try {
        window.history.replaceState({}, '', route);
      } catch (_) {}
    }
  }

  function openDashboard(replace) {
    showScreen('app');
    renderDashboard();
    navigateShell(MOBILE_BASE + '/dashboard', !!replace);
  }

  function openImport() {
    showScreen('import');
    populateImportFromShare();
    navigateShell(MOBILE_BASE + '/import', false);
  }

  function openRecords() {
    showScreen('records');
    renderRecordsList(getRecentItems());
    navigateShell(MOBILE_BASE + '/records', false);
  }

  function clearImportForm() {
    var urlEl = $('importUrl');
    var titleEl = $('importTitle');
    var sourceEl = $('importSourceType');
    if (urlEl) urlEl.value = '';
    if (titleEl) titleEl.value = '';
    if (sourceEl) sourceEl.value = 'web';
    setStatus('', '', 'importStatus');
    var meta = $('importShareMeta');
    if (meta) meta.textContent = '';
  }

  function populateImportFromShare() {
    var heading = $('importHeading');
    var label = $('importLabel');
    var meta = $('importShareMeta');
    if (!state.hasShare || !state.share) {
      if (heading) heading.textContent = 'Yeni kayıt';
      if (label) label.textContent = 'Link Ekle';
      if (meta) meta.textContent = '';
      return;
    }
    var share = state.share;
    if (heading) heading.textContent = share.title || 'Paylaşılan link';
    if (label) label.textContent = 'Paylaşılan içerik';
    if (meta) {
      meta.textContent = (share.sourceLabel || share.sourceType || 'web') +
        (share.sharedFrom ? ' · ' + share.sharedFrom : '');
    }
    var urlEl = $('importUrl');
    var titleEl = $('importTitle');
    var sourceEl = $('importSourceType');
    if (urlEl) urlEl.value = share.url || share.rawText || '';
    if (titleEl && share.title) titleEl.value = share.title;
    if (sourceEl && share.sourceType) sourceEl.value = mapSourceTypeToSelectValue(share.sourceType);
  }

  function renderDashboard() {
    var greeting = $('dashboardGreeting');
    var hint = $('dashboardHint');
    if (greeting && state.session && state.session.user) {
      greeting.textContent = 'Merhaba, ' + (state.session.user.name || state.session.user.email);
    } else if (greeting) {
      greeting.textContent = 'Hoş geldiniz';
    }
    if (hint) {
      hint.textContent = state.hasShare
        ? 'Paylaşılan içerik algılandı — otomatik kaydediliyor veya içe aktarılıyor.'
        : 'Instagram/WhatsApp\'tan Paylaş → LinkSlash veya dosya içe aktarın.';
    }
    renderRecent();
    renderQueue();
  }

  function getRecentItems() {
    if (state.serverRecent && state.serverRecent.length) return state.serverRecent;
    return LinkSlashOfflineQueue.readRecent();
  }

  function mapLinkToRecent(item) {
    return {
      id: item.id,
      url: item.url,
      title: item.title,
      sourceType: item.sourceType || item.platform || 'web',
      createdAt: item.createdAt || item.updatedAt || new Date().toISOString()
    };
  }

  function setSyncPill() {
    var pill = $('syncPill');
    if (!pill) return;
    if (!state.online) {
      pill.textContent = 'Offline';
      pill.className = 'sync-pill offline';
    } else if (state.session && state.session.authenticated && state.session.linkslashAccess) {
      pill.textContent = 'Online';
      pill.className = 'sync-pill online';
    } else if (state.session && state.session.authenticated) {
      pill.textContent = 'Lisans yok';
      pill.className = 'sync-pill';
    } else {
      pill.textContent = 'Giriş gerekli';
      pill.className = 'sync-pill';
    }
  }

  function renderUserStrip() {
    var strip = $('userStrip');
    var nameEl = $('userName');
    if (!strip || !nameEl || !state.session || !state.session.user) {
      if (strip) strip.classList.add('hidden');
      return;
    }
    strip.classList.remove('hidden');
    nameEl.textContent = state.session.user.name || state.session.user.email;
  }

  function renderRecent() {
    var list = $('recentList');
    var recent = getRecentItems().slice(0, 10).map(mapLinkToRecent);
    $('recentCount').textContent = String(getRecentItems().length);
    if (!list) return;
    if (!recent.length) {
      list.innerHTML = '<li class="meta empty-recent">Henüz kayıt yok. <button type="button" class="link-btn" data-action="add-link">İlk linkini ekle</button></li>';
      return;
    }
    list.innerHTML = recent.map(function(r) {
      return '<li><div class="title">' + escapeHtml(r.title || r.url) + '</div>' +
        '<div class="meta">' + escapeHtml(r.sourceType || 'web') + ' · ' + formatDate(r.createdAt) + '</div></li>';
    }).join('');
  }

  function renderRecordsList(items) {
    var list = $('recordsList');
    var empty = $('recordsEmpty');
    var mapped = (items || []).map(mapLinkToRecent);
    if (!list) return;
    if (!mapped.length) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    list.innerHTML = mapped.map(function(r) {
      return '<li><div class="title">' + escapeHtml(r.title || r.url) + '</div>' +
        '<div class="meta">' + escapeHtml(r.sourceType || 'web') + ' · ' + formatDate(r.createdAt) + '</div>' +
        '<div class="meta">' + escapeHtml(r.url || '') + '</div></li>';
    }).join('');
  }

  function renderQueue() {
    var queue = LinkSlashOfflineQueue.readQueue();
    $('pendingCount').textContent = String(LinkSlashOfflineQueue.pendingCount());
    var panel = $('offlinePanel');
    var list = $('queueList');
    if (!queue.length) {
      if (panel) panel.classList.add('hidden');
      return;
    }
    if (panel) panel.classList.remove('hidden');
    if (list) {
      list.innerHTML = queue.map(function(q) {
        return '<li><div class="title">' + escapeHtml(q.title || q.url || q.rawText) + '</div>' +
          '<div class="meta">' + q.status + (q.error ? ' · ' + escapeHtml(q.error) : '') + '</div></li>';
      }).join('');
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function formatDate(iso) {
    try { return new Date(iso).toLocaleString('tr-TR'); } catch (_) { return iso; }
  }

  function hasAiKey() {
    var provider = localStorage.getItem('ai_provider') || 'groq';
    if (provider === 'deepseek') return !!localStorage.getItem('deepseek_api_key');
    return !!localStorage.getItem('groq_api_key');
  }

  function updateAiBadge() {
    var badge = $('aiBadge');
    if (!badge) return;
    if (hasAiKey()) {
      badge.textContent = 'Anahtar kayıtlı';
      badge.className = 'ai-badge';
    } else {
      badge.textContent = 'Anahtar yok';
      badge.className = 'ai-badge missing';
    }
  }

  function loadAiSettings() {
    var provider = localStorage.getItem('ai_provider') || 'groq';
    var select = $('aiProviderSelect');
    var input = $('mobileApiKey');
    if (select) select.value = provider;
    if (input) {
      input.value = provider === 'deepseek'
        ? (localStorage.getItem('deepseek_api_key') || '')
        : (localStorage.getItem('groq_api_key') || '');
    }
    updateAiBadge();
  }

  function saveAiSettings() {
    var provider = ($('aiProviderSelect') && $('aiProviderSelect').value) || 'groq';
    var key = ($('mobileApiKey') && $('mobileApiKey').value.trim()) || '';
    var status = $('aiKeyStatus');
    if (!key) {
      if (status) { status.textContent = 'API anahtarı gerekli'; status.className = 'ai-status err'; }
      return;
    }
    localStorage.setItem('ai_provider', provider);
    if (provider === 'deepseek') {
      localStorage.setItem('deepseek_api_key', key);
    } else {
      localStorage.setItem('groq_api_key', key);
    }
    if (status) { status.textContent = '✓ Anahtar kaydedildi'; status.className = 'ai-status ok'; }
    updateAiBadge();
  }

  async function checkSession() {
    var qs = '?deviceId=' + encodeURIComponent(getDeviceId()) + '&appVersion=' + encodeURIComponent(APP_VERSION);
    var resp = await fetch(CONFIG.apiBase + '/api/linkslash/session' + qs, { credentials: 'include' });
    var json = await resp.json();
    state.session = json;
    setSyncPill();
    renderUserStrip();
    return json;
  }

  async function checkVersionGate() {
    try {
      var resp = await fetch(CONFIG.apiBase + '/api/linkslash/version?current=' + encodeURIComponent(APP_VERSION));
      var json = await resp.json();
      if (!json.success) return true;
      state.versionInfo = json;
      if (json.updateRequired) {
        $('updateTitle').textContent = 'Güncelleme zorunlu';
        $('updateMessage').textContent = 'Mevcut sürüm (' + APP_VERSION + ') artık desteklenmiyor. v' + json.required + ' veya üzeri gerekli.';
        $('updateVersionInfo').textContent = 'En son sürüm: v' + json.latest;
        showScreen('update');
        navigateShell(MOBILE_BASE + '/update', true);
        return false;
      }
      if (json.updateAvailable && state.session && state.session.authenticated) {
        setStatus('Güncelleme mevcut: v' + json.latest, 'info');
      }
      return true;
    } catch (_) {
      return true;
    }
  }

  async function registerDevice() {
    var resp = await fetch(CONFIG.apiBase + '/api/linkslash/mobile/device', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: getDeviceId(),
        deviceName: getDeviceName(),
        androidId: localStorage.getItem('linkslash_android_id') || ''
      })
    });
    var json = await resp.json();
    if (json.success) return { ok: true };
    if (json.code === 'DEVICE_LIMIT') {
      var msg = $('deviceMessage');
      if (msg) {
        msg.textContent = json.error + (json.activeDevice ? ' (' + json.activeDevice.deviceName + ')' : '');
      }
      return { ok: false };
    }
    return { ok: false, error: json.error };
  }

  async function activateCode() {
    var code = ($('activationCode') && $('activationCode').value.trim()) || '';
    if (!code) {
      setStatus('Aktivasyon kodu girin', 'err', 'activateStatus');
      return;
    }
    setStatus('Aktive ediliyor...', 'info', 'activateStatus');
    var resp = await fetch(CONFIG.apiBase + '/api/linkslash/mobile/activate', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code })
    });
    var json = await resp.json();
    if (!json.success) {
      setStatus(json.error || 'Aktivasyon başarısız', 'err', 'activateStatus');
      return;
    }
    setStatus('✓ Lisans aktif edildi', 'ok', 'activateStatus');
    await checkSession();
    routeAfterSession();
  }

  async function downloadUpdateApk() {
    try {
      var resp = await fetch(CONFIG.apiBase + '/api/linkslash/download/token', { method: 'POST', credentials: 'include' });
      var json = await resp.json();
      if (json.success && json.data && json.data.downloadUrl) {
        var url = CONFIG.apiBase + json.data.downloadUrl;
        var a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        setStatus(json.error || 'İndirme başlatılamadı', 'err', 'updateMessage');
      }
    } catch (e) {
      setStatus('İndirme hatası', 'err', 'updateMessage');
    }
  }

  function licenseMessage(session) {
    if (session.accessCode === 'LISANS_BEKLIYOR') {
      return 'LinkSlash lisansınız onay veya ödeme bekliyor. Aktif olunca uygulamayı yeniden açın.';
    }
    if (session.accessCode === 'DEALER_REQUIRED') {
      return 'LinkSlash için bayi hesabı gerekli. Yönetici ile iletişime geçin.';
    }
    return 'LinkSlash lisansı hesabınıza tanımlı değil. Tarayıcıdan lisans satın alabilirsiniz.';
  }

  async function routeAfterSession() {
    var session = state.session;
    if (!session || !session.authenticated) {
      showScreen('login');
      navigateShell(MOBILE_BASE + '/login', true);
      return;
    }
    if (!session.linkslashAccess) {
      var msg = $('licenseMessage');
      if (msg) msg.textContent = licenseMessage(session);
      showScreen('license');
      navigateShell(MOBILE_BASE + '/license', true);
      return;
    }
    var device = await registerDevice();
    if (!device.ok) {
      showScreen('device');
      navigateShell(MOBILE_BASE + '/device', true);
      return;
    }
    showScreen('app');
    if (state.pendingWhatsApp) {
      var waText = state.pendingWhatsApp;
      state.pendingWhatsApp = null;
      processWhatsAppText(waText, 'WhatsApp');
      return;
    }
    if (state.hasShare && state.share && state.share.url) {
      autoCaptureShare(state.share);
      return;
    }
    if (state.hasShare) {
      openImport();
      return;
    }
    openFullWebApp();
    pullFromServer(false).catch(function(err) {
      console.warn('[LinkSlash Mobile] initial pull failed:', err);
    });
  }

  function setLoginLoading(loading) {
    var btn = $('loginBtn');
    if (!btn) return;
    btn.disabled = !!loading;
    btn.textContent = loading ? 'Giriş yapılıyor...' : 'Giriş Yap';
  }

  async function login(event) {
    if (event && event.preventDefault) event.preventDefault();

    var email = ($('loginEmail') && $('loginEmail').value.trim()) || '';
    var password = ($('loginPassword') && $('loginPassword').value) || '';
    if (!email || !password) {
      setStatus('E-posta ve şifre gerekli', 'err', 'loginStatus');
      return;
    }

    setLoginLoading(true);
    setStatus('Giriş yapılıyor...', 'info', 'loginStatus');
    try {
      var resp = await fetch(CONFIG.apiBase + '/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      });

      var json = {};
      try {
        json = await resp.json();
      } catch (parseErr) {
        console.error('[LinkSlash Mobile] login response parse failed:', parseErr);
        setStatus('Sunucu yanıtı okunamadı', 'err', 'loginStatus');
        return;
      }

      if (!resp.ok || !json.success) {
        console.error('[LinkSlash Mobile] login failed:', {
          status: resp.status,
          error: json.error || 'unknown'
        });
        setStatus(json.error || 'Giriş başarısız', 'err', 'loginStatus');
        return;
      }
      if (json.requires2FA) {
        console.error('[LinkSlash Mobile] login blocked: 2FA required');
        setStatus('2FA bu mobil uygulamada desteklenmiyor — tarayıcıdan giriş yapın', 'err', 'loginStatus');
        return;
      }

      setStatus('✓ Giriş başarılı', 'ok', 'loginStatus');
      await checkSession();

      if (state.session && state.session.authenticated && state.session.linkslashAccess) {
        try {
          await fetch(CONFIG.apiBase + '/api/linkslash/mobile/sync', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: [] })
          });
        } catch (syncErr) {
          console.warn('[LinkSlash Mobile] post-login sync skipped:', syncErr);
        }
      }

      await routeAfterSession();
    } catch (err) {
      console.error('[LinkSlash Mobile] login request failed:', err);
      setStatus('Bağlantı hatası: ' + (err && err.message ? err.message : 'bilinmeyen'), 'err', 'loginStatus');
    } finally {
      setLoginLoading(false);
    }
  }

  async function logout() {
    try {
      await fetch(CONFIG.apiBase + '/api/auth/login', { method: 'DELETE', credentials: 'include' });
    } catch (_) {}
    state.session = null;
    showScreen('login');
    navigateShell(MOBILE_BASE + '/login', true);
    setSyncPill();
    setStatus('', '', 'loginStatus');
  }

  async function captureOnline(payload) {
    var resp = await fetch(CONFIG.apiBase + '/api/linkslash/mobile/capture', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ client: 'mobile' }, payload))
    });
    var json = await resp.json();
    if (!resp.ok || !json.success) {
      var err = new Error(json.error || 'Kaydedilemedi');
      err.code = json.code;
      throw err;
    }
    return json.data;
  }

  async function saveManualImport(event) {
    if (event && event.preventDefault) event.preventDefault();
    if (state.saving) return;

    var url = ($('importUrl') && $('importUrl').value.trim()) || '';
    var title = ($('importTitle') && $('importTitle').value.trim()) || '';
    var sourceType = ($('importSourceType') && $('importSourceType').value) || 'web';
    if (!url) {
      setStatus('URL gerekli', 'err', 'importStatus');
      return;
    }

    state.saving = true;
    var saveBtn = $('importSaveBtn');
    if (saveBtn) saveBtn.disabled = true;
    setStatus('Kaydediliyor...', 'info', 'importStatus');

    var payload = {
      url: url,
      rawText: url.indexOf('http') === 0 ? '' : url,
      title: title || undefined,
      sourceType: sourceType,
      sharedFrom: state.share && state.share.sharedFrom ? state.share.sharedFrom : undefined
    };

    try {
      var session = state.session || await checkSession();
      if (!session.authenticated) {
        showScreen('login');
        navigateShell(MOBILE_BASE + '/login', true);
        setStatus('Kaydetmek için giriş yapın', 'err', 'loginStatus');
        return;
      }
      if (!session.linkslashAccess) {
        routeAfterSession();
        return;
      }

      if (!navigator.onLine) {
        LinkSlashOfflineQueue.enqueue(payload);
        setStatus('Offline — kuyruğa eklendi', 'info', 'importStatus');
        state.hasShare = false;
        state.share = null;
        try { localStorage.removeItem('linkslash_last_share'); } catch (_) {}
        setTimeout(function() { openDashboard(true); }, 600);
        return;
      }

      var result = await captureOnline(payload);
      LinkSlashOfflineQueue.addRecent({
        id: result.id,
        url: result.url,
        title: result.title,
        sourceType: result.sourceType,
        sharedFrom: payload.sharedFrom
      });
      state.hasShare = false;
      state.share = null;
      try { localStorage.removeItem('linkslash_last_share'); } catch (_) {}
      clearImportForm();
      openDashboard(true);
      await pullFromServer(false);
      setStatus('✓ Link kaydedildi', 'ok', 'dashboardStatus');
    } catch (err) {
      console.error('[LinkSlash Mobile] import save failed:', err);
      if (err.code === 'AUTH_REQUIRED') {
        showScreen('login');
        navigateShell(MOBILE_BASE + '/login', true);
        setStatus('Oturum süresi doldu — tekrar giriş yapın', 'err', 'loginStatus');
        return;
      }
      setStatus('Kaydedilemedi: ' + (err.message || 'bilinmeyen hata'), 'err', 'importStatus');
    } finally {
      state.saving = false;
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  function showWaitForShare() {
    setStatus('Instagram, Chrome veya WhatsApp\'ta Paylaş → LinkSlash seçin. Link otomatik kaydedilir; sohbet ZIP/TXT içe aktarılır.', 'info', 'dashboardStatus');
  }

  async function flushOfflineQueue(silent) {
    var queue = LinkSlashOfflineQueue.readQueue().filter(function(q) {
      return q.status === 'pending' || q.status === 'error';
    });
    if (!queue.length) return { synced: 0 };

    var resp = await fetch(CONFIG.apiBase + '/api/linkslash/mobile/sync', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: queue.map(function(q) {
          return {
            queueId: q.id,
            url: q.url,
            rawText: q.rawText,
            title: q.title,
            sourceType: q.sourceType,
            sharedFrom: q.sharedFrom
          };
        })
      })
    });
    var json = await resp.json();
    if (!json.success) throw new Error(json.error || 'Kuyruk sync başarısız');

    (json.data.results || []).forEach(function(r) {
      if (r.queueId) LinkSlashOfflineQueue.markSynced(r.queueId);
      LinkSlashOfflineQueue.addRecent({
        id: r.id,
        url: r.url,
        title: r.title || r.url,
        sourceType: r.sourceType || 'web'
      });
    });
    (json.data.errors || []).forEach(function(e) {
      if (e.queueId) LinkSlashOfflineQueue.markError(e.queueId, e.error);
    });

    if (!silent) {
      setStatus('✓ ' + json.data.synced + ' bekleyen kayıt gönderildi', 'ok', 'dashboardStatus');
    }
    renderQueue();
    return json.data;
  }

  async function pullFromServer(showMessages) {
    if (!navigator.onLine) {
      if (showMessages !== false) setStatus('Sync için internet gerekli', 'err', 'dashboardStatus');
      throw new Error('offline');
    }

    var session = await checkSession();
    if (!session.authenticated || !session.linkslashAccess) {
      routeAfterSession();
      throw new Error('auth');
    }

    var syncBtn = $('syncQueueBtn');
    if (syncBtn) syncBtn.disabled = true;
    if (showMessages !== false) setStatus('Senkronize ediliyor...', 'info', 'dashboardStatus');

    try {
      await flushOfflineQueue(true);

      var resp = await fetch(CONFIG.apiBase + '/api/linkslash/sync/pull', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      var json = await resp.json();
      if (!resp.ok || !json.success) {
        throw new Error(json.error || 'Sync başarısız');
      }

      var links = (json.data && json.data.links) || [];
      links.sort(function(a, b) {
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      });
      state.serverRecent = links;
      links.slice(0, 10).forEach(function(link) {
        LinkSlashOfflineQueue.addRecent(mapLinkToRecent(link));
      });

      renderRecent();
      if (state.screen === 'records') renderRecordsList(links);
      if (showMessages !== false) {
        setStatus('✓ ' + links.length + ' kayıt güncellendi', 'ok', 'dashboardStatus');
      }
      return links;
    } catch (err) {
      console.error('[LinkSlash Mobile] pull sync failed:', err);
      if (showMessages !== false) {
        setStatus('Sync hatası: ' + (err.message || 'bilinmeyen'), 'err', 'dashboardStatus');
      }
      throw err;
    } finally {
      if (syncBtn) syncBtn.disabled = false;
    }
  }

  async function syncQueue() {
    try {
      await pullFromServer(true);
    } catch (err) {
      if (err && err.message !== 'auth') {
        setStatus('Sync hatası: ' + err.message, 'err', 'dashboardStatus');
      }
    }
  }

  function openWhatsAppImport() {
    showScreen('whatsapp');
    setStatus('', '', 'whatsappStatus');
    var progress = $('whatsappProgress');
    if (progress) progress.textContent = '';
    navigateShell(MOBILE_BASE + '/whatsapp', false);
  }

  function mapSourceTypeToSelectValue(sourceType) {
    var map = {
      instagram_post: 'instagram',
      instagram_reel: 'instagram',
      youtube_video: 'youtube',
      youtube_shorts: 'youtube',
      tweet: 'twitter',
      tiktok_video: 'tiktok',
      facebook_post: 'facebook',
      linkedin_post: 'linkedin',
      whatsapp: 'whatsapp',
      web: 'web'
    };
    return map[sourceType] || 'other';
  }

  async function clearNativeShare() {
    try { localStorage.removeItem('linkslash_last_share'); } catch (_) {}
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.ShareReceiver) {
      try { await window.Capacitor.Plugins.ShareReceiver.clearPendingShare(); } catch (_) {}
    }
  }

  async function autoCaptureShare(share, payload) {
    if (!share || !share.url) return false;
    if (state.saving) return true;

    state.saving = true;
    showScreen('app');
    setStatus('Paylaşılan link kaydediliyor...', 'info', 'dashboardStatus');

    var capturePayload = {
      url: share.url,
      rawText: share.rawText || '',
      title: share.title || undefined,
      sourceType: share.sourceType || 'web',
      sharedFrom: share.sharedFrom || undefined
    };

    try {
      var session = state.session || await checkSession();
      if (!session.authenticated || !session.linkslashAccess) {
        routeAfterSession();
        return true;
      }

      if (!navigator.onLine) {
        LinkSlashOfflineQueue.enqueue(capturePayload);
        setStatus('Offline — paylaşım kuyruğa eklendi', 'info', 'dashboardStatus');
        state.hasShare = false;
        state.share = null;
        await clearNativeShare();
        openDashboard(true);
        return true;
      }

      var result = await captureOnline(capturePayload);
      LinkSlashOfflineQueue.addRecent({
        id: result.id,
        url: result.url,
        title: result.title,
        sourceType: result.sourceType,
        sharedFrom: capturePayload.sharedFrom
      });
      state.hasShare = false;
      state.share = null;
      await clearNativeShare();
      await pullFromServer(false);
      setStatus('✓ Kaydedildi: ' + (result.title || result.url), 'ok', 'dashboardStatus');
      setTimeout(openFullWebApp, 500);
      return true;
    } catch (err) {
      console.error('[LinkSlash Mobile] auto capture failed:', err);
      if (err.code === 'AUTH_REQUIRED') {
        showScreen('login');
        navigateShell(MOBILE_BASE + '/login', true);
        setStatus('Oturum süresi doldu — tekrar giriş yapın', 'err', 'loginStatus');
        return true;
      }
      openImport();
      setStatus('Otomatik kayıt başarısız — düzenleyip Kaydet\'e basın', 'err', 'importStatus');
      return false;
    } finally {
      state.saving = false;
    }
  }

  async function processWhatsAppText(rawText, sharedFrom) {
    if (!rawText || rawText.length < 20) {
      setStatus('Geçerli WhatsApp sohbet dosyası değil', 'err', 'whatsappStatus');
      return;
    }

    var session = state.session || await checkSession();
    if (!session.authenticated || !session.linkslashAccess) {
      routeAfterSession();
      return;
    }

    showScreen('whatsapp');
    setStatus('Sohbet ayrıştırılıyor...', 'info', 'whatsappStatus');

    try {
      var parsed = LinkSlashWhatsAppImport.parseChatText(rawText);
      var links = parsed.links || [];
      if (!links.length) {
        setStatus('Sohbette link bulunamadı (' + (parsed.stats && parsed.stats.totalMessages) + ' mesaj tarandı)', 'err', 'whatsappStatus');
        return;
      }

      var items = LinkSlashWhatsAppImport.linksToCaptureItems(links, sharedFrom || 'WhatsApp');
      var progress = $('whatsappProgress');
      setStatus(links.length + ' link bulundu, kaydediliyor...', 'info', 'whatsappStatus');

      var result = await LinkSlashWhatsAppImport.captureBatch(CONFIG.apiBase, items, function(done, total, synced) {
        if (progress) progress.textContent = done + ' / ' + total + ' işlendi (' + synced + ' kayıt)';
      });

      (result.results || []).forEach(function(r) {
        LinkSlashOfflineQueue.addRecent({
          id: r.id,
          url: r.url,
          title: r.title,
          sourceType: r.sourceType || 'whatsapp'
        });
      });

      state.hasShare = false;
      state.share = null;
      await clearNativeShare();
      await pullFromServer(false);
      setStatus('✓ ' + result.synced + ' link WhatsApp sohbetinden kaydedildi', 'ok', 'dashboardStatus');
      if (progress) progress.textContent = result.synced + ' kayıt tamamlandı';
      setTimeout(openFullWebApp, 600);
    } catch (err) {
      console.error('[LinkSlash Mobile] whatsapp import failed:', err);
      setStatus('İçe aktarma hatası: ' + (err.message || 'bilinmeyen'), 'err', 'whatsappStatus');
    }
  }

  async function processBookmarkHtml(html) {
    showScreen('whatsapp');
    setStatus('Yer imleri ayrıştırılıyor...', 'info', 'whatsappStatus');
    try {
      var parsed = LinkSlashWhatsAppImport.parseBookmarkHtml(html);
      var links = parsed.links || [];
      if (!links.length) {
        setStatus('HTML dosyasında geçerli link bulunamadı', 'err', 'whatsappStatus');
        return;
      }
      var items = LinkSlashWhatsAppImport.bookmarkLinksToCaptureItems(links);
      var progress = $('whatsappProgress');
      setStatus(links.length + ' yer imi bulundu, kaydediliyor...', 'info', 'whatsappStatus');
      var result = await LinkSlashWhatsAppImport.captureBatch(CONFIG.apiBase, items, function(done, total, synced) {
        if (progress) progress.textContent = done + ' / ' + total + ' işlendi (' + synced + ' kayıt)';
      });
      (result.results || []).forEach(function(r) {
        LinkSlashOfflineQueue.addRecent({
          id: r.id,
          url: r.url,
          title: r.title,
          sourceType: r.sourceType || 'web'
        });
      });
      openDashboard(true);
      await pullFromServer(false);
      setStatus('✓ ' + result.synced + ' yer imi kaydedildi', 'ok', 'dashboardStatus');
      if (progress) progress.textContent = result.synced + ' kayıt tamamlandı';
      setTimeout(openFullWebApp, 600);
    } catch (err) {
      setStatus('Yer imi hatası: ' + (err.message || 'bilinmeyen'), 'err', 'whatsappStatus');
    }
  }

  async function handleWhatsAppFileInput(event) {
    var file = event && event.target && event.target.files && event.target.files[0];
    if (!file) return;
    try {
      setStatus('Dosya okunuyor...', 'info', 'whatsappStatus');
      var text = await LinkSlashWhatsAppImport.loadFileContent(file);
      await processWhatsAppText(text, 'WhatsApp');
    } catch (err) {
      setStatus('Dosya hatası: ' + (err.message || 'bilinmeyen'), 'err', 'whatsappStatus');
    } finally {
      if (event && event.target) event.target.value = '';
    }
  }

  async function handleBookmarkFileInput(event) {
    var file = event && event.target && event.target.files && event.target.files[0];
    if (!file) return;
    try {
      var text = await LinkSlashWhatsAppImport.loadFileContent(file);
      if ((file.name || '').toLowerCase().endsWith('.html') || text.indexOf('<A ') !== -1 || text.indexOf('<a ') !== -1) {
        await processBookmarkHtml(text);
      } else {
        await processWhatsAppText(text, 'WhatsApp');
      }
    } catch (err) {
      setStatus('Dosya hatası: ' + (err.message || 'bilinmeyen'), 'err', 'whatsappStatus');
    } finally {
      if (event && event.target) event.target.value = '';
    }
  }

  async function pollPendingShare() {
    if (!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.ShareReceiver) return;
    try {
      var pending = await window.Capacitor.Plugins.ShareReceiver.getPendingShare();
      if (pending && (pending.text || pending.html || pending.title)) {
        await handleIncomingShare(pending, true);
      }
    } catch (_) {}
  }

  async function handleIncomingShare(payload, fromNative) {
    payload = payload || {};
    if (payload.kind === 'whatsapp_export' || (payload.text && payload.text.length > 500 && !LinkSlashShareParser.extractPrimaryUrl(payload.text, payload.html))) {
      try { localStorage.setItem('linkslash_last_share', JSON.stringify(payload)); } catch (_) {}
      if (state.session && state.session.authenticated && state.session.linkslashAccess) {
        await processWhatsAppText(payload.text, LinkSlashWhatsAppImport.inferPackageLabel(payload.sharedFrom) || 'WhatsApp');
        if (fromNative) await clearNativeShare();
      } else {
        state.pendingWhatsApp = payload.text;
        setStatus('WhatsApp sohbeti algılandı — giriş yapınca içe aktarılacak', 'info', 'dashboardStatus');
      }
      return;
    }

    state.share = LinkSlashShareParser.parseSharePayload(payload);
    state.hasShare = !!(state.share.url || state.share.rawText);
    try { localStorage.setItem('linkslash_last_share', JSON.stringify(payload)); } catch (_) {}

    if (state.session && state.session.authenticated && state.session.linkslashAccess) {
      if (state.share.url) {
        var captured = await autoCaptureShare(state.share, payload);
        if (captured && fromNative) await clearNativeShare();
        return;
      }
      openImport();
      setStatus('Paylaşılan içerik — URL bulunamadı, manuel düzenleyin', 'info', 'importStatus');
      return;
    }

    if (state.screen === 'app') {
      setStatus('Paylaşım algılandı — giriş yapınca otomatik kaydedilecek', 'info', 'dashboardStatus');
      renderDashboard();
    }
  }

  function applySharePayload(payload) {
    handleIncomingShare(payload, false);
  }

  window.LinkSlashMobile = {
    onNativeShare: function(payload) {
      handleIncomingShare(typeof payload === 'string' ? { text: payload } : payload, true);
    },
    applySharePayload: applySharePayload,
    pollPendingShare: pollPendingShare
  };

  var booted = false;

  async function bootstrap() {
    if (booted) return;
    booted = true;

    installNavigationGuard();

    window.addEventListener('online', function() {
      state.online = true;
      setSyncPill();
      if (state.screen === 'app') syncQueue();
    });
    window.addEventListener('offline', function() {
      state.online = false;
      setSyncPill();
    });

    loadAiSettings();
    renderRecent();
    renderQueue();

    try {
      var last = localStorage.getItem('linkslash_last_share');
      if (last) applySharePayload(JSON.parse(last));
    } catch (_) {}

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.ShareReceiver) {
      try {
        var pending = await window.Capacitor.Plugins.ShareReceiver.getPendingShare();
        if (pending && (pending.text || pending.html || pending.title)) {
          await handleIncomingShare(pending, true);
        }
      } catch (_) {}
    }

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.addListener('appStateChange', function(appState) {
        if (appState && appState.isActive) pollPendingShare();
      });
    }

    if (!(await checkVersionGate())) return;

    await checkSession();

    var path = normalizePath(window.location.pathname);
    if (path === MOBILE_BASE) {
      await routeAfterSession();
    } else {
      syncRouteFromPath();
      if (state.session && state.session.authenticated) {
        if (!state.session.linkslashAccess && PATH_ROUTES[path] !== 'license') {
          await routeAfterSession();
        } else if (state.session.linkslashAccess && (path === MOBILE_BASE + '/login' || path === MOBILE_BASE + '/license')) {
          await routeAfterSession();
        } else if (state.session.linkslashAccess && (path === MOBILE_BASE + '/dashboard' || path === MOBILE_BASE + '/records')) {
          try { await pullFromServer(false); } catch (_) {}
        }
      } else if (PATH_ROUTES[path] && PATH_ROUTES[path] !== 'login') {
        showScreen('login');
        navigateShell(MOBILE_BASE + '/login', true);
      }
    }

    var loginForm = $('loginForm');
    if (loginForm) loginForm.addEventListener('submit', login);

    if ($('logoutBtn')) $('logoutBtn').addEventListener('click', logout);
    if ($('dashboardLogoutBtn')) $('dashboardLogoutBtn').addEventListener('click', logout);
    if ($('logoutLicenseBtn')) $('logoutLicenseBtn').addEventListener('click', logout);
    if ($('logoutDeviceBtn')) $('logoutDeviceBtn').addEventListener('click', logout);
    if ($('activateBtn')) $('activateBtn').addEventListener('click', activateCode);
    if ($('downloadUpdateBtn')) $('downloadUpdateBtn').addEventListener('click', downloadUpdateApk);
    if ($('retrySessionBtn')) {
      $('retrySessionBtn').addEventListener('click', async function() {
        await checkSession();
        await routeAfterSession();
      });
    }
    if ($('retryDeviceBtn')) {
      $('retryDeviceBtn').addEventListener('click', async function() {
        await checkSession();
        await routeAfterSession();
      });
    }
    if ($('addLinkBtn')) $('addLinkBtn').addEventListener('click', function() { openImport(); });
    if ($('whatsappImportBtn')) $('whatsappImportBtn').addEventListener('click', openWhatsAppImport);
    if ($('whatsappFileBtn')) $('whatsappFileBtn').addEventListener('click', function() {
      var input = $('whatsappFileInput');
      if (input) input.click();
    });
    if ($('bookmarkFileBtn')) $('bookmarkFileBtn').addEventListener('click', function() {
      var input = $('bookmarkFileInput');
      if (input) input.click();
    });
    if ($('whatsappFileInput')) $('whatsappFileInput').addEventListener('change', handleWhatsAppFileInput);
    if ($('bookmarkFileInput')) $('bookmarkFileInput').addEventListener('change', handleBookmarkFileInput);
    if ($('whatsappBackBtn')) $('whatsappBackBtn').addEventListener('click', function() { openDashboard(true); });
    if ($('waitShareBtn')) $('waitShareBtn').addEventListener('click', showWaitForShare);
    if ($('openRecordsBtn')) $('openRecordsBtn').addEventListener('click', openRecords);
    if ($('importForm')) $('importForm').addEventListener('submit', saveManualImport);
    if ($('importBackBtn')) $('importBackBtn').addEventListener('click', function() { openDashboard(true); });
    if ($('recordsBackBtn')) $('recordsBackBtn').addEventListener('click', function() { openDashboard(true); });
    if ($('recordsAddBtn')) $('recordsAddBtn').addEventListener('click', function() { openImport(); });
    if ($('syncQueueBtn')) $('syncQueueBtn').addEventListener('click', syncQueue);
    if ($('saveAiKeyBtn')) $('saveAiKeyBtn').addEventListener('click', saveAiSettings);

    var recentList = $('recentList');
    if (recentList) {
      recentList.addEventListener('click', function(e) {
        var target = e.target;
        if (target && target.getAttribute && target.getAttribute('data-action') === 'add-link') {
          e.preventDefault();
          openImport();
        }
      });
    }

    if (navigator.onLine && LinkSlashOfflineQueue.pendingCount() > 0 && state.screen === 'app') {
      syncQueue();
    }
  }

  window.LinkSlashMobileBoot = bootstrap;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
