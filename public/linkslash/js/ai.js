/**
 * LinkSlash - AI Entegrasyonu
 * Linkleri yapay zeka ile kategorize etmek için Groq ve Ollama desteği.
 * Global (window) kapsamında kullanılır.
 */

/**
 * Temel AI sınıfı. Prompt oluşturma ve yanıt ayrıştırma ortaktır.
 * Alt sınıflar sadece API çağrısını farklı implemente eder.
 */
class BaseAI {
  constructor() {
    this.batchSize = 12;
    this.requestDelay = 1500;
    this._lastRequestTime = 0;
    this._requestQueue = Promise.resolve();
  }

  _enqueue(requestFn) {
    var self = this;
    var prev = this._requestQueue;
    this._requestQueue = new Promise(function(resolve) {
      prev.then(resolve, resolve);
    }).then(function() {
      var now = Date.now();
      var elapsed = now - (self._lastRequestTime || 0);
      var wait = Math.max(0, self.requestDelay - elapsed);
      return new Promise(function(resolve) {
        setTimeout(function() {
          self._lastRequestTime = Date.now();
          resolve();
        }, wait);
      });
    }).then(function() {
      return requestFn().then(function(result) {
        return result;
      });
    });
    return this._requestQueue;
  }

  /**
   * Linkleri AI ile toplu olarak kategorize eder.
   * @param {Array} links - Kategorize edilecek linkler
   * @param {Array} categories - Mevcut kategoriler
   * @param {Object} options - Ek seçenekler {generateSummary, generateTags}
   * @returns {Promise<Array>}
   */
  async categorizeLinks(links, categories, options) {
    options = options || {};
    if (!links || links.length === 0) return [];
    if (!categories || categories.length === 0) {
      throw new Error('Kategori listesi boş olamaz.');
    }

    var allResults = [];
    var totalBatches = Math.ceil(links.length / this.batchSize);

    for (var batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      var start = batchIndex * this.batchSize;
      var end   = Math.min(start + this.batchSize, links.length);
      var batch = links.slice(start, end);

      try {
        var batchResults = await this._categorizeBatch(batch, categories, start, options);
        allResults = allResults.concat(batchResults);
      } catch (err) {
        console.error('[AI] Batch ' + (batchIndex + 1) + '/' + totalBatches + ' hatası:', err);
        for (var i = start; i < end; i++) {
          allResults.push({
            linkIndex: i,
            categoryId: 'diger',
            title: this._generateFallbackTitle(links[i]),
            description: '',
            tags: []
          });
        }
      }

      if (batchIndex < totalBatches - 1) {
        await this._delay(this.requestDelay);
      }
    }

    return allResults;
  }

  /**
   * @protected
   */
  async _categorizeBatch(batch, categories, globalOffset, options) {
    var messages = this._buildCategorizationPrompt(batch, categories, options);
    var response = await this._makeRequest(messages);

    if (!response || !response.choices || !response.choices[0]) {
      throw new Error('AI yanıtı alınamadı.');
    }

    var content = response.choices[0].message?.content || '';
    var parsed  = this._parseCategorizationResponse(content, batch.length, options);

    return parsed.map(function (item) {
      return {
        linkIndex:   (item.index || 0) + globalOffset,
        categoryId:  item.categoryId || 'diger',
        title:       item.title || '',
        description: item.description || '',
        tags:        Array.isArray(item.tags) ? item.tags : []
      };
    });
  }

  /**
   * Tek bir linki özetler, konusunu çıkarır, kategori ve etiket önerir.
   * @param {Object} link - { url, title, description, text_content }
   * @param {Array} categories - Mevcut kategoriler
   * @returns {Promise<Object>} { summary, aiTags, suggestedCategory }
   */
  async summarizeLink(link, categories) {
    var self = this;
    return await self._enqueue(async function() {
      var categoryList = categories.map(function(cat) {
        return '  - id: "' + cat.id + '" → ' + cat.emoji + ' ' + cat.name;
      }).join('\n');

      var prompt = [
        'Bir linki analiz et ve aşağıdaki JSON formatında cevap ver. SADECE JSON döndür, başka metin yazma.',
        '',
        'Link:',
        '  URL: ' + link.url,
        '  Başlık: ' + (link.title || '—'),
        '  Açıklama: ' + (link.description || '—'),
        '',
        'Sayfa içeriği (ilk 3000 karakter):',
        (link.text_content || '').substring(0, 3000),
        '',
        'Mevcut kategoriler:',
        categoryList,
        '',
        'JSON formatı:',
        '{',
        '  "summary": "Linkin ne hakkında olduğunu anlatan 1-2 cümlelik Türkçe özet (30-60 kelime arası)",',
        '  "aiTags": ["etiket1", "etiket2", "etiket3"],',
        '  "suggestedCategory": "kategori_id"',
        '}'
      ].join('\n');

      var messages = [
        { role: 'system', content: 'Sen bir dijital kütüphane uzmanısın. Linkleri analiz eder, özet çıkarır, doğru kategoriyi ve etiketleri önerirsin.' },
        { role: 'user', content: prompt }
      ];

      var response = await self._makeRequest(messages);
      if (!response || !response.choices || !response.choices[0]) {
        throw new Error('AI yanıtı alınamadı.');
      }

      var content = response.choices[0].message?.content || '';
      try {
        var parsed = JSON.parse(content);
        return {
          summary: (parsed.summary || '').substring(0, 500),
          aiTags: Array.isArray(parsed.aiTags) ? parsed.aiTags.slice(0, 5) : [],
          suggestedCategory: parsed.suggestedCategory || ''
        };
      } catch (_) {
        return { summary: '', aiTags: [], suggestedCategory: '' };
      }
    });
  }

  /**
   * API'ye istek gönderir. Alt sınıflar override eder.
   * @protected
   * @abstract
   */
  async _makeRequest(messages) {
    throw new Error('Alt sınıf _makeRequest metodunu implemente etmeli.');
  }

  /**
   * Bağlantı testi. Alt sınıflar override eder.
   * @abstract
   */
  async testConnection() {
    throw new Error('Alt sınıf testConnection metodunu implemente etmeli.');
  }

  // ============================================================
  // Prompt Oluşturma
  // ============================================================

  _buildCategorizationPrompt(links, categories, options) {
    options = options || {};
    var categoryList = categories.map(function (cat) {
      return '  - id: "' + cat.id + '" → ' + cat.emoji + ' ' + cat.name + '\n    Aciklama: ' + (cat.description || 'Bu oda icin aciklama yok.');
    }).join('\n');

    var linkList = links.map(function (link, i) {
      var parts = ['[' + i + '] URL: ' + link.url];
      if (link.platform) parts.push('Platform: ' + link.platform);
      if (link.title) parts.push('Baslik: ' + link.title);
      if (link.description) parts.push('Aciklama: ' + link.description);
      if (link.whatsappContext) {
        var ctx = link.whatsappContext;
        if (ctx.length > 200) ctx = ctx.substring(0, 200) + '...';
        parts.push('Kullanici notu: ' + ctx);
      }
      return parts.join('\n    ');
    }).join('\n\n');

    var extraFields = '';
    if (options.generateSummary) {
      extraFields += '- description: Linkin ne hakkında olduğunu açıklayan tek cümlelik Türkçe açıklama\n';
    }
    if (options.generateTags) {
      extraFields += '- tags: Bu linki tanımlayan 1-3 kısa Türkçe etiket (string array)\n';
    }

    var systemPrompt =
      'Sen bir HAFIZA SARAYI UZMANIsin. Kullanicinin dijital kutuphanesindeki her linki dogru ODAYA yerlestirmen gerekiyor.\n\n' +
      'ODALAR (her biri bir zihinsel mekan):\n' +
      categoryList + '\n\n' +
      'KARAR VERME KURALLARI:\n' +
      '1. Her linki MUMKUN OLDUGUNCA spesifik bir odaya yerlestir. "diger" sadece SON CARE olarak kullan.\n' +
      '2. Oda aciklamalarini DIKKATE AL. Bir linkin konusu oda aciklamasina uyuyorsa oraya koy.\n' +
      '3. KULLANICI NOTU (WhatsApp baglami) varsa ALTIN DEGERINDE. Neden kaydettigini soyler.\n' +
      '4. BASLIK, ACIKLAMA ve URL\'yi kullan. Tahmin ET, varsayim YAP. Bos birakma.\n' +
      '5. Bir link birden fazla odaya uyuyorsa, EN GUCLU eslesmeyi sec.\n\n' +
      'PLATFORM IPUCLARI (baslik yoksa):\n' +
      '- youtube.com → Video basligina gore; egitsel/teknik ise ilgili odaya.\n' +
      '- x.com / twitter.com → Kullanici adi ve icerige gore; teknik ise Atolye/AI Odasi, gunluk ise diger.\n' +
      '- github.com → Atolye, AI Odasi veya Kutuphane (koda gore).\n' +
      '- linkedin.com → Is/calisma hayatina iliskin icerik.\n' +
      '- medium, dev.to, substack → Genellikle Kutuphane veya Atolye.\n' +
      '- tiktok, instagram reels → Genellikle diger veya Spor Salonu (egzersiz icerigi ise).\n\n' +
      'CIKTILAR:\n' +
      '- Her link icin 60 karakter Turkce baslik uret.\n' +
      '- Bir oda SEC (categoryId). Bos birakma, TAHMIN ET.\n' +
      extraFields +
      '\nYanit formati (JSON):\n' +
      '{\n' +
      '  "results": [\n' +
      '    { "index": 0, "categoryId": "oda_id", "title": "Baslik"' +
      (options.generateSummary ? ', "description": "Aciklama"' : '') +
      (options.generateTags ? ', "tags": ["etiket1", "etiket2"]' : '') +
      ' }\n' +
      '  ]\n' +
      '}';

    var userPrompt =
      'Yukaridaki odalari ve aciklamalarini kullanarak asagidaki linkleri yerlestir:\n\n' +
      linkList + '\n\n' +
      'Her link icin categoryId ve title' +
      (options.generateSummary ? ', description' : '') +
      (options.generateTags ? ', tags' : '') +
      ' belirle. JSON formatinda yanit ver.';

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt }
    ];
  }

  // ============================================================
  // Yanıt Ayrıştırma
  // ============================================================

  _parseCategorizationResponse(responseText, linkCount, options) {
    options = options || {};
    if (!responseText) {
      console.warn('[AI] Boş yanıt alındı');
      return this._generateEmptyResults(linkCount);
    }

    var parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (_) {
      var jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (_2) {
          console.warn('[AI] JSON ayrıştırma hatası:', responseText.substring(0, 200));
          return this._generateEmptyResults(linkCount);
        }
      } else {
        console.warn('[AI] Yanıtta JSON bulunamadı:', responseText.substring(0, 200));
        return this._generateEmptyResults(linkCount);
      }
    }

    var results = parsed.results || parsed.data || parsed;
    if (!Array.isArray(results)) {
      if (typeof results === 'object' && results !== null) {
        results = [results];
      } else {
        console.warn('[AI] Beklenmeyen yanıt yapısı');
        return this._generateEmptyResults(linkCount);
      }
    }

    var cleaned = [];
    for (var i = 0; i < results.length; i++) {
      var item = results[i];
      if (!item || typeof item !== 'object') continue;

      cleaned.push({
        index:       typeof item.index === 'number' ? item.index : i,
        categoryId:  (item.categoryId || item.category_id || item.category || 'diger').toString(),
        title:       this._cleanText(item.title || '', 60),
        description: this._cleanText(item.description || '', 200),
        tags:        Array.isArray(item.tags) ? item.tags.map(function(t) { return String(t).trim(); }).filter(function(t) { return t.length > 0; }) : []
      });
    }

    var coveredIndexes = {};
    cleaned.forEach(function (c) { coveredIndexes[c.index] = true; });

    for (var j = 0; j < linkCount; j++) {
      if (!coveredIndexes[j]) {
        cleaned.push({
          index: j,
          categoryId: 'diger',
          title: '',
          description: '',
          tags: []
        });
      }
    }

    cleaned.sort(function (a, b) { return a.index - b.index; });
    return cleaned;
  }

  // ============================================================
  // Yardımcı Metodlar
  // ============================================================

  _cleanText(text, maxLength) {
    if (!text || typeof text !== 'string') return '';
    var cleaned = text.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
    if (cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength).trimEnd() + '...';
    }
    return cleaned;
  }

  _delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  _generateEmptyResults(count) {
    var results = [];
    for (var i = 0; i < count; i++) {
      results.push({
        index: i,
        categoryId: 'diger',
        title: '',
        description: '',
        tags: []
      });
    }
    return results;
  }

  _generateFallbackTitle(link) {
    if (!link || !link.url) return '';
    try {
      var url = new URL(link.url);
      var domain = url.hostname.replace(/^www\./, '');

      if (link.platform && typeof PLATFORMS !== 'undefined' && PLATFORMS[link.platform]) {
        var platformName = PLATFORMS[link.platform].name;
        var path = url.pathname.replace(/^\/+|\/+$/g, '');
        if (path) {
          var pathPart = decodeURIComponent(path.split('/').pop() || '').replace(/[-_]/g, ' ');
          if (pathPart.length > 3) {
            return platformName + ': ' + pathPart.substring(0, 50);
          }
        }
        return platformName + ' bağlantısı';
      }

      return domain;
    } catch (_) {
      return 'Bağlantı';
    }
  }
}

// ============================================================
// Groq AI
// ============================================================

/**
 * Groq API üzerinden AI destekli link kategorizasyonu sağlar.
 */
class GroqAI extends BaseAI {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey || '';
    this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
    this.model = 'llama-3.3-70b-versatile';
    this.requestDelay = 3000;
  }

  async testConnection() {
    if (!this.apiKey) {
      return { success: false, error: 'API anahtarı belirtilmedi.' };
    }
    try {
      var response = await this._makeRequest([
        { role: 'user', content: 'Kısa bir JSON testi. Sadece {"status":"ok"} yaz.' }
      ]);
      if (response && response.choices && response.choices.length > 0) {
        return { success: true };
      }
      return { success: false, error: 'Beklenmeyen yanıt formatı.' };
    } catch (err) {
      return { success: false, error: err.message || 'Bağlantı hatası.' };
    }
  }

  /**
   * Chat/sohbet için JSON olmayan yanıt kullanır.
   * response_format: json_object olmadan.
   */
  async _makeChatRequest(messages, tools) {
    var self = this;
    return self._enqueue(async function() {
      if (!self.apiKey) throw new Error('API anahtarı belirtilmedi. Ayarlardan API anahtarını girin.');
      var requestBody = {
        model: self.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 4096
      };
      if (tools) requestBody.tools = tools;

      var response;
      try {
        var ac = new AbortController();
        setTimeout(function() { ac.abort(); }, 30000);
        response = await fetch(self.baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + self.apiKey },
          body: JSON.stringify(requestBody),
          signal: ac.signal
        });
      } catch (networkError) {
        if (networkError.name === 'AbortError') throw new Error('Groq API zaman aşımı (30s). Internet yavas veya API yogun.');
        throw new Error('Ağ hatası: Groq API\'ye bağlanılamıyor. İnternet bağlantınızı kontrol edin.');
      }

      if (!response.ok) {
        var errorBody;
        try { errorBody = await response.json(); } catch (_) { errorBody = null; }
        console.warn('[Groq] API hatası', response.status, errorBody);
        var errorMsg = (errorBody && errorBody.error && errorBody.error.message) || response.statusText || '';
        if (response.status === 401) throw new Error('Kimlik doğrulama hatası: API anahtarı geçersiz.');
        if (response.status === 429) {
          if (errorMsg && errorMsg.toLowerCase().includes('daily')) {
            throw new Error('Günlük API limiti doldu. Yarın tekrar dene veya Groq hesabını yükselt. (console\'daki hataya bak)');
          }
          throw new Error('Rate limit aşıldı. Bir dakika bekle ve tekrar dene.');
        }
        if (response.status === 400) throw new Error('Geçersiz istek: ' + errorMsg);
        if (response.status >= 500) throw new Error('Groq sunucu hatası (' + response.status + ').');
        throw new Error('API hatası (' + response.status + '): ' + errorMsg);
      }

      try {
        return await response.json();
      } catch (parseError) {
        throw new Error('API yanıtı ayrıştırılamadı: ' + parseError.message);
      }
    });
  }

  async _makeRequest(messages) {
    var self = this;
    return self._enqueue(async function() {
      if (!self.apiKey) throw new Error('API anahtarı belirtilmedi. Ayarlardan API anahtarını girin.');
      var requestBody = {
        model: self.model,
        messages: messages,
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: 'json_object' }
      };

      var response;
      try {
        var ac = new AbortController();
        setTimeout(function() { ac.abort(); }, 30000);
        response = await fetch(self.baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + self.apiKey },
          body: JSON.stringify(requestBody),
          signal: ac.signal
        });
      } catch (networkError) {
        if (networkError.name === 'AbortError') throw new Error('Groq API zaman aşımı (30s). Internet yavas veya API yogun.');
        throw new Error('Ağ hatası: Groq API\'ye bağlanılamıyor. İnternet bağlantınızı kontrol edin.');
      }

      if (!response.ok) {
        var errorBody;
        try { errorBody = await response.json(); } catch (_) { errorBody = null; }
        console.warn('[Groq] API hatası', response.status, errorBody);
        var errorMsg = (errorBody && errorBody.error && errorBody.error.message) || response.statusText || '';
        if (response.status === 401) throw new Error('Kimlik doğrulama hatası: API anahtarı geçersiz.');
        if (response.status === 429) {
          if (errorMsg && errorMsg.toLowerCase().includes('daily')) {
            throw new Error('Günlük API limiti doldu. Yarın tekrar dene veya Groq hesabını yükselt. (console\'daki hataya bak)');
          }
          throw new Error('Rate limit aşıldı. Bir dakika bekle ve tekrar dene.');
        }
        if (response.status === 400) throw new Error('Geçersiz istek: ' + errorMsg);
        if (response.status >= 500) throw new Error('Groq sunucu hatası (' + response.status + ').');
        throw new Error('API hatası (' + response.status + '): ' + errorMsg);
      }

      try {
        return await response.json();
      } catch (parseError) {
        throw new Error('API yanıtı ayrıştırılamadı: ' + parseError.message);
      }
    });
  }
}

// ============================================================
// DeepSeek AI
// ============================================================

class DeepSeekAI extends BaseAI {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey || '';
    this.baseUrl = 'https://api.deepseek.com/v1/chat/completions';
    this.model = 'deepseek-v4-flash';
    this.requestDelay = 1000;
  }

  async testConnection() {
    if (!this.apiKey) return { success: false, error: 'API anahtarı belirtilmedi.' };
    try {
      var response = await this._makeRequest([
        { role: 'user', content: 'Kısa bir JSON testi. Sadece {"status":"ok"} yaz.' }
      ]);
      if (response && response.choices && response.choices.length > 0) return { success: true };
      return { success: false, error: 'Beklenmeyen yanıt formatı.' };
    } catch (err) {
      return { success: false, error: err.message || 'Bağlantı hatası.' };
    }
  }

  async _makeChatRequest(messages, tools) {
    var self = this;
    return self._enqueue(async function() {
      if (!self.apiKey) throw new Error('DeepSeek API anahtarı girilmedi.');
      var requestBody = { model: self.model, messages: messages, temperature: 0.7, max_tokens: 4096 };
      if (tools) requestBody.tools = tools;

      var response;
      try {
        var ac = new AbortController();
        setTimeout(function() { ac.abort(); }, 30000);
        response = await fetch(self.baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + self.apiKey },
          body: JSON.stringify(requestBody),
          signal: ac.signal
        });
      } catch (e) {
        if (e.name === 'AbortError') throw new Error('DeepSeek API zaman aşımı (30s). Internet yavas veya API yogun.');
        throw new Error('Ağ hatası: DeepSeek API\'ye bağlanılamıyor.');
      }

      if (!response.ok) {
        var errBody;
        try { errBody = await response.json(); } catch (_) { errBody = null; }
        console.warn('[DeepSeek] API hatası', response.status, errBody);
        var errMsg = (errBody && errBody.error && errBody.error.message) || response.statusText || '';
        if (response.status === 401) throw new Error('DeepSeek: API anahtarı geçersiz.');
        if (response.status === 429) throw new Error('DeepSeek: rate limit aşıldı.');
        if (response.status === 400) throw new Error('DeepSeek: ' + errMsg);
        if (response.status >= 500) throw new Error('DeepSeek sunucu hatası.');
        throw new Error('DeepSeek hatası (' + response.status + '): ' + errMsg);
      }

      try {
        return await response.json();
      } catch (e) {
        throw new Error('DeepSeek yanıtı ayrıştırılamadı.');
      }
    });
  }

  async _makeRequest(messages) {
    var self = this;
    return self._enqueue(async function() {
      if (!self.apiKey) throw new Error('DeepSeek API anahtarı girilmedi.');
      var requestBody = {
        model: self.model, messages: messages, temperature: 0.3, max_tokens: 4096,
        response_format: { type: 'json_object' }
      };

      var response;
      try {
        var ac = new AbortController();
        setTimeout(function() { ac.abort(); }, 30000);
        response = await fetch(self.baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + self.apiKey },
          body: JSON.stringify(requestBody),
          signal: ac.signal
        });
      } catch (e) {
        if (e.name === 'AbortError') throw new Error('DeepSeek API zaman aşımı (30s). Internet yavas veya API yogun.');
        throw new Error('Ağ hatası: DeepSeek API\'ye bağlanılamıyor.');
      }

      if (!response.ok) {
        var errBody;
        try { errBody = await response.json(); } catch (_) { errBody = null; }
        console.warn('[DeepSeek] API hatası', response.status, errBody);
        var errMsg = (errBody && errBody.error && errBody.error.message) || response.statusText || '';
        if (response.status === 401) throw new Error('DeepSeek: API anahtarı geçersiz.');
        if (response.status === 429) throw new Error('DeepSeek: rate limit aşıldı.');
        if (response.status === 400) throw new Error('DeepSeek: ' + errMsg);
        if (response.status >= 500) throw new Error('DeepSeek sunucu hatası.');
        throw new Error('DeepSeek hatası (' + response.status + '): ' + errMsg);
      }

      try {
        return await response.json();
      } catch (e) {
        throw new Error('DeepSeek yanıtı ayrıştırılamadı.');
      }
    });
  }
}

// ============================================================
// Ollama AI (Lokal)
// ============================================================

/**
 * Ollama lokal API üzerinden AI destekli link kategorizasyonu sağlar.
 */
class OllamaAI extends BaseAI {
  constructor(baseUrl, model) {
    super();
    this.baseUrl = (baseUrl || 'http://localhost:11434').replace(/\/$/, '');
    this.model = model || 'qwen2.5:7b';
    this.batchSize = 8; // Lokal model daha yavaş, daha küçük batch
    this.requestDelay = 500; // Lokalde rate limit yok
  }

  async testConnection() {
    try {
      var response = await fetch(this.baseUrl + '/api/tags');
      if (!response.ok) throw new Error('Ollama yanıt vermedi.');
      var data = await response.json();
      var models = (data.models || []).map(function(m) { return m.name || m.model; });
      var hasModel = models.some(function(m) { return m === this.model; }.bind(this));
      if (!hasModel) {
        return { success: false, error: 'Model "' + this.model + '" bulunamadı. Kurulu modeller: ' + models.join(', ') };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Ollama bağlantı hatası: ' + (err.message || 'Bilgisayarınızda Ollama çalışmıyor olabilir.') };
    }
  }

  async _makeRequest(messages) {
    var systemMsg = messages.find(function(m) { return m.role === 'system'; });
    var userMsgs = messages.filter(function(m) { return m.role !== 'system'; });

    var promptParts = [];
    if (systemMsg) promptParts.push(systemMsg.content);
    userMsgs.forEach(function(m) { promptParts.push(m.content); });

    var response;
    try {
      response = await fetch(this.baseUrl + '/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: promptParts.join('\n\n'),
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 4096
          }
        })
      });
    } catch (networkError) {
      throw new Error('Ollama\'ya bağlanılamıyor. Ollama çalışıyor mu? (ollama serve)');
    }

    if (!response.ok) {
      var errText;
      try { errText = await response.text(); } catch (_) { errText = ''; }
      throw new Error('Ollama hatası (' + response.status + '): ' + errText);
    }

    var data = await response.json();
    if (!data.response) {
      throw new Error('Ollama boş yanıt döndü.');
    }

    // Ollama response formatını OpenAI-compatible formata çevir
    return {
      choices: [{
        message: {
          content: data.response
        }
      }]
    };
  }

  async _makeChatRequest(messages, tools) {
    return this._makeRequest(messages);
  }
}

// ============================================================
// Link Araştırma ve Analiz Metodu (BaseAI extension)
// ============================================================

BaseAI.prototype.researchLinks = async function(links, researchCriteria, proxyAvailable, progressCallback, cancellationToken, categories) {
  researchCriteria = researchCriteria || 'Genel icerik analizi';
  proxyAvailable = proxyAvailable || false;
  categories = categories || [];
  
  var categoryList = categories.map(function (cat) {
    return '  - id: "' + cat.id + '" → ' + cat.emoji + ' ' + cat.name + '\n    Aciklama: ' + (cat.description || 'Bu oda icin aciklama yok.');
  }).join('\n');
  
  var results = [];
  var batchSize = this.batchSize || 12;
  var totalBatches = Math.ceil(links.length / batchSize);
  
  for (var batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    if (cancellationToken && cancellationToken.cancelled) {
      break;
    }
    
    var start = batchIndex * batchSize;
    var end = Math.min(start + batchSize, links.length);
    var batch = links.slice(start, end);
    
    // 1. Meta tag'leri çek
    var metaMap = {};
    if (proxyAvailable) {
      try {
        var ctrl = new AbortController();
        setTimeout(function() { ctrl.abort(); }, 30000);
        var proxyResp = await fetch(PROXY_URL + '/fetch-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: batch.map(function(l) { return l.url; }) }),
          signal: ctrl.signal
        });
        if (proxyResp.ok) {
          var data = await proxyResp.json();
          if (data.results) {
            data.results.forEach(function(r) {
              if (r && r.url) metaMap[r.url] = r;
            });
          }
        }
      } catch (e) {
        console.warn('[Ajan] Proxy batch hatası:', e);
      }
    }
    
    // 2. AI promptu hazırla
    var linkAnalysis = batch.map(function(link, i) {
      var meta = metaMap[link.url] || {};
      var parts = ['[' + i + '] URL: ' + link.url];
      if (link.platform) parts.push('Platform: ' + link.platform);
      if (meta.title) parts.push('Baslik: ' + meta.title);
      if (meta.description) parts.push('Aciklama: ' + meta.description);
      if (link.whatsappContext) {
        var ctx = link.whatsappContext;
        if (ctx.length > 150) ctx = ctx.substring(0, 150) + '...';
        parts.push('KullaniciNotu: ' + ctx);
      }
      return parts.join('\n    ');
    }).join('\n\n');
    
    var systemPrompt =
      'Sen bir HAFIZA SARAYI ARASTIRMACISIsin. Her linki tek tek inceleyip, dogru ODAYA yerlestirmen gerekiyor.\n' +
      'YANIT SADECE JSON.\n\n' +
      'ARASTIRMA KRITERLERI: ' + researchCriteria + '\n\n' +
      'ODALAR (her biri bir zihinsel mekan):\n' +
      categoryList + '\n\n' +
      'Her link icin:\n' +
      '- categoryId: Yukaridaki odalardan en uygun ID\n' +
      '- subcategory: Alt konu / çengel (ornek: "Diz koruma teknikleri", "Prompt mühendisligi", "React performans")\n' +
      '- title: En iyi baslik (meta tag veya uretilmis)\n' +
      '- description: 1-2 cumlelik ozet\n' +
      '- confidence: 0.0 ile 1.0 arasi guven skoru (1.0 = kesin eminim)\n' +
      '- reasoning: Neden bu odayi sectigin (1 cumle)\n\n' +
      'KURALLAR:\n' +
      '1. Her linki mumkun oldugunca spesifik bir odaya yerlestir. "diger" sadece son care.\n' +
      '2. Oda aciklamalarini dikkate al.\n' +
      '3. Tahmin et, varsayim yap, bos birakma.\n\n' +
      'YANIT FORMATI:\n' +
      '{ "results": [ { "index": 0, "categoryId": "...", "subcategory": "...", "title": "...", "description": "...", "confidence": 0.9, "reasoning": "..." } ] }';
    
    var messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Linkler:\n\n' + linkAnalysis + '\n\nHer link icin categoryId, subcategory, title, description, confidence, reasoning belirle.' }
    ];
    
    // 3. AI'a gönder
    var suggestions = [];
    try {
      var response = await this._makeRequest(messages);
      var content = response.choices[0].message?.content || '';
      suggestions = this._parseResearchResponse(content, batch.length);
    } catch (err) {
      console.error('[Ajan] Batch hatası:', err);
      suggestions = batch.map(function(_, i) {
        return {
          index: i,
          categoryId: 'diger',
          subcategory: 'Belirsiz',
          title: '',
          description: '',
          confidence: 0.0,
          reasoning: 'AI analizi basarisiz'
        };
      });
    }
    
    // 4. Sonuçları topla
    suggestions.forEach(function(s) {
      var link = batch[s.index || 0];
      results.push({
        linkId: link.id,
        url: link.url,
        currentCategory: link.category,
        title: s.title || link.title || '',
        description: s.description || link.description || '',
        categoryId: s.categoryId || 'diger',
        subcategory: s.subcategory || '',
        confidence: s.confidence || 0.0,
        reasoning: s.reasoning || ''
      });
    });
    
    // 5. Progress callback
    if (progressCallback) {
      progressCallback(batchIndex + 1, totalBatches, results.length, links.length);
    }
    
  }
  
  return results;
};

BaseAI.prototype._parseResearchResponse = function(responseText, linkCount) {
  if (!responseText) {
    return this._generateEmptyResearchResults(linkCount);
  }
  
  var parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch (_) {
    var jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (_2) {
        return this._generateEmptyResearchResults(linkCount);
      }
    } else {
      return this._generateEmptyResearchResults(linkCount);
    }
  }
  
  var results = parsed.results || parsed.data || parsed;
  if (!Array.isArray(results)) {
    if (typeof results === 'object' && results !== null) {
      results = [results];
    } else {
      return this._generateEmptyResearchResults(linkCount);
    }
  }
  
  var cleaned = [];
  for (var i = 0; i < results.length; i++) {
    var item = results[i];
    if (!item || typeof item !== 'object') continue;
    
    cleaned.push({
      index: typeof item.index === 'number' ? item.index : i,
      categoryId: (item.categoryId || item.category_id || item.category || 'diger').toString(),
      subcategory: this._cleanText(item.subcategory || '', 40),
      title: this._cleanText(item.title || '', 60),
      description: this._cleanText(item.description || '', 200),
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
      reasoning: this._cleanText(item.reasoning || '', 150)
    });
  }
  
  // Eksik indeksleri doldur
  var covered = {};
  cleaned.forEach(function(c) { covered[c.index] = true; });
  for (var j = 0; j < linkCount; j++) {
    if (!covered[j]) {
      cleaned.push({
        index: j,
        categoryId: 'diger',
        subcategory: 'Belirsiz',
        title: '',
        description: '',
        confidence: 0.0,
        reasoning: ''
      });
    }
  }
  
  cleaned.sort(function(a, b) { return a.index - b.index; });
  return cleaned;
};

BaseAI.prototype._generateEmptyResearchResults = function(count) {
  var results = [];
  for (var i = 0; i < count; i++) {
    results.push({
      index: i,
      categoryId: 'diger',
      subcategory: 'Belirsiz',
      title: '',
      description: '',
      confidence: 0.0,
      reasoning: ''
    });
  }
  return results;
};
