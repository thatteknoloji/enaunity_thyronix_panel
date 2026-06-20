/**
 * LinkSlash - WhatsApp Sohbet Dışa Aktarma Ayrıştırıcısı
 * Android TR, Android EN ve iOS formatlarını destekler.
 * Global (window) kapsamında kullanılır.
 */

/**
 * WhatsApp sohbet dışa aktarma dosyalarını ayrıştırır.
 * Mesajları ve içerdikleri linkleri çıkarır.
 */
class WhatsAppParser {

  constructor() {
    /**
     * Her format için regex desenleri.
     * @private
     */
    this._patterns = {
      // Android TR: 25.12.2024, 14:30 - Ali: mesaj
      // veya:       25.12.2024 14:30 - Ali: mesaj
      'android-tr': /^(\d{1,2}\.\d{1,2}\.\d{2,4}),?\s(\d{1,2}:\d{2})\s-\s(.*?):\s([\s\S]*)$/,

      // Android EN: 12/25/2024, 2:30 PM - Ali: message
      // veya:       12/25/24, 14:30 - Ali: message
      'android-en': /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s(\d{1,2}:\d{2}(?:\s?[APap][Mm])?)\s-\s(.*?):\s([\s\S]*)$/,

      // iOS: [25.12.2024, 14:30:45] Ali: mesaj
      // veya: [12/25/24, 2:30:45 PM] Ali: message
      'ios': /^\[(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}),?\s(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap][Mm])?)\]\s(.*?):\s([\s\S]*)$/
    };

    /**
     * Sistem mesajlarını algılama desenleri.
     * @private
     */
    this._systemPatterns = [
      /end-to-end encrypted/i,
      /uçtan uca şifreleme/i,
      /uçtan uca şifrelenmiş/i,
      /mesajlar.+şifrelenir/i,
      /messages.+encrypted/i,
      /grub.+oluştur/i,
      /group.+created/i,
      /ekledi$/i,
      /added$/i,
      /çıkardı$/i,
      /removed$/i,
      /ayrıldı$/i,
      /left$/i,
      /grubu?n?.+adını.+değiştirdi/i,
      /changed.+subject/i,
      /changed.+icon/i,
      /simgesini.+değiştirdi/i,
      /güvenlik.+kodu.+değişti/i,
      /security.+code.+changed/i,
      /numarasını.+değiştirdi/i,
      /changed.+number/i,
      /kaybolan.+mesaj/i,
      /disappearing.+messages/i,
      /bir.+anket.+oluşturdu/i,
      /pinned.+a.+message/i,
      /mesajı.+sabitledi/i,
      /^bu.+grubun.+açıklamasını/i,
      /^you.+now.+admin/i,
      /yönetici.+yaptı/i,
      /sohbet.+şifreli/i,
      /calls.+encrypted/i,
      /aramalar.+şifreli/i,
      /telefon.+numaran/i,
      /phone.+number/i,
      /görüntülü.+arama/i,
      /video.+call/i,
      /sesli.+arama/i,
      /voice.+call/i,
      /aramanız/i,
      /your call/i,
      /~$/i
    ];

    /**
     * Atlanacak medya/dosya desenleri.
     * @private
     */
    this._mediaPatterns = [
      /\<medya dahil edilmedi\>/i,
      /\<media omitted\>/i,
      /\<görüntü dahil edilmedi\>/i,
      /\<image omitted\>/i,
      /\<video dahil edilmedi\>/i,
      /\<video omitted\>/i,
      /\<ses dahil edilmedi\>/i,
      /\<audio omitted\>/i,
      /\<belge dahil edilmedi\>/i,
      /\<document omitted\>/i,
      /\<çıkartma dahil edilmedi\>/i,
      /\<sticker omitted\>/i,
      /\<gif dahil edilmedi\>/i,
      /\<gif omitted\>/i,
      /\<kişi kartı dahil edilmedi\>/i,
      /\<contact card omitted\>/i
    ];
  }

  // ============================================================
  // Ana Ayrıştırma Metodu
  // ============================================================

  /**
   * WhatsApp sohbet dışa aktarma metnini ayrıştırır.
   * @param {string} rawText - Ham sohbet metni
   * @returns {{
   *   messages: Array<{date: Date, sender: string, text: string}>,
   *   links: Array<{url: string, platform: string, dateOriginal: string, whatsappContext: string, sender: string}>,
   *   format: string,
   *   stats: {totalMessages: number, totalLinks: number}
   * }}
   */
  parse(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return {
        messages: [],
        links: [],
        format: 'unknown',
        stats: { totalMessages: 0, totalLinks: 0, totalLines: 0, skippedLines: 0 }
      };
    }

    // BOM karakterini temizle
    rawText = rawText.replace(/^\uFEFF/, '');

    // 1. Formatı algıla
    var format = this._detectFormat(rawText);

    // 2. Satırlara böl
    var lines = rawText.split(/\r?\n/);

    // 3. Çok satırlı mesajları grupla
    var grouped = this._groupMultilineMessages(lines, format);

    // 4. Her mesajı ayrıştır
    var messages = [];
    var pattern = this._patterns[format];
    var skipped = 0;

    for (var i = 0; i < grouped.length; i++) {
      var line = grouped[i];
      if (!line || !line.trim()) continue;

      var match = line.match(pattern);
      if (!match) { skipped++; continue; }

      var dateStr  = match[1];
      var timeStr  = match[2];
      var sender   = match[3].trim();
      var text     = match[4];

      // Sistem mesajlarını atla
      if (this._isSystemMessage(line)) { skipped++; continue; }

      // Medya mesajlarını atla
      if (this._isMediaMessage(text)) { skipped++; continue; }

      // Boş mesajları atla
      if (!text || !text.trim()) { skipped++; continue; }

      var parsedDate = this._parseDate(dateStr, timeStr, format);

      messages.push({
        date: parsedDate,
        sender: sender,
        text: text.trim()
      });
    }

    // 5. Mesajlardan linkleri çıkar
    var links = this._extractLinksFromMessages(messages);

    return {
      messages: messages,
      links: links,
      format: format,
      stats: {
        totalMessages: messages.length,
        totalLinks: links.length,
        totalLines: lines.length,
        skippedLines: skipped
      }
    };
  }

  // ============================================================
  // Format Algılama
  // ============================================================

  /**
   * Metnin ilk birkaç satırını inceleyerek format türünü belirler.
   * @private
   * @param {string} text - Ham sohbet metni
   * @returns {'android-tr'|'android-en'|'ios'} Format türü
   */
  _detectFormat(text) {
    // İlk 20 satırı kontrol et
    var firstLines = text.split(/\r?\n/).slice(0, 20);

    for (var i = 0; i < firstLines.length; i++) {
      var line = firstLines[i].trim();
      if (!line) continue;

      // iOS formatı: köşeli parantez ile başlar
      if (/^\[/.test(line)) {
        return 'ios';
      }

      // Türkçe format: tarihte nokta kullanılır (dd.mm.yyyy)
      if (/^\d{1,2}\.\d{1,2}\.\d{2,4}/.test(line)) {
        return 'android-tr';
      }

      // İngilizce format: tarihte slash kullanılır (mm/dd/yyyy)
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line)) {
        return 'android-en';
      }
    }

    // Varsayılan
    return 'android-tr';
  }

  // ============================================================
  // Çok Satırlı Mesaj Gruplama
  // ============================================================

  /**
   * Zaman damgası olmayan satırları önceki mesaja ekler.
   * @private
   * @param {string[]} lines - Metin satırları
   * @param {string} format - Algılanan format türü
   * @returns {string[]} Gruplanmış satırlar
   */
  _groupMultilineMessages(lines, format) {
    var result = [];
    var timestampPatterns = {
      'android-tr': /^\d{1,2}\.\d{1,2}\.\d{2,4},?\s\d{1,2}:\d{2}\s-\s/,
      'android-en': /^\d{1,2}\/\d{1,2}\/\d{2,4},?\s\d{1,2}:\d{2}(?:\s?[APap][Mm])?/,
      'ios': /^\[\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/
    };

    var tsPattern = timestampPatterns[format] || timestampPatterns['android-tr'];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line.trim()) continue;

      if (tsPattern.test(line)) {
        // Yeni mesaj satırı
        result.push(line);
      } else if (result.length > 0) {
        // Devam satırı: önceki mesaja ekle (URL satır devamıysa boşluk koy)
        var glue = (line.length > 0 && line[0] !== ' ') ? ' ' : '';
        result[result.length - 1] += glue + line;
      }
    }

    return result;
  }

  // ============================================================
  // Tarih Ayrıştırma
  // ============================================================

  /**
   * Tarih ve saat dizelerini Date nesnesine çevirir.
   * @private
   * @param {string} dateStr - Tarih dizesi (ör. '25.12.2024', '12/25/24')
   * @param {string} timeStr - Saat dizesi (ör. '14:30', '2:30 PM')
   * @param {string} format - Format türü
   * @returns {Date} Ayrıştırılmış tarih
   */
  _parseDate(dateStr, timeStr, format) {
    try {
      var day, month, year;

      if (format === 'android-tr') {
        // GG.AA.YYYY
        var parts = dateStr.split('.');
        day   = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year  = parseInt(parts[2], 10);
      } else if (format === 'android-en') {
        // AA/GG/YYYY
        var parts2 = dateStr.split('/');
        month = parseInt(parts2[0], 10) - 1;
        day   = parseInt(parts2[1], 10);
        year  = parseInt(parts2[2], 10);
      } else {
        // iOS: çeşitli ayırıcılar olabilir
        var parts3 = dateStr.split(/[\/.\-]/);
        // İlk kısmın gün mü ay mı olduğunu tahmin et
        var first  = parseInt(parts3[0], 10);
        var second = parseInt(parts3[1], 10);

        if (first > 12) {
          // GG.AA.YYYY
          day   = first;
          month = second - 1;
        } else if (second > 12) {
          // AA/GG/YYYY
          month = first - 1;
          day   = second;
        } else {
          // Belirsiz - Türkçe formatı varsay (GG.AA)
          day   = first;
          month = second - 1;
        }
        year = parseInt(parts3[2], 10);
      }

      // 2 basamaklı yılları dönüştür
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }

      // Saati ayrıştır
      var timeParts = this._parseTime(timeStr);

      return new Date(year, month, day, timeParts.hours, timeParts.minutes, timeParts.seconds || 0);
    } catch (e) {
      console.warn('[WhatsAppParser] Tarih ayrıştırma hatası:', dateStr, timeStr, e);
      return new Date();
    }
  }

  /**
   * Saat dizesini ayrıştırır (12 ve 24 saat formatları).
   * @private
   * @param {string} timeStr - Saat dizesi
   * @returns {{hours: number, minutes: number, seconds: number}}
   */
  _parseTime(timeStr) {
    var cleaned = timeStr.trim();
    var isPM = /pm/i.test(cleaned);
    var isAM = /am/i.test(cleaned);

    // AM/PM ve diğer metin parçalarını temizle
    cleaned = cleaned.replace(/\s?[APap][Mm]/g, '').trim();

    var parts = cleaned.split(':');
    var hours   = parseInt(parts[0], 10);
    var minutes = parseInt(parts[1], 10) || 0;
    var seconds = parseInt(parts[2], 10) || 0;

    // 12 saat formatı dönüşümü
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    return { hours: hours, minutes: minutes, seconds: seconds };
  }

  // ============================================================
  // Mesaj Türü Kontrolü
  // ============================================================

  /**
   * Satırın bir sistem mesajı olup olmadığını kontrol eder.
   * Sistem mesajları (grup oluşturma, üye ekleme, şifreleme bildirimi vb.) atlanır.
   * @private
   * @param {string} text - Mesaj metni
   * @returns {boolean} Sistem mesajı ise true
   */
  _isSystemMessage(text) {
    if (!text) return false;

    // Gönderici ayrıştırılamadıysa (regex'te ':' yoksa) sistem mesajı olabilir
    // Ancak bu kontrol regex eşleşmesi sonrası yapılacağı için
    // burada içerik bazlı kontrol yapmak yeterli

    for (var i = 0; i < this._systemPatterns.length; i++) {
      if (this._systemPatterns[i].test(text)) return true;
    }

    return false;
  }

  /**
   * Mesajın medya dosyası bildirim mesajı olup olmadığını kontrol eder.
   * @private
   * @param {string} text - Mesaj metni
   * @returns {boolean} Medya bildirimi ise true
   */
  _isMediaMessage(text) {
    if (!text) return false;

    for (var i = 0; i < this._mediaPatterns.length; i++) {
      if (this._mediaPatterns[i].test(text)) return true;
    }

    return false;
  }

  // ============================================================
  // Link Çıkarma
  // ============================================================

  /**
   * Ayrıştırılmış mesajlardan URL'leri çıkarır ve ParsedLink nesnelerine dönüştürür.
   * @private
   * @param {Array<{date: Date, sender: string, text: string}>} messages - Ayrıştırılmış mesajlar
   * @returns {Array<{url: string, platform: string, dateOriginal: string, whatsappContext: string, sender: string}>}
   */
  _extractLinksFromMessages(messages) {
    var links = [];
    var seenUrls = {};

    for (var i = 0; i < messages.length; i++) {
      var msg = messages[i];
      var urls = extractUrls(msg.text);

      for (var j = 0; j < urls.length; j++) {
        var url = urls[j];

        // Geçerli URL kontrolü
        if (!isValidUrl(url)) continue;

        // Tekrar eden URL'leri atla (aynı URL birden fazla mesajda olabilir)
        var normalizedUrl = url.toLowerCase().replace(/\/+$/, '').replace(/^https:\/\//, 'http://').replace(/^http:\/\/www\./, 'http://');
        if (seenUrls[normalizedUrl]) continue;
        seenUrls[normalizedUrl] = true;

        var dateStr;
        try {
          dateStr = msg.date instanceof Date ? msg.date.toISOString() : new Date(msg.date).toISOString();
        } catch (_) {
          dateStr = new Date().toISOString();
        }

        links.push({
          url: url,
          platform: detectPlatform(url),
          dateOriginal: dateStr,
          whatsappContext: truncateText(msg.text, 500),
          sender: msg.sender
        });
      }
    }

    return links;
  }
}

// ============================================================
// HTML Bookmark / Yer İmi Ayrıştırıcısı
// ============================================================

/**
 * Netscape HTML bookmark formatını ayrıştırır (Chrome, Firefox, Pocket).
 * <DT><A HREF="url" ADD_DATE="timestamp" TAGS="tag1,tag2">Title</A>
 */
class BookmarkParser {

  /**
   * HTML bookmark dosyasını ayrıştırır.
   * @param {string} html - HTML bookmark içeriği
   * @returns {{
   *   links: Array<{url: string, title: string, description: string, platform: string, tags: string[], folder: string, dateOriginal: string}>,
   *   stats: {totalLinks: number, folders: string[]}
   * }}
   */
  parse(html) {
    if (!html || typeof html !== 'string') {
      return { links: [], stats: { totalLinks: 0, folders: [] } };
    }

    // Etkin klasör takibi için DL/DT hiyerarşisini kullan
    var folderStack = [];
    var links = [];
    var folders = new Set();
    var seenUrls = {};

    // Tüm <A> tag'lerini bul
    var linkRegex = /<A\s[^>]*HREF\s*=\s*"([^"]*)"([^>]*)>([\s\S]*?)<\/A\s*>/gi;
    var match;

    while ((match = linkRegex.exec(html)) !== null) {
      var url = match[1].trim();
      var attrs = match[2];
      var title = match[3].trim();

      if (!url || url === '' || url.startsWith('place:') || url.startsWith('chrome://')) continue;

      // Geçerli HTTP URL mi?
      if (!url.match(/^https?:\/\//i)) continue;

      // Normalize et
      var normalizedUrl = url.toLowerCase().replace(/\/+$/, '').replace(/^https:\/\//, 'http://').replace(/^http:\/\/www\./, 'http://');
      if (seenUrls[normalizedUrl]) continue;
      seenUrls[normalizedUrl] = true;

      // ADD_DATE
      var addDate = '';
      var dateMatch = attrs.match(/ADD_DATE\s*=\s*"(\d+)"/i);
      if (dateMatch) {
        var ts = parseInt(dateMatch[1], 10);
        if (!isNaN(ts) && ts > 0) {
          addDate = new Date(ts * 1000).toISOString();
        }
      }

      // TAGS
      var tags = [];
      var tagsMatch = attrs.match(/TAGS\s*=\s*"([^"]*)"/i);
      if (tagsMatch && tagsMatch[1].trim()) {
        tags = tagsMatch[1].split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t; });
      }

      // En yakın H3 klasörünü bul (HTML'de geriye doğru tarama)
      var beforeLink = html.substring(0, match.index);
      var lastH3 = beforeLink.lastIndexOf('<H3');
      var folder = '';
      if (lastH3 !== -1) {
        var h3Match = beforeLink.substring(lastH3).match(/<H3[^>]*>(.*?)<\/H3\s*>/i);
        if (h3Match) {
          folder = h3Match[1].trim();
        }
      }
      if (folder) folders.add(folder);

      // <DD> açıklamasını bul (linkten sonraki ilk <DD>)
      var description = '';
      var afterLink = html.substring(match.index + match[0].length);
      var ddMatch = afterLink.match(/^\s*<DD>([\s\S]*?)<\/DD\s*>/i);
      if (ddMatch) {
        description = ddMatch[1].trim();
      }

      links.push({
        url: url,
        title: title || extractDomain(url),
        description: description,
        platform: detectPlatform(url),
        tags: tags,
        folder: folder,
        dateOriginal: addDate || new Date().toISOString()
      });
    }

    return {
      links: links,
      stats: {
        totalLinks: links.length,
        folders: Array.from(folders)
      }
    };
  }
}
