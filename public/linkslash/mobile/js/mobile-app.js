/**
 * LinkSlash Mobile App — isolated shell (never navigates to main ENAUNITY site)
 */
(function() {
  var state = {
    session: null,
    share: null,
    hasShare: false,
    online: navigator.onLine,
    saving: false,
    screen: 'login'
  };

  var APP_VERSION = '1.0.0';

  var CONFIG = {
    apiBase: window.LINKSLASH_API_BASE || '',
    checkoutPath: '/payment/checkout?type=module&moduleKey=LINKSLASH&planKey=starter'
  };

  var SCREEN_MAP = {
    login: 'screenLogin',
    license: 'screenLicense',
    device: 'screenDevice',
    update: 'screenUpdate',
    app: 'screenApp'
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
    if (logoutBtn) logoutBtn.classList.toggle('hidden', name === 'login' || name === 'update');
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

  function renderSharePreview(share) {
    state.hasShare = !!(share && (share.url || share.rawText));
    $('shareLabel').textContent = state.hasShare ? 'Paylaşılan içerik' : 'LinkSlash';
    $('shareTitle').textContent = share && share.title ? share.title : (state.hasShare ? 'Paylaşılan link' : 'Hoş geldiniz');
    $('shareUrl').textContent = share && (share.url || share.rawText)
      ? (share.url || share.rawText)
      : 'Herhangi bir uygulamadan Paylaş → LinkSlash';
    $('shareMeta').textContent = share && (share.sourceLabel || share.sourceType)
      ? 'Kaynak: ' + (share.sourceLabel || share.sourceType) + (share.sharedFrom ? ' · ' + share.sharedFrom : '')
      : 'Kaynak: —';
    $('saveBtn').classList.toggle('hidden', !state.hasShare);
  }

  function renderDefaultDashboard() {
    state.hasShare = false;
    renderSharePreview(null);
  }

  function renderRecent() {
    var list = $('recentList');
    var recent = LinkSlashOfflineQueue.readRecent();
    $('recentCount').textContent = String(recent.length);
    if (!list) return;
    if (!recent.length) {
      list.innerHTML = '<li class="meta">Henüz kayıt yok</li>';
      return;
    }
    list.innerHTML = recent.map(function(r) {
      return '<li><div class="title">' + escapeHtml(r.title || r.url) + '</div>' +
        '<div class="meta">' + escapeHtml(r.sourceType || 'web') + ' · ' + formatDate(r.createdAt) + '</div></li>';
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
        window.location.href = CONFIG.apiBase + json.data.downloadUrl;
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
      return;
    }
    if (!session.linkslashAccess) {
      var msg = $('licenseMessage');
      if (msg) msg.textContent = licenseMessage(session);
      showScreen('license');
      return;
    }
    var device = await registerDevice();
    if (!device.ok) {
      showScreen('device');
      return;
    }
    showScreen('app');
    if (state.hasShare) {
      renderSharePreview(state.share);
    } else {
      renderDefaultDashboard();
    }
  }

  async function login() {
    var email = ($('loginEmail') && $('loginEmail').value.trim()) || '';
    var password = ($('loginPassword') && $('loginPassword').value) || '';
    if (!email || !password) {
      setStatus('E-posta ve şifre gerekli', 'err', 'loginStatus');
      return;
    }
    $('loginBtn').disabled = true;
    setStatus('Giriş yapılıyor...', 'info', 'loginStatus');
    try {
      var resp = await fetch(CONFIG.apiBase + '/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      });
      var json = await resp.json();
      if (!resp.ok || !json.success) {
        setStatus(json.error || 'Giriş başarısız', 'err', 'loginStatus');
        return;
      }
      if (json.requires2FA) {
        setStatus('2FA bu mobil uygulamada desteklenmiyor — tarayıcıdan giriş yapın', 'err', 'loginStatus');
        return;
      }
      setStatus('✓ Giriş başarılı', 'ok', 'loginStatus');
      await checkSession();
      await routeAfterSession();
      if (state.hasShare && state.session && state.session.linkslashAccess) {
        setStatus('Paylaşılan içerik hazır — kaydetmek için butona basın', 'info');
      }
    } catch (err) {
      setStatus('Bağlantı hatası: ' + err.message, 'err', 'loginStatus');
    } finally {
      $('loginBtn').disabled = false;
    }
  }

  async function logout() {
    try {
      await fetch(CONFIG.apiBase + '/api/auth/login', { method: 'DELETE', credentials: 'include' });
    } catch (_) {}
    state.session = null;
    showScreen('login');
    setSyncPill();
    setStatus('', '', 'loginStatus');
  }

  async function captureOnline(share) {
    var resp = await fetch(CONFIG.apiBase + '/api/linkslash/capture', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: share.url,
        rawText: share.rawText,
        title: share.title,
        sourceType: share.sourceType,
        sharedFrom: share.sharedFrom,
        client: 'mobile'
      })
    });
    var json = await resp.json();
    if (!resp.ok) {
      var err = new Error(json.error || 'Kaydedilemedi');
      err.code = json.code;
      throw err;
    }
    return json.data;
  }

  async function saveShare() {
    if (!state.share || state.saving) return;
    if (!state.share.url && !state.share.rawText) {
      setStatus('Kaydedilecek URL veya metin bulunamadı', 'err');
      return;
    }

    state.saving = true;
    $('saveBtn').disabled = true;
    setStatus('Kaydediliyor...', 'info');

    try {
      var session = state.session || await checkSession();
      if (!session.authenticated) {
        showScreen('login');
        setStatus('Kaydetmek için giriş yapın', 'info', 'loginStatus');
        return;
      }
      if (!session.linkslashAccess) {
        routeAfterSession();
        return;
      }

      if (!navigator.onLine) {
        LinkSlashOfflineQueue.enqueue(state.share);
        setStatus('İnternet yok — bağlantı gelince kaydedilecek', 'info');
        renderQueue();
        return;
      }

      var result = await captureOnline(state.share);
      LinkSlashOfflineQueue.addRecent({
        id: result.id,
        url: result.url,
        title: result.title,
        sourceType: result.sourceType,
        sharedFrom: state.share.sharedFrom
      });
      setStatus('✓ LinkSlash\'a kaydedildi', 'ok');
      renderRecent();
      try { localStorage.removeItem('linkslash_last_share'); } catch (_) {}
      renderDefaultDashboard();
    } catch (err) {
      if (err.code === 'AUTH_REQUIRED') {
        showScreen('login');
        setStatus('Oturum süresi doldu — tekrar giriş yapın', 'err', 'loginStatus');
        return;
      }
      if (err.code === 'LISANS_YOK' || err.code === 'LISANS_BEKLIYOR') {
        await checkSession();
        routeAfterSession();
        return;
      }
      if (!navigator.onLine || err.message.indexOf('fetch') !== -1) {
        LinkSlashOfflineQueue.enqueue(state.share);
        setStatus('İnternet yok — bağlantı gelince kaydedilecek', 'info');
        renderQueue();
      } else {
        setStatus('Kaydedilemedi: ' + err.message, 'err');
      }
    } finally {
      state.saving = false;
      $('saveBtn').disabled = false;
    }
  }

  async function syncQueue() {
    if (!navigator.onLine) {
      setStatus('Sync için internet gerekli', 'err');
      return;
    }
    var session = await checkSession();
    if (!session.authenticated || !session.linkslashAccess) {
      routeAfterSession();
      return;
    }

    var queue = LinkSlashOfflineQueue.readQueue().filter(function(q) {
      return q.status === 'pending' || q.status === 'error';
    });
    if (!queue.length) {
      setStatus('Bekleyen kayıt yok', 'info');
      return;
    }

    setStatus('Kuyruk senkronize ediliyor...', 'info');
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
    if (!json.success) {
      setStatus(json.error || 'Sync başarısız', 'err');
      return;
    }

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

    setStatus('✓ ' + json.data.synced + ' kayıt senkronize edildi', 'ok');
    renderQueue();
    renderRecent();
  }

  function applySharePayload(payload) {
    state.share = LinkSlashShareParser.parseSharePayload(payload);
    state.hasShare = !!(state.share.url || state.share.rawText);
    renderSharePreview(state.share);
    try { localStorage.setItem('linkslash_last_share', JSON.stringify(payload)); } catch (_) {}
    if (state.screen === 'app') {
      setStatus('Önizleme hazır — kaydetmek için butona basın', 'info');
    }
  }

  window.LinkSlashMobile = {
    onNativeShare: function(payload) {
      applySharePayload(typeof payload === 'string' ? { text: payload } : payload);
      if (state.session && state.session.authenticated && state.session.linkslashAccess) {
        showScreen('app');
      }
    },
    applySharePayload: applySharePayload
  };

  async function bootstrap() {
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
        if (pending && (pending.text || pending.url)) {
          applySharePayload(pending);
          await window.Capacitor.Plugins.ShareReceiver.clearPendingShare();
        }
      } catch (_) {}
    }

    if (!(await checkVersionGate())) return;

    await checkSession();
    await routeAfterSession();

    $('loginBtn').addEventListener('click', login);
    $('logoutBtn').addEventListener('click', logout);
    $('logoutLicenseBtn').addEventListener('click', logout);
    $('logoutDeviceBtn').addEventListener('click', logout);
    $('activateBtn').addEventListener('click', activateCode);
    $('downloadUpdateBtn').addEventListener('click', downloadUpdateApk);
    $('retrySessionBtn').addEventListener('click', async function() {
      await checkSession();
      await routeAfterSession();
    });
    $('retryDeviceBtn').addEventListener('click', async function() {
      await checkSession();
      await routeAfterSession();
    });
    $('saveBtn').addEventListener('click', saveShare);
    $('syncQueueBtn').addEventListener('click', syncQueue);
    $('saveAiKeyBtn').addEventListener('click', saveAiSettings);

    if (navigator.onLine && LinkSlashOfflineQueue.pendingCount() > 0 && state.screen === 'app') {
      syncQueue();
    }
  }

  document.addEventListener('DOMContentLoaded', bootstrap);
})();
