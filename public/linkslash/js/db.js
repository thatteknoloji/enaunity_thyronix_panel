/**
 * LinkSlash - IndexedDB Veritabanı Sarmalayıcısı
 * Tüm veriler yerel IndexedDB'de saklanır.
 * Global (window) kapsamında kullanılır.
 */

/**
 * LinkSlash veritabanı yönetim sınıfı.
 * Links, categories ve settings object store'larını yönetir.
 */
class LinkSlashDB {
  constructor() {
    /** @type {string} Veritabanı adı */
    this.dbName = 'LinkSlashDB';
    /** @type {number} Veritabanı sürümü */
    this.dbVersion = 2;
    /** @type {IDBDatabase|null} Aktif veritabanı bağlantısı */
    this.db = null;
  }

  // ============================================================
  // Başlatma
  // ============================================================

  /**
   * Veritabanını açar veya oluşturur.
   * İlk çalıştırmada object store'ları ve varsayılan kategorileri oluşturur.
   * @returns {Promise<void>}
   */
  async init() {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      var request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('[LinkSlashDB] Veritabanı açılamadı:', request.error);
        reject(new Error('Veritabanı açılamadı: ' + (request.error?.message || 'Bilinmeyen hata')));
      };

      request.onupgradeneeded = (event) => {
        var db = event.target.result;

        // Links store
        if (!db.objectStoreNames.contains('links')) {
          var linksStore = db.createObjectStore('links', { keyPath: 'id' });
          linksStore.createIndex('category',   'category',   { unique: false });
          linksStore.createIndex('platform',   'platform',   { unique: false });
          linksStore.createIndex('dateAdded',   'dateAdded',  { unique: false });
          linksStore.createIndex('isFavorite', 'isFavorite', { unique: false });
          linksStore.createIndex('isArchived', 'isArchived', { unique: false });
        }

        // Categories store
        if (!db.objectStoreNames.contains('categories')) {
          var catStore = db.createObjectStore('categories', { keyPath: 'id' });
          catStore.createIndex('order', 'order', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Chat messages store
        if (!db.objectStoreNames.contains('chat_messages')) {
          var chatStore = db.createObjectStore('chat_messages', { keyPath: 'id', autoIncrement: true });
          chatStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Varsayılan kategorileri ekle
        // onupgradeneeded transaction'ı içinde yapılmalı
        var catTx = event.target.transaction.objectStore('categories');
        if (typeof DEFAULT_CATEGORIES !== 'undefined') {
          DEFAULT_CATEGORIES.forEach(function (cat) {
            catTx.put(cat);
          });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this._allLinksCache = null;
        this._allLinksCacheDirty = true;

        // Beklenmeyen kapanma durumunu yakala
        this.db.onversionchange = () => {
          this.db.close();
          this.db = null;
          console.warn('[LinkSlashDB] Veritabanı sürümü değişti, bağlantı kapatıldı.');
        };

        resolve();
      };
    });
  }

  /**
   * Veritabanı bağlantısının açık olduğundan emin olur.
   * @private
   */
  _ensureDb() {
    if (!this.db) {
      throw new Error('Veritabanı henüz başlatılmadı. Önce init() çağrılmalı.');
    }
  }

  /**
   * Promise tabanlı transaction yardımcısı.
   * @private
   * @param {string|string[]} storeNames - Object store adları
   * @param {'readonly'|'readwrite'} mode - Transaction modu
   * @param {function(IDBTransaction): void} callback - Transaction callback'i
   * @returns {Promise<*>}
   */
  _transaction(storeNames, mode, callback) {
    this._ensureDb();
    return new Promise((resolve, reject) => {
      try {
        var tx = this.db.transaction(storeNames, mode);
        var result;

        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(new Error('Transaction hatası: ' + (tx.error?.message || 'Bilinmeyen')));
        tx.onabort = () => reject(new Error('Transaction iptal edildi: ' + (tx.error?.message || 'Bilinmeyen')));

        result = callback(tx);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Tek bir IDBRequest'i Promise'e çevirir.
   * @private
   * @param {IDBRequest} request
   * @returns {Promise<*>}
   */
  _requestPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(request.error?.message || 'İstek hatası'));
    });
  }

  // ============================================================
  // Links CRUD
  // ============================================================

  /**
   * Yeni bir link ekler.
   * @param {Object} link - Eklenecek link nesnesi
   * @returns {Promise<Object>} Eklenen link
   */
  async addLink(link) {
    this._ensureDb();
    var record = Object.assign({
      id: generateId(),
      dateAdded: new Date().toISOString(),
      isFavorite: false,
      isArchived: false,
      tags: [],
      notes: ''
    }, link);

    return new Promise((resolve, reject) => {
      var tx = this.db.transaction('links', 'readwrite');
      var store = tx.objectStore('links');
      var req = store.add(record);
      req.onsuccess = () => { this._allLinksCacheDirty = true; resolve(record); };
      req.onerror = () => reject(new Error('Link eklenemedi: ' + (req.error?.message || '')));
    });
  }

  /**
   * Birden fazla linki tek bir transaction içinde ekler.
   * @param {Object[]} links - Eklenecek link dizisi
   * @returns {Promise<Object[]>} Eklenen linkler
   */
  async addLinks(links) {
    this._ensureDb();
    if (!Array.isArray(links) || links.length === 0) return [];

    var records = links.map(function (link) {
      return Object.assign({
        id: generateId(),
        dateAdded: new Date().toISOString(),
        isFavorite: false,
        isArchived: false,
        tags: [],
        notes: ''
      }, link);
    });

    return new Promise((resolve, reject) => {
      var tx = this.db.transaction('links', 'readwrite');
      var store = tx.objectStore('links');

      records.forEach(function (rec) {
        store.put(rec);
      });

      tx.oncomplete = () => { this._allLinksCacheDirty = true; resolve(records); };
      tx.onerror = () => reject(new Error('Linkler eklenemedi: ' + (tx.error?.message || '')));
    });
  }

  /**
   * Mevcut bir linki kısmi olarak günceller.
   * @param {string} id - Güncellenecek linkin ID'si
   * @param {Object} changes - Değiştirilecek alanlar
   * @returns {Promise<Object>} Güncellenmiş link
   */
  async updateLink(id, changes) {
    this._ensureDb();
    return new Promise((resolve, reject) => {
      var tx = this.db.transaction('links', 'readwrite');
      var store = tx.objectStore('links');
      var getReq = store.get(id);

      getReq.onsuccess = () => {
        var existing = getReq.result;
        if (!existing) {
          reject(new Error('Link bulunamadı: ' + id));
          return;
        }
        var updated = Object.assign({}, existing, changes, { id: id });
        var putReq = store.put(updated);
        putReq.onsuccess = () => { this._allLinksCacheDirty = true; resolve(updated); };
        putReq.onerror = () => reject(new Error('Link güncellenemedi: ' + (putReq.error?.message || '')));
      };
      getReq.onerror = () => reject(new Error('Link okunamadı: ' + (getReq.error?.message || '')));
    });
  }

  /**
   * Tek bir linki siler.
   * @param {string} id - Silinecek linkin ID'si
   * @returns {Promise<void>}
   */
  async deleteLink(id) {
    this._ensureDb();
    return this._softDeleteLinks([id]);
  }

  /**
   * Birden fazla linki çöp kutusuna taşır.
   * @param {string[]} ids - Taşınacak linklerin ID dizisi
   */
  async deleteLinks(ids) {
    this._ensureDb();
    if (!Array.isArray(ids) || ids.length === 0) return;
    return this._softDeleteLinks(ids);
  }

  /** Soft-delete: deletedAt alanini set eder, gercek silme yapmaz */
  async _softDeleteLinks(ids) {
    var self = this;
    return new Promise(function(resolve, reject) {
      var tx = self.db.transaction('links', 'readwrite');
      var store = tx.objectStore('links');
      var errors = [];

      ids.forEach(function(id) {
        var getReq = store.get(id);
        getReq.onsuccess = function() {
          var link = getReq.result;
          if (link) {
            link.deletedAt = Date.now();
            store.put(link);
          }
        };
        getReq.onerror = function() {
          errors.push(id);
        };
      });

      tx.oncomplete = function() {
        if (errors.length === ids.length) reject(new Error('Linkler cop kutusuna tasinamadi'));
        else { self._allLinksCacheDirty = true; resolve(); }
      };
      tx.onerror = function() {
        reject(new Error('Islem hatasi'));
      };
    });
  }

  /** Linki çöp kutusundan geri yükler */
  async restoreLink(id) {
    return this.restoreLinks([id]);
  }

  async restoreLinks(ids) {
    var self = this;
    return new Promise(function(resolve, reject) {
      var tx = self.db.transaction('links', 'readwrite');
      var store = tx.objectStore('links');
      ids.forEach(function(id) {
        var getReq = store.get(id);
        getReq.onsuccess = function() {
          var link = getReq.result;
          if (link) {
            delete link.deletedAt;
            store.put(link);
          }
        };
      });
      tx.oncomplete = function() { self._allLinksCacheDirty = true; resolve(); };
      tx.onerror = function() { reject(new Error('Geri yukleme hatasi')); };
    });
  }

  /** Kalıcı olarak siler (çöp kutusundan) */
  async permanentlyDeleteLinks(ids) {
    this._ensureDb();
    if (!Array.isArray(ids) || ids.length === 0) return;
    return new Promise(function(resolve, reject) {
      var tx = this.db.transaction('links', 'readwrite');
      var store = tx.objectStore('links');
      ids.forEach(function(id) { store.delete(id); });
      tx.oncomplete = function() { this._allLinksCacheDirty = true; resolve(); };
      tx.onerror = function() { reject(new Error('Kalici silme hatasi')); };
    }.bind(this));
  }

  /** Çöp kutusundaki linkleri döndürür */
  async getTrashLinks() {
    this._ensureDb();
    return new Promise(function(resolve, reject) {
      var tx = this.db.transaction('links', 'readonly');
      var store = tx.objectStore('links');
      var req = store.getAll();
      req.onsuccess = function() {
        var all = req.result || [];
        all = all.filter(function(l) { return l.deletedAt && !l.isArchived; });
        all.sort(function(a, b) { return b.deletedAt - a.deletedAt; });
        resolve(all);
      };
      req.onerror = function() { reject(new Error('Cop kutusu okunamadi')); };
    }.bind(this));
  }

  /** 30 günden eski çöp linkleri kalıcı siler */
  async cleanOldTrash() {
    var trash = await this.getTrashLinks();
    var cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
    var toDelete = trash.filter(function(l) { return l.deletedAt < cutoff; }).map(function(l) { return l.id; });
    if (toDelete.length > 0) {
      await this.permanentlyDeleteLinks(toDelete);
    }
    return toDelete.length;
  }

  /**
   * ID'ye göre tek bir link döndürür.
   * @param {string} id - Aranacak link ID'si
   * @returns {Promise<Object|undefined>} Bulunan link veya undefined
   */
  async getLink(id) {
    this._ensureDb();
    return new Promise((resolve, reject) => {
      var tx = this.db.transaction('links', 'readonly');
      var store = tx.objectStore('links');
      var req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new Error('Link okunamadı: ' + (req.error?.message || '')));
    });
  }

  /**
   * Tüm linkleri dateAdded'e göre azalan sırada döndürür.
   * @returns {Promise<Object[]>} Link dizisi
   */
  async getAllLinks(options) {
    this._ensureDb();
    if (options && options.force) {
      this._allLinksCache = null;
    }
    if (this._allLinksCache && !this._allLinksCacheDirty) {
      return this._allLinksCache;
    }
    return new Promise((resolve, reject) => {
      var tx = this.db.transaction('links', 'readonly');
      var store = tx.objectStore('links');
      var req = store.getAll();
      req.onsuccess = () => {
        var results = (req.result || []).filter(function(l) { return !l.deletedAt; });
        results.sort(function (a, b) {
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
        });
        this._allLinksCache = results;
        this._allLinksCacheDirty = false;
        resolve(results);
      };
      req.onerror = () => reject(new Error('Linkler okunamadı: ' + (req.error?.message || '')));
    });
  }

  /**
   * Verilen URL listesindeki mevcut linkleri bulur.
   * @param {string[]} urls - Kontrol edilecek URL'ler
   * @returns {Promise<string[]>} Mevcut URL'ler
   */
  async findExistingUrls(urls) {
    this._ensureDb();
    if (!urls || urls.length === 0) return [];
    var urlSet = new Set(urls.map(function(u) { return u.toLowerCase().trim(); }));
    return new Promise((resolve, reject) => {
      var tx = this.db.transaction('links', 'readonly');
      var store = tx.objectStore('links');
      var existing = [];
      var checked = 0;
      var cursorReq = store.openCursor();
      cursorReq.onsuccess = function(e) {
        var cursor = e.target.result;
        if (cursor) {
          var url = (cursor.value.url || '').toLowerCase().trim();
          if (urlSet.has(url)) {
            existing.push(url);
          }
          cursor.continue();
        } else {
          resolve(existing);
        }
      };
      cursorReq.onerror = () => reject(new Error('Kontrol basarisiz: ' + (cursorReq.error?.message || '')));
    });
  }

  /**
   * Verilen URL'lerden hangilerinin yeni oldugunu doner.
   * @param {string[]} urls
   * @returns {Promise<{newUrls: string[], existingUrls: string[]}>}
   */
  async filterNewUrls(urls) {
    var existing = await this.findExistingUrls(urls);
    var existingSet = new Set(existing);
    var newUrls = urls.filter(function(u) { return !existingSet.has(u.toLowerCase().trim()); });
    return { newUrls: newUrls, existingUrls: existing };
  }

  /**
   * Filtrelere göre linkleri döndürür.
   * @param {Object} [filters={}] - Filtre parametreleri
   * @param {string} [filters.category] - Kategori ID filtresi
   * @param {string} [filters.platform] - Platform filtresi
   * @param {string} [filters.search] - Arama metni (url, title, description, tags içinde arar)
   * @param {boolean} [filters.isFavorite] - Sadece favorileri getir
   * @param {boolean} [filters.isArchived] - Sadece arşivlenenleri getir
   * @param {string|Date} [filters.dateFrom] - Başlangıç tarihi
   * @param {string|Date} [filters.dateTo] - Bitiş tarihi
   * @returns {Promise<Object[]>} Filtrelenmiş link dizisi (dateAdded desc)
   */
  async getLinks(filters) {
    if (!filters) filters = {};
    var allLinks = await this.getAllLinks();

    var results = allLinks.filter(function (link) {
      // Arşiv filtresi (açıkça true istenmedikçe arşivlenmiş olanları gösterme)
      if (filters.isArchived === true) {
        if (!link.isArchived) return false;
      } else if (filters.isArchived === false || filters.isArchived === undefined) {
        if (link.isArchived) return false;
      }

      // Kategori filtresi
      if (filters.category && link.category !== filters.category) return false;

      // Platform filtresi
      if (filters.platform && link.platform !== filters.platform) return false;

      // Favori filtresi
      if (filters.isFavorite !== undefined && filters.isFavorite !== null) {
        if (link.isFavorite !== filters.isFavorite) return false;
      }


      // Tarih aralığı filtresi
      if (filters.dateFrom) {
        var from = new Date(filters.dateFrom).getTime();
        var added = new Date(link.dateAdded).getTime();
        if (added < from) return false;
      }
      if (filters.dateTo) {
        var to = new Date(filters.dateTo + 'T23:59:59').getTime();
        if (new Date(link.dateAdded).getTime() > to) return false;
      }

      // Metin araması (büyük/küçük harf duyarsız)
      if (filters.search) {
        var q = filters.search.toLowerCase();
        var searchFields = [
          link.url || '',
          link.title || '',
          link.description || '',
          link.notes || '',
          Array.isArray(link.tags) ? link.tags.join(' ') : ''
        ].join(' ').toLowerCase();

        if (searchFields.indexOf(q) === -1) return false;
      }

      return true;
    });

    // Zaten getAllLinks() ile sıralı geliyor (dateAdded desc)
    return results;
  }

  /**
   * Tüm linklerde kullanılan benzersiz etiketleri ve sayılarını döndürür.
   * @returns {Promise<Object[]>} {tag: string, count: number} dizisi
   */
  async getAllTags() {
    var allLinks = await this.getAllLinks();
    var tagCount = {};
    allLinks.forEach(function (link) {
      if (Array.isArray(link.tags)) {
        link.tags.forEach(function (t) {
          var key = t.trim();
          if (key) tagCount[key] = (tagCount[key] || 0) + 1;
        });
      }
    });
    var result = Object.keys(tagCount).map(function (tag) {
      return { tag: tag, count: tagCount[tag] };
    });
    result.sort(function (a, b) { return b.count - a.count; });
    return result;
  }

  /**
   * Belirli bir etikete sahip tüm linkleri döndürür.
   * @param {string} tag - Aranacak etiket
   * @returns {Promise<Object[]>} Link dizisi
   */
  async getLinksByTag(tag) {
    var allLinks = await this.getAllLinks();
    return allLinks.filter(function (link) {
      return Array.isArray(link.tags) && link.tags.indexOf(tag) !== -1;
    });
  }

  /**
   * Bir etiketi tüm linklerde yeniden adlandırır.
   * @param {string} oldTag - Eski etiket adı
   * @param {string} newTag - Yeni etiket adı
   * @returns {Promise<number>} Güncellenen link sayısı
   */
  async renameTag(oldTag, newTag) {
    if (!oldTag || !newTag || oldTag === newTag) return 0;
    var allLinks = await this.getAllLinks();
    var updated = 0;
    for (var i = 0; i < allLinks.length; i++) {
      var link = allLinks[i];
      if (Array.isArray(link.tags) && link.tags.indexOf(oldTag) !== -1) {
        var newTags = link.tags.map(function (t) { return t === oldTag ? newTag : t; });
        await this.updateLink(link.id, { tags: newTags });
        updated++;
      }
    }
    return updated;
  }

  /**
   * Bir etiketi tüm linklerden siler.
   * @param {string} tag - Silinecek etiket
   * @returns {Promise<number>} Güncellenen link sayısı
   */
  async deleteTag(tag) {
    if (!tag) return 0;
    var allLinks = await this.getAllLinks();
    var updated = 0;
    for (var i = 0; i < allLinks.length; i++) {
      var link = allLinks[i];
      if (Array.isArray(link.tags) && link.tags.indexOf(tag) !== -1) {
        var newTags = link.tags.filter(function (t) { return t !== tag; });
        await this.updateLink(link.id, { tags: newTags });
        updated++;
      }
    }
    return updated;
  }

  /**
   * Toplam link sayısını döndürür.
   * @returns {Promise<number>} Link sayısı
   */
  async getLinkCount() {
    this._ensureDb();
    return new Promise((resolve, reject) => {
      var tx = this.db.transaction('links', 'readonly');
      var store = tx.objectStore('links');
      var req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new Error('Link sayısı okunamadı: ' + (req.error?.message || '')));
    });
  }

  // ============================================================
  // Categories CRUD
  // ============================================================

  /**
   * Tüm kategorileri sıralı olarak döndürür (order alanına göre artan).
   * @returns {Promise<Object[]>} Kategori dizisi
   */
  async getCategories() {
    this._ensureDb();
    return new Promise((resolve, reject) => {
      var tx = this.db.transaction('categories', 'readonly');
      var store = tx.objectStore('categories');
      var req = store.getAll();
      req.onsuccess = () => {
        var results = req.result || [];
        results.sort(function (a, b) {
          return (a.order || 0) - (b.order || 0);
        });
        resolve(results);
      };
      req.onerror = () => reject(new Error('Kategoriler okunamadı: ' + (req.error?.message || '')));
    });
  }

  /**
   * Yeni bir kategori ekler.
   * @param {Object} category - Eklenecek kategori nesnesi
   * @returns {Promise<Object>} Eklenen kategori
   */
  async addCategory(category) {
    this._ensureDb();
    var record = Object.assign({
      id: generateId(),
      order: Date.now()
    }, category);

    return new Promise((resolve, reject) => {
      var tx = this.db.transaction('categories', 'readwrite');
      var store = tx.objectStore('categories');
      var req = store.add(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(new Error('Kategori eklenemedi: ' + (req.error?.message || '')));
    });
  }

  /**
   * Mevcut bir kategoriyi kısmi olarak günceller.
   * @param {string} id - Güncellenecek kategorinin ID'si
   * @param {Object} changes - Değiştirilecek alanlar
   * @returns {Promise<Object>} Güncellenmiş kategori
   */
  async updateCategory(id, changes) {
    this._ensureDb();
    return new Promise((resolve, reject) => {
      var tx = this.db.transaction('categories', 'readwrite');
      var store = tx.objectStore('categories');
      var getReq = store.get(id);

      getReq.onsuccess = () => {
        var existing = getReq.result;
        if (!existing) {
          reject(new Error('Kategori bulunamadı: ' + id));
          return;
        }
        var updated = Object.assign({}, existing, changes, { id: id });
        var putReq = store.put(updated);
        putReq.onsuccess = () => resolve(updated);
        putReq.onerror = () => reject(new Error('Kategori güncellenemedi: ' + (putReq.error?.message || '')));
      };
      getReq.onerror = () => reject(new Error('Kategori okunamadı: ' + (getReq.error?.message || '')));
    });
  }

  /**
   * Bir kategoriyi siler. Bu kategoriye ait linkler silinmez.
   * @param {string} id - Silinecek kategorinin ID'si
   * @returns {Promise<void>}
   */
  async deleteCategory(id) {
    this._ensureDb();
    return new Promise((resolve, reject) => {
      var tx = this.db.transaction('categories', 'readwrite');
      var store = tx.objectStore('categories');
      var req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error('Kategori silinemedi: ' + (req.error?.message || '')));
    });
  }

  /**
   * Kategorilerin sırasını günceller.
   * @param {string[]} orderedIds - Yeni sıraya göre kategori ID dizisi
   * @returns {Promise<void>}
   */
  async reorderCategories(orderedIds) {
    this._ensureDb();
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;

    return new Promise((resolve, reject) => {
      var tx = this.db.transaction('categories', 'readwrite');
      var store = tx.objectStore('categories');
      var index = 0;

      orderedIds.forEach(function (id, i) {
        var getReq = store.get(id);
        getReq.onsuccess = function () {
          var cat = getReq.result;
          if (cat) {
            cat.order = i;
            store.put(cat);
          }
        };
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Kategori sıralaması güncellenemedi: ' + (tx.error?.message || '')));
    });
  }

  // ============================================================
  // Settings
  // ============================================================

  /**
   * Bir ayar değerini döndürür.
   * @param {string} key - Ayar anahtarı
   * @returns {Promise<*>} Ayar değeri veya undefined
   */
  async getSetting(key) {
    this._ensureDb();
    return new Promise((resolve, reject) => {
      var tx = this.db.transaction('settings', 'readonly');
      var store = tx.objectStore('settings');
      var req = store.get(key);
      req.onsuccess = () => {
        var result = req.result;
        resolve(result ? result.value : undefined);
      };
      req.onerror = () => reject(new Error('Ayar okunamadı: ' + (req.error?.message || '')));
    });
  }

  /**
   * Bir ayar değeri kaydeder veya günceller.
   * @param {string} key - Ayar anahtarı
   * @param {*} value - Ayar değeri
   * @returns {Promise<void>}
   */
  async setSetting(key, value) {
    this._ensureDb();
    return new Promise((resolve, reject) => {
      var tx = this.db.transaction('settings', 'readwrite');
      var store = tx.objectStore('settings');
      var req = store.put({ key: key, value: value });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error('Ayar kaydedilemedi: ' + (req.error?.message || '')));
    });
  }

  // ============================================================
  // Chat Mesajları
  // ============================================================

  /**
   * Yeni bir chat mesajı kaydeder.
   * @param {string} role - 'user' veya 'bot'
   * @param {string} content - Mesaj içeriği
   * @returns {Promise<number>} Eklenen mesajın ID'si
   */
  async addChatMessage(role, content) {
    this._ensureDb();
    return new Promise((resolve, reject) => {
      var tx = this.db.transaction('chat_messages', 'readwrite');
      var store = tx.objectStore('chat_messages');
      var req = store.add({
        role: role,
        content: content,
        timestamp: Date.now()
      });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new Error('Mesaj kaydedilemedi'));
    });
  }

  /**
   * Chat mesajlarını tarih sırasıyla getirir.
   * @param {number} [limit=50] - Maksimum mesaj sayısı
   * @returns {Promise<Array>}
   */
  async getChatMessages(limit) {
    limit = limit || 50;
    this._ensureDb();
    return new Promise((resolve, reject) => {
      var tx = this.db.transaction('chat_messages', 'readonly');
      var store = tx.objectStore('chat_messages');
      var index = store.index('timestamp');
      var req = index.openCursor(null, 'prev');
      var messages = [];
      req.onsuccess = function() {
        var cursor = req.result;
        if (cursor && messages.length < limit) {
          messages.push(cursor.value);
          cursor.continue();
        } else {
          resolve(messages.reverse());
        }
      };
      req.onerror = () => reject(new Error('Mesajlar okunamadı'));
    });
  }

  /**
   * Tüm chat mesajlarını siler.
   * @returns {Promise<void>}
   */
  async clearChatMessages() {
    this._ensureDb();
    return new Promise((resolve, reject) => {
      var tx = this.db.transaction('chat_messages', 'readwrite');
      var store = tx.objectStore('chat_messages');
      var req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error('Mesajlar temizlenemedi'));
    });
  }

  /**
   * Chat mesajı sayısını döndürür.
   * @returns {Promise<number>}
   */
  async getChatMessageCount() {
    this._ensureDb();
    return new Promise((resolve, reject) => {
      var tx = this.db.transaction('chat_messages', 'readonly');
      var store = tx.objectStore('chat_messages');
      var req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new Error('Sayı okunamadı'));
    });
  }

  // ============================================================
  // İstatistikler
  // ============================================================

  /**
   * Genel istatistikleri döndürür.
   * @returns {Promise<{total: number, byCategory: Object, byPlatform: Object, favorites: number}>}
   */
  async getStats() {
    var allLinks = await this.getAllLinks();
    var stats = {
      total: allLinks.length,
      activeCount: 0,
      byCategory: {},
      byPlatform: {},
      favorites: 0,
      deadLinks: 0,
      unknownLinks: 0
    };

    allLinks.forEach(function (link) {
      // Sağlık istatistiği
      if (link.healthStatus === 'dead') stats.deadLinks++;
      if (!link.healthStatus || link.healthStatus === 'unknown') stats.unknownLinks++;

      if (link.isArchived) return;
      
      stats.activeCount++;

      var cat = link.category || 'uncategorized';
      stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;

      var plat = link.platform || 'website';
      stats.byPlatform[plat] = (stats.byPlatform[plat] || 0) + 1;

      if (link.isFavorite) stats.favorites++;
    });

    return stats;
  }

  // ============================================================
  // Yedekleme / İçe-Dışa Aktarma
  // ============================================================

  /**
   * Tüm verileri dışa aktarır (JSON formatında).
   * @returns {Promise<{links: Object[], categories: Object[], settings: Object[], exportDate: string}>}
   */
  async exportAll() {
    this._ensureDb();

    var links = await this.getAllLinks();
    var categories = await this.getCategories();

    // Settings'i al
    var settings = await new Promise((resolve, reject) => {
      var tx = this.db.transaction('settings', 'readonly');
      var store = tx.objectStore('settings');
      var req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(new Error('Ayarlar okunamadı: ' + (req.error?.message || '')));
    });

    return {
      links: links,
      categories: categories,
      settings: settings,
      exportDate: new Date().toISOString()
    };
  }

  /**
   * Dışa aktarılmış verileri içe aktarır. Mevcut verileri siler.
   * @param {Object} data - exportAll() formatında veri
   * @returns {Promise<void>}
   */
  async importAll(data) {
    this._ensureDb();
    if (!data || typeof data !== 'object') {
      throw new Error('Geçersiz içe aktarma verisi');
    }

    // Önce mevcut verileri temizle
    await this.clearAll();

    // Links'i ekle
    if (Array.isArray(data.links) && data.links.length > 0) {
      await new Promise((resolve, reject) => {
        var tx = this.db.transaction('links', 'readwrite');
        var store = tx.objectStore('links');
        data.links.forEach(function (link) {
          store.put(link);
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error('Linkler içe aktarılamadı'));
      });
    }

    // Kategorileri ekle
    if (Array.isArray(data.categories) && data.categories.length > 0) {
      await new Promise((resolve, reject) => {
        var tx = this.db.transaction('categories', 'readwrite');
        var store = tx.objectStore('categories');
        data.categories.forEach(function (cat) {
          store.put(cat);
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error('Kategoriler içe aktarılamadı'));
      });
    }

    // Ayarları ekle
    if (Array.isArray(data.settings) && data.settings.length > 0) {
      await new Promise((resolve, reject) => {
        var tx = this.db.transaction('settings', 'readwrite');
        var store = tx.objectStore('settings');
        data.settings.forEach(function (s) {
          store.put(s);
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error('Ayarlar içe aktarılamadı'));
      });
    }
  }

  /**
   * Tüm verileri siler.
   * @returns {Promise<void>}
   */
  async clearAll() {
    this._ensureDb();
    var storeNames = ['links', 'categories', 'settings'];
    return new Promise((resolve, reject) => {
      var tx = this.db.transaction(storeNames, 'readwrite');

      storeNames.forEach(function (name) {
        tx.objectStore(name).clear();
      });

      tx.oncomplete = () => { this._allLinksCacheDirty = true; resolve(); };
      tx.onerror = () => reject(new Error('Veriler temizlenemedi: ' + (tx.error?.message || '')));
    });
  }
}
