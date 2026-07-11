var currentTab = null;
var pageMeta = { title: '', description: '', image: '', domain: '', sourceType: 'other', tags: [] };
var sessionInfo = null;

document.addEventListener('DOMContentLoaded', async function() {
  var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  document.getElementById('urlDisplay').textContent = currentTab.url || '(bilinmiyor)';
  document.getElementById('saveBtn').addEventListener('click', onSaveClick);
  document.getElementById('openAppBtn').addEventListener('click', openLinkSlashApp);

  await bootstrap();
});

async function bootstrap() {
  setStatus('Sayfa bilgisi alınıyor...', 'info');
  document.getElementById('saveBtn').disabled = true;

  try {
    sessionInfo = await LinkSlashApi.getSession();
    if (!sessionInfo.authenticated) {
      showAuthBox('Giriş yapmanız gerekiyor. Kaydetmek için ENAUNITY hesabınıza giriş yapın.');
      setStatus('Oturum yok', 'err');
      document.getElementById('saveBtn').textContent = '🔐 Giriş Yap';
      document.getElementById('saveBtn').disabled = false;
      return;
    }
    if (!sessionInfo.linkslashAccess) {
      var msg = sessionInfo.accessCode === 'LISANS_YOK'
        ? 'LinkSlash lisansınız yok. Lisans satın alın veya yöneticinize başvurun.'
        : 'LinkSlash erişiminiz henüz aktif değil.';
      showAuthBox(msg);
      setStatus('Lisans gerekli', 'err');
      document.getElementById('saveBtn').textContent = '🛒 Lisans Al';
      document.getElementById('saveBtn').disabled = false;
      return;
    }

    hideAuthBox();
    document.getElementById('openAppBtn').style.display = 'block';
    await loadPagePreview();
    document.getElementById('saveBtn').disabled = false;
    setStatus('Tek tıkla kaydetmeye hazır', 'info');
  } catch (err) {
    showAuthBox('ENAUNITY sunucusuna bağlanılamadı. İnternet bağlantınızı kontrol edin.');
    setStatus('Bağlantı hatası', 'err');
    document.getElementById('saveBtn').disabled = true;
  }
}

async function loadPagePreview() {
  var url = currentTab.url || '';
  pageMeta.domain = LinkSlashApi.extractDomain(url);
  pageMeta.sourceType = LinkSlashApi.detectSourceType(url);
  pageMeta.title = currentTab.title || pageMeta.domain || url;
  pageMeta.tags = [pageMeta.sourceType, pageMeta.domain].filter(Boolean);

  document.getElementById('titleDisplay').textContent = pageMeta.title;
  document.getElementById('domainDisplay').textContent = pageMeta.domain || '—';
  document.getElementById('sourceDisplay').textContent = formatSourceType(pageMeta.sourceType);
  renderTags(pageMeta.tags);

  try {
    var meta = await LinkSlashApi.fetchMeta(url);
    if (meta) {
      if (meta.title) {
        pageMeta.title = meta.title;
        document.getElementById('titleDisplay').textContent = meta.title;
      }
      if (meta.description) pageMeta.description = meta.description;
      if (meta.image) {
        pageMeta.image = meta.image;
        var img = document.getElementById('previewImg');
        img.src = meta.image;
        img.style.display = 'block';
      }
    }
  } catch (_) {}
}

async function onSaveClick() {
  if (!sessionInfo || !sessionInfo.authenticated) {
    var origin = await LinkSlashApi.resolveOrigin();
    chrome.tabs.create({ url: LINKSLASH_CONFIG.getLoginUrl(origin, LINKSLASH_CONFIG.appPath) });
    return;
  }
  if (!sessionInfo.linkslashAccess) {
    var origin2 = await LinkSlashApi.resolveOrigin();
    var dest = sessionInfo.accessCode === 'LISANS_YOK'
      ? origin2 + '/payment/checkout?type=module&moduleKey=LINKSLASH&planKey=starter'
      : origin2 + LINKSLASH_CONFIG.gatewayPath;
    chrome.tabs.create({ url: dest });
    return;
  }

  var btn = document.getElementById('saveBtn');
  btn.disabled = true;
  setStatus('Kaydediliyor...', 'info');

  try {
    var result = await LinkSlashApi.captureFromTab(currentTab, {
      title: pageMeta.title,
      description: pageMeta.description,
      image: pageMeta.image,
      tags: pageMeta.tags,
      skipMeta: true
    });

    if (result.data && result.data.tags) {
      renderTags(result.data.tags);
    }

    setStatus('✓ Kaydedildi! LinkSlash\'ta görünecek.', 'ok');
    btn.textContent = '✓ Kaydedildi';
    setTimeout(window.close, 1500);
  } catch (err) {
    if (err.code === 'AUTH_REQUIRED') {
      chrome.tabs.create({ url: err.loginUrl });
      setStatus('Giriş yapmanız gerekiyor', 'err');
    } else if (err.code === 'LISANS_YOK' || err.code === 'NO_ACCESS') {
      chrome.tabs.create({ url: err.gatewayUrl || (await LinkSlashApi.resolveOrigin()) + LINKSLASH_CONFIG.gatewayPath });
      setStatus(err.message, 'err');
    } else {
      setStatus('✗ Kaydedilemedi: ' + (err.message || 'Bilinmeyen hata'), 'err');
    }
    btn.disabled = false;
  }
}

async function openLinkSlashApp() {
  var origin = await LinkSlashApi.resolveOrigin();
  chrome.tabs.create({ url: origin + LINKSLASH_CONFIG.appPath });
}

function renderTags(tags) {
  var el = document.getElementById('tagsDisplay');
  el.innerHTML = (tags || []).map(function(t) {
    return '<span class="tag">' + escapeHtml(t) + '</span>';
  }).join('');
}

function formatSourceType(type) {
  var map = {
    tweet: 'Tweet / X',
    video: 'Video',
    article: 'Makale',
    product: 'Ürün',
    social: 'Sosyal',
    github: 'GitHub',
    other: 'Web'
  };
  return map[type] || type;
}

function setStatus(text, cls) {
  var el = document.getElementById('status');
  el.textContent = text;
  el.className = 'status' + (cls ? ' ' + cls : '');
}

function showAuthBox(text) {
  var el = document.getElementById('authBox');
  el.textContent = text;
  el.style.display = 'block';
}

function hideAuthBox() {
  document.getElementById('authBox').style.display = 'none';
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
