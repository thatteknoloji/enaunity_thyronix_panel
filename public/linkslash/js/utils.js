/**
 * LinkSlash - Yardımcı Fonksiyonlar ve Sabitler
 * Tüm fonksiyonlar ve sabitler global (window) kapsamındadır.
 */

// Python Meta Tag Proxy adresi
var PROXY_URL = '/api/linkslash/proxy';

// ============================================================
// Platform Tanımları
// ============================================================

/**
 * Platform görüntüleme bilgileri.
 * Her platform için isim, emoji ve renk içerir.
 * @type {Object.<string, {name: string, emoji: string, color: string}>}
 */
const PLATFORMS = {
  youtube:   { name: 'YouTube',      emoji: '🎬', color: '#FF0000' },
  instagram: { name: 'Instagram',    emoji: '📸', color: '#E1306C' },
  x:         { name: 'X (Twitter)',   emoji: '🐦', color: '#1DA1F2' },
  tiktok:    { name: 'TikTok',       emoji: '🎵', color: '#00f2ea' },
  reddit:    { name: 'Reddit',       emoji: '🔴', color: '#FF4500' },
  github:    { name: 'GitHub',       emoji: '💻', color: '#6e5494' },
  linkedin:  { name: 'LinkedIn',     emoji: '💼', color: '#0077B5' },
  website:   { name: 'Website',      emoji: '🌐', color: '#6c5ce7' }
};

/**
 * Domain → platform eşleme tablosu.
 * @type {Object.<string, string>}
 */
const DOMAIN_PLATFORM_MAP = {
  'youtube.com':  'youtube',
  'youtu.be':     'youtube',
  'instagram.com':'instagram',
  'twitter.com':  'x',
  'x.com':        'x',
  'tiktok.com':   'tiktok',
  'reddit.com':   'reddit',
  'github.com':   'github',
  'linkedin.com': 'linkedin',
  'medium.com':   'website'
};

// ============================================================
// Varsayılan Kategoriler
// ============================================================

/**
 * Uygulama ilk açıldığında kullanılacak varsayılan odalar (hafıza sarayı).
 * Her oda bir zihinsel mekani temsil eder ve AI linkleri bu aciklamalara gore yerlestirir.
 * @type {Array<{id: string, name: string, emoji: string, color: string, order: number, description: string}>}
 */
const DEFAULT_CATEGORIES = [
  { id: 'spor-salonu', name: 'Spor Salonu',    emoji: '🏋️', color: '#e74c3c', order: 0, description: 'Spor teknikleri, antrenmanlar, fiziksel performans, saglik ve hareket kulturu ile ilgili her sey.' },
  { id: 'savas-odasi', name: 'Savas Odasi',    emoji: '⚔️', color: '#34495e', order: 1, description: 'Taktikler, stratejiler, rekabet, zihinsel savas, karar alma ve mucadele sanatlari.' },
  { id: 'kutuphane',   name: 'Kutuphane',      emoji: '📚', color: '#8e44ad', order: 2, description: 'Uzun makaleler, derin bilgiler, arastirmalar, okunmayi bekleyen kaynaklar ve referanslar.' },
  { id: 'atolye',      name: 'Atolye',         emoji: '🛠️', color: '#f39c12', order: 3, description: 'Araclar, pratik ipuclari, uygulanabilir yontemler, uretim ve elle tutulur teknikler.' },
  { id: 'ai-odasi',    name: 'AI Odasi',       emoji: '🤖', color: '#00bcd4', order: 4, description: 'Yapay zeka, otomasyon, prompt muhendisligi, yazilim araclari ve gelecek teknolojileri.' },
  { id: 'diger',       name: 'Diger',          emoji: '🗃️', color: '#95a5a6', order: 5, description: 'Henuz bir odaya yerlestirilememis, bekleyen veya capraz konulu linkler.' }
];

// ============================================================
// ID Üreteci
// ============================================================

/**
 * Benzersiz bir UUID oluşturur.
 * crypto.randomUUID() destekleniyorsa onu kullanır,
 * aksi halde elle oluşturulmuş bir v4 UUID döndürür.
 * @returns {string} UUID dizesi
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: elle v4 UUID üretimi
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0;
    var v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================
// URL Doğrulayıcı
// ============================================================

/**
 * Verilen metnin geçerli bir URL olup olmadığını kontrol eder.
 * @param {string} str - Doğrulanacak metin
 * @returns {boolean} Geçerli URL ise true
 */
function isValidUrl(str) {
  if (!str || typeof str !== 'string') return false;
  try {
    var url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// ============================================================
// Platform Algılama
// ============================================================

/**
 * URL'den platform anahtarını algılar.
 * @param {string} url - Analiz edilecek URL
 * @returns {string} Platform anahtarı (ör. 'youtube', 'github', 'website')
 */
function detectPlatform(url) {
  if (!url || typeof url !== 'string') return 'website';
  try {
    var hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    // Tam eşleşme kontrolü
    if (DOMAIN_PLATFORM_MAP[hostname]) {
      return DOMAIN_PLATFORM_MAP[hostname];
    }
    // Alt-domain kontrolü (ör. m.youtube.com, old.reddit.com)
    for (var domain in DOMAIN_PLATFORM_MAP) {
      if (hostname.endsWith('.' + domain)) {
        return DOMAIN_PLATFORM_MAP[domain];
      }
    }
    return 'website';
  } catch (_) {
    return 'website';
  }
}

// ============================================================
// Tarih Formatlayıcılar
// ============================================================

/**
 * Tarihi 'GG.AA.YYYY SS:DD' formatında döndürür (Türkçe yerel ayar).
 * @param {Date|string|number} date - Formatlanacak tarih
 * @returns {string} Formatlanmış tarih dizesi
 */
function formatDate(date) {
  try {
    var d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    var day   = String(d.getDate()).padStart(2, '0');
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var year  = d.getFullYear();
    var hours = String(d.getHours()).padStart(2, '0');
    var mins  = String(d.getMinutes()).padStart(2, '0');
    return day + '.' + month + '.' + year + ' ' + hours + ':' + mins;
  } catch (_) {
    return '';
  }
}

/**
 * Tarihi kısa formatta ('GG.AA.YYYY') döndürür.
 * @param {Date|string|number} date - Formatlanacak tarih
 * @returns {string} Kısa formatlanmış tarih dizesi
 */
function formatDateShort(date) {
  try {
    var d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    var day   = String(d.getDate()).padStart(2, '0');
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var year  = d.getFullYear();
    return day + '.' + month + '.' + year;
  } catch (_) {
    return '';
  }
}

/**
 * Görece zaman ifadesi döndürür (Türkçe).
 * Örnekler: 'az önce', '5 dakika önce', '2 saat önce', 'dün', '3 gün önce', '2 hafta önce', '1 ay önce'
 * @param {Date|string|number} date - Karşılaştırılacak tarih
 * @returns {string} Türkçe görece zaman ifadesi
 */
function timeAgo(date) {
  try {
    var d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';

    var now     = new Date();
    var diffMs  = now.getTime() - d.getTime();
    var diffSec = Math.floor(diffMs / 1000);
    var diffMin = Math.floor(diffSec / 60);
    var diffHr  = Math.floor(diffMin / 60);
    var diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60)  return 'az önce';
    if (diffMin < 60)  return diffMin + ' dakika önce';
    if (diffHr < 24)   return diffHr + ' saat önce';
    if (diffDay === 1)  return 'dün';
    if (diffDay < 7)    return diffDay + ' gün önce';
    if (diffDay < 30) {
      var weeks = Math.floor(diffDay / 7);
      return weeks + ' hafta önce';
    }
    if (diffDay < 365) {
      var months = Math.floor(diffDay / 30);
      return months + ' ay önce';
    }
    var years = Math.floor(diffDay / 365);
    return years + ' yıl önce';
  } catch (_) {
    return '';
  }
}

// ============================================================
// Debounce
// ============================================================

/**
 * Standart debounce fonksiyonu.
 * Verilen süre içinde fonksiyon tekrar çağrılırsa zamanlayıcıyı sıfırlar.
 * @param {Function} fn - Geciktirilecek fonksiyon
 * @param {number} ms - Gecikme süresi (milisaniye)
 * @returns {Function} Debounce edilmiş fonksiyon
 */
function debounce(fn, ms) {
  var timer = null;
  return function () {
    var context = this;
    var args = arguments;
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      timer = null;
      fn.apply(context, args);
    }, ms);
  };
}

// ============================================================
// Metin Yardımcıları
// ============================================================

/**
 * Metni belirtilen uzunlukta keser ve '...' ekler.
 * @param {string} text - Kesilecek metin
 * @param {number} [maxLength=100] - Maksimum karakter sayısı
 * @returns {string} Kesilmiş metin
 */
function truncateText(text, maxLength) {
  if (maxLength === undefined) maxLength = 100;
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trimEnd() + '...';
}

/**
 * HTML özel karakterlerini escape eder.
 * XSS ataklarını önlemek için kullanılır.
 * @param {string} str - Escape edilecek metin
 * @returns {string} Güvenli metin
 */
function escapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return str.replace(/[&<>"']/g, function (ch) {
    return map[ch];
  });
}

// ============================================================
// URL Çıkarma
// ============================================================

/**
 * Metinden tüm HTTP/HTTPS URL'lerini çıkarır.
 * @param {string} text - Taranacak metin
 * @returns {string[]} Bulunan URL dizileri
 */
function extractUrls(text) {
  if (!text || typeof text !== 'string') return [];
  var urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  var matches = text.match(urlRegex);
  if (!matches) return [];
  // Sondaki noktalama işaretlerini temizle
  return matches.map(function (url) {
    return url.replace(/[.,;:!?)]+$/, '');
  });
}

/**
 * URL'den domain adını çıkarır ('www.' olmadan).
 * @param {string} url - İşlenecek URL
 * @returns {string} Domain adı veya boş dize
 */
function extractDomain(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    var hostname = new URL(url).hostname.toLowerCase();
    return hostname.replace(/^www\./, '');
  } catch (_) {
    return '';
  }
}

/**
 * CSV hücresi için metni kaçıklar (tırnak, virgül, yeni satır).
 * @param {string} value - Kaçıklanacak değer
 * @returns {string} CSV güvenli değer
 */
function escapeCsv(value) {
  if (value == null) return '""';
  var str = String(value);
  if (str.indexOf(',') !== -1 || str.indexOf('"') !== -1 || str.indexOf('\n') !== -1 || str.indexOf('\r') !== -1) {
    str = '"' + str.replace(/"/g, '""') + '"';
  } else {
    str = '"' + str + '"';
  }
  return str;
}

// ============================================================
// Link Sağlığı Kontrolü
// ============================================================

/**
 * Linklerin erişilebilirliğini proxy üzerinden kontrol eder.
 * @param {string[]} urls - Kontrol edilecek URL listesi
 * @param {function} onProgress - Her sonuç geldiğinde çağrılır (url, status)
 * @returns {Promise<Object[]>} Her URL için {url, status, statusCode, error}
 */
async function checkLinkStatus(urls, onProgress) {
  if (!urls || urls.length === 0) return [];
  try {
    var resp = await fetch(PROXY_URL + '/check-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: urls })
    });
    if (!resp.ok) throw new Error('Proxy hatası: ' + resp.status);
    var data = await resp.json();
    var results = data.results || [];
    if (onProgress) {
      results.forEach(function(r) { onProgress(r.url, r.status, r.statusCode); });
    }
    return results;
  } catch (err) {
    console.error('Link kontrol hatası:', err);
    return urls.map(function(url) {
      return { url: url, status: 'error', statusCode: null, error: err.message };
    });
  }
}

/**
 * Link sağlık durumuna göre emoji döndürür.
 * @param {string} status - 'unknown', 'ok', 'dead', 'error'
 * @returns {string} Durum emojisi
 */
function healthEmoji(status) {
  switch (status) {
    case 'ok':      return '✅';
    case 'dead':    return '💀';
    case 'error':   return '⚠️';
    default:        return '';
  }
}

/**
 * Link sağlık durumuna göre CSS sınıfı döndürür.
 * @param {string} status
 * @returns {string} CSS sınıfı
 */
function healthClass(status) {
  switch (status) {
    case 'ok':      return 'health-ok';
    case 'dead':    return 'health-dead';
    case 'error':   return 'health-error';
    default:        return '';
  }
}

/**
 * Link sağlık durumuna göre açıklama döndürür.
 * @param {string} status
 * @returns {string}
 */
function healthLabel(status) {
  switch (status) {
    case 'ok':      return '✅ Erişilebilir';
    case 'dead':    return '💀 Erişilemiyor';
    case 'error':   return '⚠️ Kontrol hatası';
    default:        return '';
  }
}
