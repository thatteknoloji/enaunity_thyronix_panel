/**
 * LinkSlash Extension — ENAUNITY API istemcisi
 */
var LinkSlashApi = (function() {
  var activeOrigin = null;

  function origins() {
    return LINKSLASH_CONFIG.origins.slice();
  }

  async function resolveOrigin() {
    if (activeOrigin) return activeOrigin;

    try {
      var stored = await chrome.storage.sync.get(['linkslashOrigin']);
      if (stored.linkslashOrigin) {
        origins().unshift(stored.linkslashOrigin);
      }
    } catch (_) {}

    for (var i = 0; i < origins().length; i++) {
      var origin = origins()[i];
      try {
        var resp = await fetch(origin + '/api/linkslash/session', {
          credentials: 'include',
          signal: AbortSignal.timeout(5000)
        });
        if (resp.ok) {
          activeOrigin = origin;
          try { await chrome.storage.sync.set({ linkslashOrigin: origin }); } catch (_) {}
          return origin;
        }
      } catch (_) {}
    }

    activeOrigin = LINKSLASH_CONFIG.preferredOrigin;
    return activeOrigin;
  }

  async function getSession() {
    var origin = await resolveOrigin();
    var resp = await fetch(origin + '/api/linkslash/session', {
      credentials: 'include',
      signal: AbortSignal.timeout(8000)
    });
    if (!resp.ok) throw new Error('Sunucuya bağlanılamadı');
    return resp.json();
  }

  async function fetchMeta(url) {
    var origin = await resolveOrigin();
    var resp = await fetch(
      origin + '/api/linkslash/proxy/fetch?url=' + encodeURIComponent(url),
      { credentials: 'include', signal: AbortSignal.timeout(12000) }
    );
    if (!resp.ok) return null;
    return resp.json();
  }

  function detectSourceType(url) {
    if (!url) return 'other';
    var lower = url.toLowerCase();
    if (lower.includes('github.com')) return 'github';
    if (lower.includes('x.com/') || lower.includes('twitter.com/')) return 'tweet';
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'video';
    if (lower.includes('reddit.com')) return lower.includes('/comments/') ? 'article' : 'social';
    if (lower.includes('medium.com') || lower.includes('substack.com')) return 'article';
    if (lower.includes('instagram.com') || lower.includes('linkedin.com')) return 'social';
    if (lower.includes('/product') || lower.includes('/dp/') || lower.includes('trendyol.com') || lower.includes('hepsiburada.com')) return 'product';
    return 'other';
  }

  function extractDomain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (_) { return ''; }
  }

  async function captureLink(payload) {
    var origin = await resolveOrigin();
    var resp = await fetch(origin + '/api/linkslash/capture', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000)
    });
    var data = await resp.json().catch(function() { return {}; });
    if (!resp.ok) {
      var err = new Error(data.error || 'Kaydedilemedi');
      err.code = data.code || 'CAPTURE_FAILED';
      err.status = resp.status;
      throw err;
    }
    return data;
  }

  async function captureFromTab(tab, options) {
    options = options || {};
    var url = options.url || tab.url;
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      throw new Error('Bu sayfa kaydedilemez');
    }

    var session = await getSession();
    if (!session.authenticated) {
      var loginErr = new Error('Giriş yapmanız gerekiyor');
      loginErr.code = 'AUTH_REQUIRED';
      loginErr.loginUrl = (await resolveOrigin()) + LINKSLASH_CONFIG.loginPath + '?redirect=' + encodeURIComponent(LINKSLASH_CONFIG.appPath);
      throw loginErr;
    }
    if (!session.linkslashAccess) {
      var licErr = new Error(session.accessCode === 'LISANS_YOK' ? 'LinkSlash lisansı gerekli' : 'LinkSlash erişimi yok');
      licErr.code = session.accessCode || 'NO_ACCESS';
      licErr.gatewayUrl = (await resolveOrigin()) + LINKSLASH_CONFIG.gatewayPath;
      throw licErr;
    }

    var title = options.title || tab.title || '';
    var description = options.description || '';
    var image = options.image || '';
    var favicon = options.favicon || '';
    var domain = extractDomain(url);
    var sourceType = detectSourceType(url);

    if (!options.skipMeta) {
      try {
        var meta = await fetchMeta(url);
        if (meta) {
          if (!title && meta.title) title = meta.title;
          if (!description && meta.description) description = meta.description;
          if (!image && meta.image) image = meta.image;
          if (!favicon && meta.favicon) favicon = meta.favicon;
        }
      } catch (_) {}
    }

    return captureLink({
      url: url,
      title: title,
      description: description,
      image: image,
      favicon: favicon,
      domain: domain,
      sourceType: sourceType,
      tags: options.tags || []
    });
  }

  return {
    resolveOrigin: resolveOrigin,
    getSession: getSession,
    fetchMeta: fetchMeta,
    captureLink: captureLink,
    captureFromTab: captureFromTab,
    detectSourceType: detectSourceType,
    extractDomain: extractDomain
  };
})();
