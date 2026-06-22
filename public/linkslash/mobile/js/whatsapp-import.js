/**
 * WhatsApp sohbet içe aktarma — mobil (txt/zip)
 */
var LinkSlashWhatsAppImport = (function() {
  var BATCH_SIZE = 25;

  function inferPackageLabel(sharedFrom) {
    var map = {
      'com.instagram.android': 'Instagram',
      'com.whatsapp': 'WhatsApp',
      'com.google.android.youtube': 'YouTube',
      'com.android.chrome': 'Chrome',
      'com.twitter.android': 'X',
      'com.zhiliaoapp.musically': 'TikTok'
    };
    if (!sharedFrom) return '';
    return map[sharedFrom] || sharedFrom;
  }

  function parseChatText(rawText) {
    if (typeof WhatsAppParser === 'undefined') {
      throw new Error('WhatsAppParser yüklenemedi');
    }
    var parser = new WhatsAppParser();
    return parser.parse(rawText || '');
  }

  function linksToCaptureItems(links, sharedFrom) {
    return (links || []).map(function(link) {
      return {
        url: link.url,
        title: (link.title || link.whatsappContext || link.url || '').slice(0, 200),
        rawText: link.whatsappContext || link.description || '',
        sourceType: link.platform || 'whatsapp',
        sharedFrom: sharedFrom || 'WhatsApp'
      };
    });
  }

  function bookmarkLinksToCaptureItems(links) {
    return (links || []).map(function(link) {
      return {
        url: link.url,
        title: (link.title || link.url || '').slice(0, 200),
        rawText: link.description || '',
        sourceType: link.platform || 'web',
        sharedFrom: link.folder ? 'Bookmarks/' + link.folder : 'Bookmarks'
      };
    });
  }

  function parseBookmarkHtml(html) {
    if (typeof BookmarkParser === 'undefined') {
      throw new Error('BookmarkParser yüklenemedi');
    }
    var parser = new BookmarkParser();
    return parser.parse(html || '');
  }

  async function readFileAsText(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() { resolve(String(reader.result || '')); };
      reader.onerror = function() { reject(new Error('Dosya okunamadı')); };
      reader.readAsText(file, 'UTF-8');
    });
  }

  async function readZipFirstTxt(file) {
    if (typeof JSZip === 'undefined') {
      throw new Error('ZIP desteği yüklenemedi — uygulamayı güncelleyin');
    }
    var zip = await JSZip.loadAsync(file);
    var names = Object.keys(zip.files).filter(function(n) {
      return !zip.files[n].dir && /\.txt$/i.test(n);
    });
    names.sort(function(a, b) {
      var aChat = a.toLowerCase().indexOf('chat') !== -1 ? 0 : 1;
      var bChat = b.toLowerCase().indexOf('chat') !== -1 ? 0 : 1;
      if (aChat !== bChat) return aChat - bChat;
      return a.localeCompare(b);
    });
    if (!names.length) throw new Error('ZIP içinde .txt sohbet dosyası bulunamadı');
    return zip.file(names[0]).async('string');
  }

  async function loadFileContent(file) {
    var name = (file.name || '').toLowerCase();
    if (name.endsWith('.zip') || file.type === 'application/zip') {
      return readZipFirstTxt(file);
    }
    return readFileAsText(file);
  }

  async function captureBatch(apiBase, items, onProgress) {
    var synced = 0;
    var results = [];
    var errors = [];

    for (var i = 0; i < items.length; i += BATCH_SIZE) {
      var chunk = items.slice(i, i + BATCH_SIZE);
      if (onProgress) onProgress(i, items.length, synced);
      var resp = await fetch(apiBase + '/api/linkslash/mobile/capture', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: 'mobile', items: chunk })
      });
      var json = await resp.json();
      if (!resp.ok || !json.success) {
        throw new Error(json.error || 'Toplu kayıt başarısız');
      }
      synced += json.data.synced || 0;
      results = results.concat(json.data.results || []);
      errors = errors.concat(json.data.errors || []);
    }

    return { synced: synced, results: results, errors: errors };
  }

  return {
    inferPackageLabel: inferPackageLabel,
    parseChatText: parseChatText,
    parseBookmarkHtml: parseBookmarkHtml,
    linksToCaptureItems: linksToCaptureItems,
    bookmarkLinksToCaptureItems: bookmarkLinksToCaptureItems,
    loadFileContent: loadFileContent,
    captureBatch: captureBatch
  };
})();

if (typeof window !== 'undefined') window.LinkSlashWhatsAppImport = LinkSlashWhatsAppImport;
