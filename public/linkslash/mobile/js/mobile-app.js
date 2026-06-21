/**
 * LinkSlash Mobile App — Android share target shell
 */
(function() {
  var state = {
    session: null,
    share: null,
    online: navigator.onLine,
    saving: false
  };

  var CONFIG = {
    apiBase: window.LINKSLASH_API_BASE || '',
    appUrl: '/dealer/linkslash',
    settingsUrl: '/dealer/linkslash',
    gatewayUrl: '/gateway/linkslash',
    downloadsUrl: '/linkslash/downloads',
    loginUrl: '/auth/login?redirect=/linkslash/mobile/'
  };

  function $(id) { return document.getElementById(id); }

  function setStatus(text, type) {
    var el = $('statusMsg');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'status-msg' + (type ? ' ' + type : '');
  }

  function setSyncPill() {
    var pill = $('syncPill');
    if (!pill) return;
    if (!state.online) {
      pill.textContent = 'Offline';
      pill.className = 'sync-pill offline';
    } else if (state.session && state.session.linkslashAccess) {
      pill.textContent = 'Online';
      pill.className = 'sync-pill online';
    } else {
      pill.textContent = 'Giriş gerekli';
      pill.className = 'sync-pill';
    }
  }

  function renderSharePreview(share) {
    $('shareTitle').textContent = share.title || 'Paylaşılan içerik';
    $('shareUrl').textContent = share.url || share.rawText || 'URL bulunamadı';
    $('shareMeta').textContent = 'Kaynak: ' + (share.sourceLabel || share.sourceType) +
      (share.sharedFrom ? ' · ' + share.sharedFrom : '');
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
    if (status) { status.textContent = '✓ Anahtar kaydedildi — web uygulaması ile paylaşılır'; status.className = 'ai-status ok'; }
    updateAiBadge();
  }

  async function checkSession() {
    var resp = await fetch(CONFIG.apiBase + '/api/linkslash/session', { credentials: 'include' });
    var json = await resp.json();
    state.session = json;
    setSyncPill();
    return json;
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
        window.location.href = CONFIG.apiBase + CONFIG.loginUrl;
        return;
      }
      if (!session.linkslashAccess) {
        window.location.href = CONFIG.apiBase + (session.accessCode === 'LISANS_YOK'
          ? '/payment/checkout?type=module&moduleKey=LINKSLASH&planKey=starter'
          : CONFIG.gatewayUrl);
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
      setStatus('✓ LinkSlash\'a kaydedildi · sunucu AI analizi arka planda çalışıyor', 'ok');
      renderRecent();
    } catch (err) {
      if (err.code === 'AUTH_REQUIRED') {
        window.location.href = CONFIG.apiBase + CONFIG.loginUrl;
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
      setStatus('Sync için giriş ve lisans gerekli', 'err');
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
    renderSharePreview(state.share);
    try { localStorage.setItem('linkslash_last_share', JSON.stringify(payload)); } catch (_) {}
    setStatus('Önizleme hazır — kaydetmek için butona basın', 'info');
  }

  window.LinkSlashMobile = {
    onNativeShare: function(payload) {
      applySharePayload(typeof payload === 'string' ? { text: payload } : payload);
    },
    applySharePayload: applySharePayload
  };

  async function bootstrap() {
    window.addEventListener('online', function() {
      state.online = true;
      setSyncPill();
      syncQueue();
    });
    window.addEventListener('offline', function() {
      state.online = false;
      setSyncPill();
    });

    loadAiSettings();
    await checkSession();
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

    $('saveBtn').addEventListener('click', saveShare);
    $('syncQueueBtn').addEventListener('click', syncQueue);
    $('saveAiKeyBtn').addEventListener('click', saveAiSettings);
    $('openAppBtn').addEventListener('click', function() {
      window.location.href = CONFIG.apiBase + CONFIG.appUrl;
    });
    $('openSettingsBtn').addEventListener('click', function() {
      window.location.href = CONFIG.apiBase + CONFIG.settingsUrl;
    });
    $('openGatewayBtn').addEventListener('click', function() {
      window.location.href = CONFIG.apiBase + CONFIG.gatewayUrl;
    });
    $('openDownloadsBtn').addEventListener('click', function() {
      window.location.href = CONFIG.apiBase + CONFIG.downloadsUrl;
    });
    $('authBtn').addEventListener('click', function() {
      if (state.session && state.session.authenticated) {
        window.location.href = CONFIG.apiBase + CONFIG.appUrl;
      } else {
        window.location.href = CONFIG.apiBase + CONFIG.loginUrl;
      }
    });
    $('retryShareBtn').addEventListener('click', function() {
      if (state.share) saveShare();
      else setStatus('Paylaşım verisi yok — Android paylaşım menüsünü kullanın', 'err');
    });

    if (navigator.onLine && LinkSlashOfflineQueue.pendingCount() > 0) {
      syncQueue();
    }
  }

  document.addEventListener('DOMContentLoaded', bootstrap);
})();
