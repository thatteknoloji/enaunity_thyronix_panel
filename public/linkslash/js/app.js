/**
 * LinkSlash Ana Uygulama
 * Routing, event handling ve tüm modüllerin entegrasyonu
 */

class App {
  constructor() {
    this.db = new LinkSlashDB();
    this.parser = new WhatsAppParser();
    this.bookmarkParser = new BookmarkParser();
    this.ai = null; // API key girilince oluşturulacak
    this._bulkAICancelled = false; // Bulk AI iptal bayragi
    this._agentCancelled = false; // Agent iptal bayragi
    this._activeFilters = { search: '', category: '', platform: '', tag: '', dateFrom: '', dateTo: '', isArchived: undefined, isFavorite: undefined };
    this._currentView = ''; // mevcut view adi (hash)
    this._previewCache = new Map(); // url -> {title, description, image, ...}
  }

  async init() {
    try {
      // Tema yükle
      var savedTheme = localStorage.getItem('linkslash_theme');
      var isLightNow = savedTheme === 'light';
      if (isLightNow) {
        document.documentElement.setAttribute('data-theme', 'light');
      }
      var darkIcon = document.querySelector('.theme-icon-dark');
      var lightIcon = document.querySelector('.theme-icon-light');
      if (darkIcon) darkIcon.style.display = isLightNow ? 'none' : '';
      if (lightIcon) lightIcon.style.display = isLightNow ? '' : 'none';

      // Veritabanını başlat
      await this.db.init();
      ui.db = this.db;

      // Extension'dan bekleyen linkleri senkronize et
      if (typeof syncExtensionCaptures === 'function') {
        await syncExtensionCaptures(this.db, ui);
      }

      // Cloud sync — bootstrap + push/pull
      if (typeof LinkSlashCloudSync !== 'undefined') {
        var lastSync = await this.db.getSetting('linkslash_last_cloud_sync');
        if (lastSync) LinkSlashCloudSync.state.lastSync = lastSync;
        await LinkSlashCloudSync.runFullSync(this.db, ui);
      }

      // Oto oda yukleme: hic oda yoksa varsayilanlari ekle
      var categories = await this.db.getCategories();
      if (!categories || categories.length === 0) {
        for (var i = 0; i < DEFAULT_CATEGORIES.length; i++) {
          await this.db.addCategory(DEFAULT_CATEGORIES[i]);
        }
      }

      // AI sağlayıcısını yükle
      this._initAI();

      // İlk kullanım kontrolü
      const isFirstRun = !(await this.db.getSetting('initialized'));
      
      if (isFirstRun) {
        await this.db.setSetting('initialized', true);
        ui.showWelcomeScreen();
      } else {
        ui.showAppLayout();
        await this.loadDashboard();
      }

      // Event listener'ları bağla
      this._bindEvents();
      
      // Sort tercihini yükle
      const savedSort = localStorage.getItem('sortSelect');
      if (savedSort) {
        ui.currentSort = savedSort;
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) sortSelect.value = savedSort;
      }

      // Chat geçmişini yükle
      try {
        var chatMessages = await this.db.getChatMessages(50);
        chatMessages.forEach(function(m) {
          ui.addChatMessage(m.role, m.content);
        });
        var memCount = document.getElementById('countMemorySection');
        if (memCount) memCount.textContent = chatMessages.length;
      } catch (_) {}

      // Yedek hatirlaticisi: 7 gunden fazla olmussa uyar
      var lastExport = localStorage.getItem('linkslash_last_export');
      if (lastExport) {
        var days = Math.floor((Date.now() - parseInt(lastExport)) / 86400000);
        if (days >= 7) {
          setTimeout(function() {
            ui.showToast('⚠️ ' + days + ' gündür yedek alinmadi. Sag üstteki 📥 butonuna tiklayarak JSON yedegi indirebilirsin.', 'warning', 10000);
          }, 3000);
        }
      } else {
        localStorage.setItem('linkslash_last_export', Date.now().toString());
      }

      // Cop kutusu otomatik temizleme: 30 gunden eski linkleri kalici sil
      try {
        var cleaned = await this.db.cleanOldTrash();
        if (cleaned > 0) {
          console.log('[Cop] ' + cleaned + ' eski link kalici olarak silindi.');
        }
      } catch (_) {}
      
      // Drop zone'u başlat
      ui.initDropZone((text, fileName) => this.handleFileImport(text, fileName));

      // Hash routing — başlangıçta her zaman dashboard'da aç
      window.location.hash = '#dashboard';
      this._handleRoute();
      // Geçerli hash'i localStorage'a kaydet ki hashchange varsa yine dashboard'a dönülmesin
      localStorage.setItem('linkslash_lastHash', '#dashboard');
      window.addEventListener('hashchange', () => this._handleRoute());

    } catch (error) {
      console.error('Uygulama başlatma hatası:', error);
      ui.showToast('Uygulama başlatılamadı: ' + error.message, 'error');
    }
  }

  /**
   * AI sağlayıcısını localStorage'dan okuyup ilgili sınıfı başlatır.
   */
  _initAI() {
    var provider = localStorage.getItem('ai_provider') || 'groq';
    var self = this;

    if (provider === 'groq') {
      var apiKey = localStorage.getItem('groq_api_key') || '';
      if (apiKey) {
        if (!localStorage.getItem('groq_api_key') && apiKey) {
          localStorage.setItem('groq_api_key', apiKey);
        }
        this._primaryAI = new GroqAI(apiKey);
      }
    } else if (provider === 'deepseek') {
      var dsKey = localStorage.getItem('deepseek_api_key');
      if (dsKey && !ui.isDeepSeekBudgetExceeded()) {
        this._primaryAI = new DeepSeekAI(dsKey);
      } else if (dsKey) {
        ui.showToast('DeepSeek aylık bütçe limiti doldu. Kullanımı sıfırlayın ya da bütçeyi artırın.', 'warning');
      }
    } else if (provider === 'ollama') {
      var url = localStorage.getItem('ollama_url') || 'http://localhost:11434';
      var model = localStorage.getItem('ollama_model') || 'qwen2.5:7b';
      this._primaryAI = new OllamaAI(url, model);
    }

    // DeepSeek fallback (Groq icin)
    this._fallbackAI = null;
    var dsFallbackKey = localStorage.getItem('deepseek_api_key');
    if (dsFallbackKey && provider === 'groq' && !ui.isDeepSeekBudgetExceeded()) {
      this._fallbackAI = new DeepSeekAI(dsFallbackKey);
    }

    // Proxy: this.ai cagrilari once _primaryAI'ye gitsin, 429'da _fallbackAI'ye
    this.ai = this._createAIProxy();
  }

  _createAIProxy() {
    var primary = this._primaryAI;
    var fallback = this._fallbackAI;
    var self = this;

    if (!primary) {
      return {
        batchSize: 12,
        testConnection: async function() { return { success: false, error: 'AI sağlayıcısı yapılandırılmadı. Ayarlardan bir API anahtarı girin.' }; },
        categorizeLinks: async function() { throw new Error('AI sağlayıcısı yapılandırılmadı.'); },
        summarizeLink: async function() { throw new Error('AI sağlayıcısı yapılandırılmadı.'); },
        researchLinks: async function() { throw new Error('AI sağlayıcısı yapılandırılmadı.'); },
        _makeChatRequest: async function() { throw new Error('AI sağlayıcısı yapılandırılmadı.'); },
        _makeRequest: async function() { throw new Error('AI sağlayıcısı yapılandırılmadı.'); }
      };
    }

    return {
      _trackDS: function(response) {
        if (response && response.usage && response.usage.total_tokens) {
          ui.recordDeepSeekUsage(response.usage.total_tokens);
        }
      },
      _isDeepSeek: function(ai) {
        return ai && ai.constructor && ai.constructor.name === 'DeepSeekAI';
      },
      _checkBudget: function(ai) {
        if (this._isDeepSeek(ai) && ui.isDeepSeekBudgetExceeded()) {
          throw new Error('DeepSeek aylık bütçe limiti doldu. Kullanımı sıfırlayın ya da bütçeyi artırın.');
        }
      },
      _makeChatRequest: async function(messages, tools) {
        this._checkBudget(primary);
        try {
          var resp = await primary._makeChatRequest(messages, tools);
          if (this._isDeepSeek(primary)) this._trackDS(resp);
          return resp;
        } catch (err) {
          if (fallback && (err.message.indexOf('Rate limit') !== -1 || err.message.indexOf('Günlük') !== -1 || err.message.indexOf('429') !== -1)) {
            this._checkBudget(fallback);
            ui.showToast('Groq limit doldu, DeepSeek kullanılıyor', 'warning');
            var dsResp = await fallback._makeChatRequest(messages, tools);
            this._trackDS(dsResp);
            return dsResp;
          }
          throw err;
        }
      },
      _makeRequest: async function(messages) {
        this._checkBudget(primary);
        try {
          var resp = await primary._makeRequest(messages);
          if (this._isDeepSeek(primary)) this._trackDS(resp);
          return resp;
        } catch (err) {
          if (fallback && (err.message.indexOf('Rate limit') !== -1 || err.message.indexOf('Günlük') !== -1)) {
            this._checkBudget(fallback);
            ui.showToast('Groq limit doldu, DeepSeek kullanılıyor (ajan)', 'warning');
            var dsResp = await fallback._makeRequest(messages);
            this._trackDS(dsResp);
            return dsResp;
          }
          throw err;
        }
      },
      categorizeLinks: async function(links, categories, options) {
        this._checkBudget(primary);
        try {
          var resp = await primary.categorizeLinks(links, categories, options);
          if (this._isDeepSeek(primary)) this._trackDS(resp);
          return resp;
        } catch (err) {
          if (fallback && (err.message.indexOf('Rate limit') !== -1 || err.message.indexOf('Günlük') !== -1)) {
            this._checkBudget(fallback);
            ui.showToast('Groq limit doldu, DeepSeek kullanılıyor (ajan)', 'warning');
            var dsResp = await fallback.categorizeLinks(links, categories, options);
            return dsResp;
          }
          throw err;
        }
      },
      summarizeLink: async function(link, categories) {
        this._checkBudget(primary);
        try {
          var resp = await primary.summarizeLink(link, categories);
          if (this._isDeepSeek(primary)) this._trackDS(resp);
          return resp;
        } catch (err) {
          if (fallback && (err.message.indexOf('Rate limit') !== -1 || err.message.indexOf('Günlük') !== -1)) {
            this._checkBudget(fallback);
            ui.showToast('Groq limit doldu, DeepSeek kullanılıyor (ozet)', 'warning');
            var dsResp = await fallback.summarizeLink(link, categories);
            this._trackDS(dsResp);
            return dsResp;
          }
          throw err;
        }
      },
      researchLinks: async function(links, researchCriteria, proxyAvailable, progressCallback, cancellationToken, categories) {
        this._checkBudget(primary);
        try {
          var resp = await primary.researchLinks(links, researchCriteria, proxyAvailable, progressCallback, cancellationToken, categories);
          return resp;
        } catch (err) {
          if (fallback && (err.message.indexOf('Rate limit') !== -1 || err.message.indexOf('Günlük') !== -1)) {
            this._checkBudget(fallback);
            ui.showToast('Groq limit doldu, DeepSeek kullanılıyor (arastirma)', 'warning');
            var dsResp = await fallback.researchLinks(links, researchCriteria, proxyAvailable, progressCallback, cancellationToken, categories);
            return dsResp;
          }
          throw err;
        }
      },
      batchSize: primary.batchSize || 12,
      testConnection: async function() {
        return await primary.testConnection();
      }
    };
  }

  // ==========================================
  // ROUTING
  // ==========================================

  _handleRoute() {
    var raw = window.location.hash.slice(1) || 'dashboard';

    // #add?url=... → yeni link ekleme modal'ını ön doldur
    if (raw.startsWith('add')) {
      try {
        var queryStart = raw.indexOf('?');
        if (queryStart !== -1) {
          var params = new URLSearchParams(raw.substring(queryStart + 1));
          var addUrl = params.get('url') || '';
          var addTitle = params.get('title') || '';
          var addDesc = params.get('description') || '';
          var addNote = params.get('note') || '';
          if (addUrl) {
            document.getElementById('newLinkUrl').value = addUrl;
            if (addTitle) document.getElementById('newLinkTitle').value = addTitle;
            var fullNote = addNote || addDesc || '';
            if (fullNote) document.getElementById('newLinkDescription').value = fullNote;
            ui.showPlatformPreview(addUrl);
            ui.openModal('addLinkModal');
          }
        }
      } catch (_) {}
      // Ana view'e yönlendir
      const cleanHash = window.location.hash.replace(/\?.*$/, '');
      window.location.hash = '#dashboard';
      return;
    }

    var hash = raw;
    
    switch (hash) {
      case 'dashboard':
        this._clearSearch();
        this._activeFilters = { search: '', category: '', platform: '', tag: '', dateFrom: '', dateTo: '', isArchived: undefined, isFavorite: undefined };
        ui.renderFilterTags(null);
        this.loadDashboard();
        break;
      case 'import':
        this._clearSearch();
        ui.showView('import');
        ui.resetDropZone();
        ui.setImportMode('whatsapp');
        this._highlightImportTab('whatsapp');
        this._refreshUndoButton();
        break;
      case 'bulkai':
        this._clearSearch();
        this.loadBulkAI();
        break;
      case 'settings':
        this._clearSearch();
        this.loadSettings();
        break;
      default:
        if (hash.startsWith('category:')) {
          this._clearSearch();
          this.loadLinksByCategory(hash.split(':')[1]);
        } else if (hash.startsWith('platform:')) {
          this._clearSearch();
          this.loadLinksByPlatform(hash.split(':')[1]);
        } else if (hash === 'all') {
          this._clearSearch();
          this.loadAllLinks();
        } else if (hash === 'favorites') {
          this._clearSearch();
          this.loadFavorites();
        } else if (hash === 'uncategorized') {
          this._clearSearch();
          this.loadUncategorized();
        } else if (hash === 'archived-view') {
          this._clearSearch();
          this.loadArchivedView();
        } else if (hash === 'trash-view') {
          this._clearSearch();
          this.loadTrash();
        } else if (hash === 'bookmarks') {
          this._clearSearch();
          this.loadBookmarks();
        } else if (hash.startsWith('bookmark-folder/')) {
          this._clearSearch();
          this.loadBookmarkFolder(decodeURIComponent(hash.split('/').slice(1).join('/')));
        } else if (hash === 'dead-links') {
          this._clearSearch();
          this.loadDeadLinks();
        } else if (hash === 'memory') {
          this._clearSearch();
          this.loadMemoryView();
        } else if (hash.startsWith('tag:')) {
          this._clearSearch();
          this.loadLinksByTag(decodeURIComponent(hash.substring(4)));
        } else {
          this._clearSearch();
          this._activeFilters = { search: '', category: '', platform: '', tag: '', dateFrom: '', dateTo: '', isArchived: undefined, isFavorite: undefined };
          ui.renderFilterTags(null);
          this.loadDashboard();
        }
    }

    // Update mobile bottom nav active state
    var bottomNavView = 'dashboard';
    if (this._currentView === 'all') bottomNavView = 'all';
    else if (this._currentView === 'favorites') bottomNavView = 'favorites';
    else if (this._currentView === 'settings') bottomNavView = 'settings';
    ui.updateBottomNavActive(bottomNavView);
  }

  // ==========================================
  // DATA LOADING
  // ==========================================

  async loadDashboard() {
    ui.showView('dashboard');
    await ui.renderDashboard(this.db);
    ui.setActiveFilter('all');
    this._renderSidebarTags();
    this._updateTrashCount();
  }

  async loadAllLinks() {
    ui.showView('links');
    ui.setActiveFilter('all');
    this._currentView = 'all';
    this._activeFilters = { search: '', category: '', platform: '', tag: '', dateFrom: '', dateTo: '', isArchived: undefined, isFavorite: undefined };
    ui.showLoading();
    const categories = await this.db.getCategories();
    const links = await this.db.getAllLinks();
    ui.updateToolbar('Tüm Linkler', links.length);
    ui.populateCategorySelects(categories);
    this._sortAndRenderLinks(links, categories);
    this._updateFilterUI();
  }

  async loadLinksByCategory(categoryId) {
    ui.showView('links');
    ui.setActiveFilter(`category:${categoryId}`);
    this._currentView = `category:${categoryId}`;
    this._activeFilters = { search: '', category: categoryId, platform: '', tag: '', isArchived: undefined, isFavorite: undefined };
    ui.showLoading();
    const categories = await this.db.getCategories();
    const category = categories.find(c => c.id === categoryId);
    const links = await this.db.getLinks({ category: categoryId });
    this._setBackTarget('#dashboard');
    ui.updateToolbar(category ? `${category.emoji} ${category.name}` : 'Oda', links.length, true);
    ui.populateCategorySelects(categories);
    this._sortAndRenderLinks(links, categories);
    this._updateFilterUI();
  }

  async loadLinksByPlatform(platform) {
    ui.showView('links');
    ui.setActiveFilter(`platform:${platform}`);
    this._currentView = `platform:${platform}`;
    this._activeFilters = { search: '', category: '', platform: platform, tag: '', isArchived: undefined, isFavorite: undefined };
    const categories = await this.db.getCategories();
    const info = PLATFORMS[platform] || PLATFORMS.website;
    const links = await this.db.getLinks({ platform });
    this._setBackTarget('#dashboard');
    ui.updateToolbar(`${info.emoji} ${info.name}`, links.length, true);
    ui.populateCategorySelects(categories);
    this._sortAndRenderLinks(links, categories);
    for (var i = 0; i < links.length; i++) {
      links[i]._rawPlatform = links[i].platform || 'website';
    }
  }

  async loadFavorites() {
    ui.showView('links');
    ui.setActiveFilter('favorites');
    this._currentView = 'favorites';
    this._activeFilters = { search: '', category: '', platform: '', tag: '', isArchived: undefined, isFavorite: true };
    const categories = await this.db.getCategories();
    const links = await this.db.getLinks({ isFavorite: true });
    this._setBackTarget('#dashboard');
    ui.updateToolbar('⭐ Favoriler', links.length, true);
    ui.populateCategorySelects(categories);
    this._sortAndRenderLinks(links, categories);
    this._updateFilterUI();
  }

  async loadUncategorized() {
    ui.showView('links');
    ui.setActiveFilter('uncategorized');
    this._currentView = 'uncategorized';
    this._activeFilters = { search: '', category: '', platform: '', tag: '', dateFrom: '', dateTo: '', isArchived: undefined, isFavorite: undefined };
    const categories = await this.db.getCategories();
    const links = await this.db.getLinks({ category: '' });
    this._setBackTarget('#dashboard');
    ui.updateToolbar('🗃️ Odasiz', links.length, true);
    ui.populateCategorySelects(categories);
    this._sortAndRenderLinks(links, categories);
    this._updateFilterUI();
  }

  async loadArchived() {
    ui.showView('links');
    ui.setActiveFilter('archived');
    this._currentView = 'archived';
    this._activeFilters = { search: '', category: '', platform: '', tag: '', isArchived: true, isFavorite: undefined };
    const categories = await this.db.getCategories();
    const links = await this.db.getLinks({ isArchived: true });
    this._setBackTarget('#dashboard');
    ui.updateToolbar('📦 Arşiv', links.length, true);
    ui.populateCategorySelects(categories);
    this._sortAndRenderLinks(links, categories);
    this._updateFilterUI();
  }

  async loadArchivedView() {
    ui.showView('archived');
    ui.setActiveFilter('archived-view');
    const links = await this.db.getLinks({ isArchived: true });
    const categories = await this.db.getCategories();
    document.getElementById('archivedSubtitle').textContent = links.length + ' arşivlenmiş link';
    document.getElementById('archivedCount').textContent = links.length + ' link';
    var archCount = document.getElementById('countArchivedSection');
    if (archCount) archCount.textContent = links.length;
    ui.renderArchivedList(links, categories);
  }

  async loadBookmarks() {
    ui.showView('links');
    ui.setActiveFilter('bookmarks');
    this._currentView = 'bookmarks';
    var cats = await this.db.getCategories();
    var bookCat = cats.find(function(c) { return c.name === '🔖 Yer İmleri'; });
    if (!bookCat) {
      ui.showToast('Yer imi kategorisi bulunamadı', 'info');
      window.location.hash = '#dashboard';
      return;
    }
    this._activeFilters = { search: '', category: bookCat.id, platform: '', tag: '', dateFrom: '', dateTo: '', isArchived: undefined, isFavorite: undefined };
    var links = await this.db.getLinks({ category: bookCat.id });
    this._setBackTarget('#dashboard');
    ui.updateToolbar('🔖 Yer İmleri', links.length, true);
    ui.showBookmarkFolders(links);
    // Sidebar sayaclarini guncelle
    var stats = await this.db.getStats();
    ui.updateSidebarCounts(stats, cats);
    this._updateTrashCount();
    document.title = 'Yer İmleri - LinkSlash';
  }

  async loadBookmarkFolder(folderName) {
    ui.showView('links');
    ui.setActiveFilter('bookmarks:' + folderName);
    this._currentView = 'bookmarks:' + folderName;
    var cats = await this.db.getCategories();
    var bookCat = cats.find(function(c) { return c.name === '🔖 Yer İmleri'; });
    if (!bookCat) { window.location.hash = '#bookmarks'; return; }
    var allLinks = await this.db.getAllLinks();
    var folderLinks;
    var displayName;
    if (folderName === '__all__') {
      // Tum yer imlerini duz liste
      folderLinks = allLinks.filter(function(l) { return l.category === bookCat.id; });
      displayName = '📋 Tüm Yer İmleri';
    } else if (folderName === '__unsorted__') {
      folderLinks = allLinks.filter(function(l) { return l.category === bookCat.id && !l.whatsappContext; });
      displayName = '📌 Klasörsüz Linkler';
    } else {
      folderLinks = allLinks.filter(function(l) { return l.category === bookCat.id && l.whatsappContext === folderName; });
      displayName = folderName.replace('📁 ', '');
    }
    this._setBackTarget('#bookmarks');
    ui.updateToolbar(displayName, folderLinks.length, true);
    ui.renderLinkCards(folderLinks, 'linksList', cats);
    document.title = displayName.replace('📁 ', '') + ' - Yer İmleri - LinkSlash';
  }

  async loadDeadLinks() {
    ui.showView('links');
    ui.setActiveFilter('dead-links');
    this._currentView = 'dead-links';
    this._setBackTarget('#dashboard');
    ui.updateToolbar('💀 Ölü Linkler', 0, true);
    const allLinks = await this.db.getAllLinks();
    const deadLinks = allLinks.filter(function(l) { return l.healthStatus === 'dead'; });
    const categories = await this.db.getCategories();
    ui.updateToolbar('💀 Ölü Linkler', deadLinks.length, true);
    ui.renderLinkCards(deadLinks, 'linksList', categories);
    document.title = 'Ölü Linkler - LinkSlash';
  }

  async loadTrash() {
    ui.showView('links');
    ui.setActiveFilter('trash-view');
    this._currentView = 'trash-view';
    ui.showLoading();
    var trashLinks = await this.db.getTrashLinks();
    var categories = await this.db.getCategories();
    this._setBackTarget('#dashboard');
    ui.updateToolbar('🗑️ Çöp Kutusu', trashLinks.length, true);

    // Toolbar'a cop ozel butonlari ekle
    var selectAll = document.getElementById('selectAllLinksBtn');
    var batchSum = document.getElementById('batchSummarizeBtn');
    var bulkActions = document.getElementById('bulkActions');
    if (selectAll) selectAll.style.display = 'none';
    if (batchSum) batchSum.style.display = 'none';
    if (bulkActions) bulkActions.style.display = 'none';

    var toolbar = document.getElementById('toolbar');
    var existingTrashBar = document.getElementById('trashToolbarActions');
    if (existingTrashBar) existingTrashBar.remove();
    if (trashLinks.length > 0 && toolbar) {
      var trashBar = document.createElement('div');
      trashBar.id = 'trashToolbarActions';
      trashBar.style.cssText = 'display:flex;gap:8px;margin-left:auto;';
      trashBar.innerHTML = '<button class="btn btn-sm btn-ghost" id="restoreAllTrash">↩️ Tümünü Geri Yükle</button>' +
        '<button class="btn btn-sm btn-danger" id="deleteAllTrash">🗑️ Tümünü Kalıcı Sil</button>';
      toolbar.appendChild(trashBar);
    }

    if (trashLinks.length === 0) {
      document.getElementById('linksList').innerHTML = '<div class="empty-state"><p>Çöp kutusu boş.</p><p class="text-muted text-sm">Silinen linkler 30 gün burada kalır, sonra otomatik silinir.</p></div>';
    } else {
      var self = this;
      var html = '<div style="display:flex;flex-direction:column;gap:var(--sp-3)">';
      trashLinks.forEach(function(link) {
        var platform = PLATFORMS[link.platform] || PLATFORMS.website;
        var daysLeft = Math.max(0, Math.ceil((link.deletedAt + 30*86400000 - Date.now()) / 86400000));
        html += '<div class="link-card" style="opacity:0.7">' +
          '<div class="link-card-header">' +
            '<span class="platform-badge">' + platform.emoji + '</span>' +
            '<div><div class="link-card-title">' + escapeHtml(link.title || link.url) + '</div>' +
            '<span class="link-card-url">' + escapeHtml(link.url) + '</span></div>' +
          '</div>' +
          '<div class="link-card-meta">' +
            '<span>🕒 ' + daysLeft + ' gün kaldı</span>' +
          '</div>' +
          '<div class="card-actions">' +
            '<button class="btn btn-ghost btn-sm" data-action="restoreTrash" data-id="' + link.id + '">↩️ Geri Yükle</button>' +
            '<button class="btn btn-ghost btn-sm text-danger" data-action="permanentDelete" data-id="' + link.id + '">🗑️ Kalıcı Sil</button>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
      document.getElementById('linksList').innerHTML = html;

      // Toplu islem butonlari (bagimsiz)
      var restoreAll = document.getElementById('restoreAllTrash');
      var deleteAll = document.getElementById('deleteAllTrash');
      if (restoreAll) restoreAll.addEventListener('click', async function() {
        var c = await ui.confirm('Tümünü Geri Yükle', trashLinks.length + ' link geri yüklenecek. Emin misin?');
        if (!c) return;
        await self.db.restoreLinks(trashLinks.map(function(l) { return l.id; }));
        ui.showToast(trashLinks.length + ' link geri yüklendi', 'success');
        self.loadTrash();
      });
      if (deleteAll) deleteAll.addEventListener('click', async function() {
        var c = await ui.confirm('Tümünü Kalıcı Sil', trashLinks.length + ' link kalıcı olarak silinecek. Bu işlem GERİ ALINAMAZ! Emin misin?');
        if (!c) return;
        await self.db.permanentlyDeleteLinks(trashLinks.map(function(l) { return l.id; }));
        ui.showToast(trashLinks.length + ' link kalıcı olarak silindi', 'info');
        self.loadTrash();
      });
    }
    document.title = 'Çöp Kutusu - LinkSlash';
    ui.hideLoading();
  }

  async _updateTrashCount() {
    try {
      var trash = await this.db.getTrashLinks();
      var el = document.getElementById('countTrash');
      if (el) el.textContent = trash.length;
    } catch (_) {}
  }

  async loadLinksByTag(tag) {
    ui.showView('links');
    ui.setActiveFilter('tag:' + tag);
    this._currentView = 'tag:' + tag;
    this._activeFilters = { search: '', category: '', platform: '', tag: tag, isArchived: undefined, isFavorite: undefined };
    const categories = await this.db.getCategories();
    const links = await this.db.getLinksByTag(tag);
    this._setBackTarget('#dashboard');
    ui.updateToolbar('🏷️ "' + tag + '"', links.length, true);
    ui.populateCategorySelects(categories);
    this._sortAndRenderLinks(links, categories);
    this._updateFilterUI();
  }

  async loadMemoryView() {
    ui.showView('memory');
    ui.setActiveFilter('memory');
    const messages = await this.db.getChatMessages(500);
    document.getElementById('memoryCount').textContent = messages.length + ' mesaj';
    var memCount = document.getElementById('countMemorySection');
    if (memCount) memCount.textContent = messages.length;
    ui.renderMemoryList(messages);
  }

  async loadSettings() {
    ui.showView('settings');
    ui.loadApiKeyUI();
    ui.deselectAllCategories();
    const categories = await this.db.getCategories();
    ui.renderCategoryManager(categories);
    await this._loadTagManager();
    if (typeof LinkSlashCloudSync !== 'undefined') {
      LinkSlashCloudSync.updateUI();
    }
  }

  async _loadTagManager() {
    var tags = await this.db.getAllTags();
    ui.renderTagManager(tags);
  }

  async _renameTag(oldTag, newTag) {
    var trimmed = newTag.trim();
    if (!trimmed) { ui.showToast('Etiket adı boş olamaz', 'warning'); return; }
    if (oldTag === trimmed) return;
    var count = await this.db.renameTag(oldTag, trimmed);
    ui.showToast('🏷️ "' + oldTag + '" → "' + trimmed + '" (' + count + ' link)', 'success');
    await this._refreshSidebarCounts();
    await this._loadTagManager();
    this._renderSidebarTags();
  }

  async _deleteTag(tag) {
    var confirmed = await ui.confirmDialog('"' + tag + '" etiketi tüm linklerden silinecek. Devam etmek istiyor musun?');
    if (!confirmed) return;
    var count = await this.db.deleteTag(tag);
    ui.showToast('🏷️ "' + tag + '" silindi (' + count + ' link güncellendi)', 'info');
    await this._refreshSidebarCounts();
    await this._loadTagManager();
    this._renderSidebarTags();
  }

  _renderSidebarTags() {
    var self = this;
    this.db.getAllTags().then(function(tags) {
      ui.renderSidebarTags(tags);
    });
  }

  async loadBulkAI() {
    ui.showView('bulkAI');
    const allLinks = await this.db.getAllLinks();
    const uncategorized = allLinks.filter(function(l) { return !l.category; });
    const categorized = allLinks.filter(function(l) { return !!l.category; });

    document.getElementById('bulkStatTotal').textContent = allLinks.length;
    document.getElementById('bulkStatUncategorized').textContent = uncategorized.length;
    document.getElementById('bulkStatCategorized').textContent = categorized.length;

    // Önceki sonuçları temizle
    document.getElementById('bulkAIResults').classList.add('hidden');
    document.getElementById('bulkAIProgress').classList.add('hidden');
    ui.clearBulkAITable();
  }

  async reorderCategories(orderedIds) {
    try {
      await this.db.reorderCategories(orderedIds);
      const categories = await this.db.getCategories();
      const stats = await this.db.getStats();
      ui.renderSidebarCategories(categories, stats);
      this._handleRoute();
    } catch (error) {
      console.error('Sıralama hatası:', error);
      ui.showToast('Sıralama kaydedilemedi: ' + error.message, 'error');
    }
  }

  async moveCategory(categoryId, direction) {
    try {
      const categories = await this.db.getCategories();
      const idx = categories.findIndex(c => c.id === categoryId);
      if (idx === -1) return;

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= categories.length) return;

      // Yer değiştir
      [categories[idx], categories[targetIdx]] = [categories[targetIdx], categories[idx]];

      // Yeni ID sırasını kaydet
      const orderedIds = categories.map(c => c.id);
      await this.reorderCategories(orderedIds);
    } catch (error) {
      console.error('Kategori taşıma hatası:', error);
      ui.showToast('Kategori taşınamadı: ' + error.message, 'error');
    }
  }

  _sortAndRenderLinks(links, categories) {
    const [field, direction] = ui.currentSort.split('-');
    links.sort((a, b) => {
      let valA, valB;
      
      switch (field) {
        case 'dateAdded':
          valA = new Date(a.dateOriginal || a.dateAdded).getTime();
          valB = new Date(b.dateOriginal || b.dateAdded).getTime();
          break;
        case 'title':
          valA = (a.title || '').toLowerCase();
          valB = (b.title || '').toLowerCase();
          break;
        case 'platform':
          valA = a.platform || '';
          valB = b.platform || '';
          break;
        default:
          valA = new Date(a.dateOriginal || a.dateAdded).getTime();
          valB = new Date(b.dateOriginal || b.dateAdded).getTime();
      }

      if (direction === 'asc') {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      }
      return valA < valB ? 1 : valA > valB ? -1 : 0;
    });

    ui.renderLinkCards(links, 'linksList', categories);
  }

  _clearSearch() {
    var searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value) {
      searchInput.value = '';
    }
    this._activeFilters.search = '';
    var clearBtn = document.getElementById('searchClear');
    if (clearBtn) clearBtn.classList.add('hidden');
  }

  _updateFilterUI() {
    var self = this;
    var filters = this._activeFilters;

    // Kategori adı lazımsa önce onu al
    if (filters.category) {
      this.db.getCategories().then(function(cats) {
        var cat = cats.find(function(c) { return c.id === filters.category; });
        var tags = [];
        if (filters.search) tags.push({ type: 'search', label: '🔍 "' + filters.search + '"' });
        tags.push({ type: 'category', label: '📁 ' + (cat ? cat.emoji + ' ' + cat.name : filters.category) });
        if (filters.platform) {
          var info = PLATFORMS[filters.platform] || PLATFORMS.website;
          tags.push({ type: 'platform', label: info.emoji + ' ' + info.name });
        }
        if (filters.isFavorite) tags.push({ type: 'favorite', label: '⭐ Favoriler' });
        if (filters.isArchived) tags.push({ type: 'archived', label: '📦 Arşiv' });
        if (filters.tag) tags.push({ type: 'tag', label: '🏷️ "' + filters.tag + '"' });
        if (filters.dateFrom) tags.push({ type: 'dateFrom', label: '📅 ' + filters.dateFrom + ' ≥' });
        if (filters.dateTo) tags.push({ type: 'dateTo', label: '📅 ≤ ' + filters.dateTo });
        ui.renderFilterTags(tags, function(type) { self._clearFilter(type); });
      });
      return;
    }

    // Kategori yoksa direkt render
    var tags = [];
    if (filters.search) tags.push({ type: 'search', label: '🔍 "' + filters.search + '"' });
    if (filters.platform) {
      var info = PLATFORMS[filters.platform] || PLATFORMS.website;
      tags.push({ type: 'platform', label: info.emoji + ' ' + info.name });
    }
    if (filters.isFavorite) tags.push({ type: 'favorite', label: '⭐ Favoriler' });
    if (filters.isArchived) tags.push({ type: 'archived', label: '📦 Arşiv' });
    if (filters.tag) tags.push({ type: 'tag', label: '🏷️ "' + filters.tag + '"' });
    if (filters.dateFrom) tags.push({ type: 'dateFrom', label: '📅 ' + filters.dateFrom + ' ≥' });
    if (filters.dateTo) tags.push({ type: 'dateTo', label: '📅 ≤ ' + filters.dateTo });
    ui.renderFilterTags(tags, function(type) { self._clearFilter(type); });
  }

  _clearFilter(type) {
    var searchInput = document.getElementById('searchInput');
    if (type === 'category' || type === 'platform' || type === 'favorite' || type === 'archived') {
      window.location.hash = '#all';
    } else if (type === 'tag') {
      this._activeFilters.tag = '';
      this._handleRoute();
    } else if (type === 'search') {
      this._activeFilters.search = '';
      if (searchInput) { searchInput.value = ''; }
      var clearBtn = document.getElementById('searchClear');
      if (clearBtn) clearBtn.classList.add('hidden');
      this._handleRoute();
    } else if (type === 'dateFrom' || type === 'dateTo') {
      this._activeFilters.dateFrom = '';
      this._activeFilters.dateTo = '';
      document.getElementById('filterDateFrom').value = '';
      document.getElementById('filterDateTo').value = '';
      this._handleRoute();
    }
  }

  _searchLinks(query) {
    var self = this;
    var filters = {};

    // Mevcut aktif filtreleri search ile birleştir
    if (this._activeFilters.category) filters.category = this._activeFilters.category;
    if (this._activeFilters.platform) filters.platform = this._activeFilters.platform;
    if (this._activeFilters.isFavorite) filters.isFavorite = true;
    if (this._activeFilters.isArchived) filters.isArchived = true;
    if (this._activeFilters.tag) filters.tag = this._activeFilters.tag;
    if (this._activeFilters.dateFrom) filters.dateFrom = this._activeFilters.dateFrom;
    if (this._activeFilters.dateTo) filters.dateTo = this._activeFilters.dateTo;
    if (query) filters.search = query;

    ui.showView('links');
    var categoriesPromise = this.db.getCategories();
    var linksPromise = this.db.getLinks(filters);

    Promise.all([categoriesPromise, linksPromise]).then(function(results) {
      var categories = results[0];
      var links = results[1];
      var title = query ? '"' + query + '" araması' : 'Tüm Linkler';
      ui.updateToolbar(title, links.length);
      ui.populateCategorySelects(categories);
      self._activeFilters.search = query || '';
      self._sortAndRenderLinks(links, categories);
      self._updateFilterUI();

      // Clear butonunu göster/gizle
      var clearBtn = document.getElementById('searchClear');
      if (clearBtn) {
        if (query) { clearBtn.classList.remove('hidden'); }
        else { clearBtn.classList.add('hidden'); }
      }
    });
  }

  // ==========================================
  // LINK PREVIEW
  // ==========================================

  _showLinkPreview(linkId) {
    var self = this;
    var card = document.querySelector('.link-card[data-link-id="' + linkId + '"]');
    if (!card) return;
    var url = card.getAttribute('data-link-url') || '';
    if (!url) return;

    this._previewLinkId = linkId;
    ui.openModal('linkPreviewModal');
    var loadingEl = document.getElementById('previewLoading');
    var contentEl = document.getElementById('previewContent');
    var errorEl = document.getElementById('previewError');
    loadingEl.classList.remove('hidden');
    contentEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    // Link verisi + kategorileri al
    var linkPromise = this.db.getLink(linkId);
    var catPromise = this.db.getCategories();

    Promise.all([linkPromise, catPromise]).then(function(results) {
      var link = results[0];
      var categories = results[1] || [];
      self._previewLink = link;
      self._previewCategories = categories;

      // Cache kontrol
      var cached = self._previewCache.get(url);
      if (cached) {
        loadingEl.classList.add('hidden');
        self._renderPreview(cached, link, categories);
        return;
      }

      // Proxy'den çek
      var proxyUrl = PROXY_URL + '/fetch?url=' + encodeURIComponent(url);
      fetch(proxyUrl)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          loadingEl.classList.add('hidden');
          if (data.error) {
            errorEl.textContent = 'Önizleme alınamadı: ' + (data.error === 'timeout' ? 'Zaman aşımı' : data.error === 'connection_error' ? 'Bağlantı hatası' : data.error);
            errorEl.classList.remove('hidden');
            contentEl.classList.add('hidden');
            // Yine de kategori bilgisini göster
            self._renderPreview(null, link, categories);
            return;
          }
          self._previewCache.set(url, data);
          self._renderPreview(data, link, categories);
        })
        .catch(function(err) {
          loadingEl.classList.add('hidden');
          errorEl.textContent = 'Proxy bağlantı hatası. Proxy çalışıyor mu? (' + err.message + ')';
          errorEl.classList.remove('hidden');
          // Yine de kategori bilgisini göster
          self._renderPreview(null, link, categories);
        });
    });
  }

  _renderPreview(data, link, categories) {
    var contentEl = document.getElementById('previewContent');
    contentEl.classList.remove('hidden');

    if (data) {
      // Resim
      var img = document.getElementById('previewImage');
      if (data.image) {
        img.src = data.image;
        img.style.display = 'block';
        document.getElementById('previewImageArea').classList.remove('hidden');
      } else {
        img.style.display = 'none';
        document.getElementById('previewImageArea').classList.add('hidden');
      }

      // Favicon
      var favicon = document.getElementById('previewFavicon');
      if (data.favicon) {
        if (data.favicon.startsWith('http')) {
          favicon.src = data.favicon;
        } else if (data.favicon.startsWith('//')) {
          favicon.src = 'https:' + data.favicon;
        } else {
          try { favicon.src = 'https://' + new URL(data.url).hostname + data.favicon; }
          catch (_) { favicon.style.display = 'none'; }
        }
        favicon.style.display = 'inline';
      } else {
        favicon.style.display = 'none';
      }

      document.getElementById('previewSiteName').textContent = data.site_name || extractDomain(data.url);
      document.getElementById('previewTitle').textContent = data.title || extractDomain(data.url);
      document.getElementById('previewTitle').title = data.title || '';
      document.getElementById('previewDescription').textContent = data.description || 'Açıklama bulunamadı.';
      document.getElementById('previewOpenBtn').href = data.url;

      // Sayfa metni
      var textSection = document.getElementById('previewTextSection');
      var textBody = document.getElementById('previewTextBody');
      if (data.text_content && data.text_content.length > 20) {
        textBody.textContent = data.text_content;
        textSection.classList.remove('hidden');
      } else {
        textSection.classList.add('hidden');
      }
    }

    // Kategori dropdown (veri olsa da olmasa da göster)
    this._renderPreviewCategory(link, categories);
    this._bindPreviewAiButtons();
    if (link && link.aiAnalysis) {
      var resultEl = document.getElementById('previewAiResult');
      if (resultEl) resultEl.innerHTML = LinkSlashServerAI.renderAnalysisHtml(link.aiAnalysis, 'ok');
    }
  }

  _renderPreviewCategory(link, categories) {
    var self = this;
    var select = document.getElementById('previewCategorySelect');
    if (!select) return;

    var html = '<option value="">Odasiz</option>';
    (categories || []).forEach(function(c) {
      var selected = (link && link.category === c.id) ? ' selected' : '';
      html += '<option value="' + escapeHtml(c.id) + '"' + selected + '>' + c.emoji + ' ' + escapeHtml(c.name) + '</option>';
    });
    select.innerHTML = html;

    // Kategori değişikliği
    select.onchange = function() {
      var newCategory = select.value;
      if (link) {
        self.db.updateLink(link.id, { category: newCategory }).then(function() {
          ui.showToast('Kategori güncellendi', 'success');
          link.category = newCategory;
          // Dashboard/links sayfasını güncelle
          self._handleRoute();
        }).catch(function(err) {
          ui.showToast('Kategori güncellenemedi: ' + err.message, 'error');
        });
      }
    };

    // Yeni kategori ekle butonu
    var addBtn = document.getElementById('previewAddCategoryBtn');
    if (addBtn) {
      addBtn.onclick = function() {
        self._previewPendingCategory = true;
        ui.openModal('newCategoryModal');
        document.getElementById('newCatName').focus();
      };
    }
  }

  // ==========================================
  // EVENT BINDING
  // ==========================================

  _bindEvents() {
    // === Welcome Screen ===
    document.getElementById('welcomeImportBtn').addEventListener('click', () => {
      ui.showAppLayout();
      window.location.hash = '#import';
    });
    
    document.getElementById('welcomeSkipBtn').addEventListener('click', async () => {
      ui.showAppLayout();
      await this.loadDashboard();
    });

    // === Header Buttons ===
    document.getElementById('addLinkBtn').addEventListener('click', async () => {
      const categories = await this.db.getCategories();
      ui.populateCategorySelects(categories);
      ui.clearAddLinkForm();
      ui.openModal('addLinkModal');
    });

    document.getElementById('importBtn').addEventListener('click', () => {
      window.location.hash = '#import';
    });

    document.getElementById('bulkAIBtn').addEventListener('click', () => {
      window.location.hash = '#bulkai';
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
      window.location.hash = '#settings';
    });

    document.getElementById('themeToggle').addEventListener('click', () => {
      var html = document.documentElement;
      var isLight = html.getAttribute('data-theme') === 'light';
      html.setAttribute('data-theme', isLight ? '' : 'light');
      localStorage.setItem('linkslash_theme', isLight ? 'dark' : 'light');
      var darkIcon = document.querySelector('.theme-icon-dark');
      var lightIcon = document.querySelector('.theme-icon-light');
      if (darkIcon) darkIcon.style.display = isLight ? 'none' : '';
      if (lightIcon) lightIcon.style.display = isLight ? '' : 'none';
    });

    document.getElementById('sidebarToggle').addEventListener('click', () => {
      ui.toggleSidebar();
    });

    // Mobile sidebar backdrop: tap to close
    var sidebarBackdrop = document.getElementById('sidebarBackdrop');
    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener('click', function() {
        var sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar.classList.contains('collapsed')) {
          ui.toggleSidebar();
        }
      });
    }

    // Mobile bottom nav: add button opens new link modal
    var bottomNavAdd = document.getElementById('bottomNavAdd');
    if (bottomNavAdd) {
      bottomNavAdd.addEventListener('click', async function() {
        const categories = await self.db.getCategories();
        ui.populateCategorySelects(categories);
        ui.clearAddLinkForm();
        ui.openModal('addLinkModal');
      });
    }

    // Mobile swipe gestures
    this._initSwipeGestures();

    // === Search ===
    const searchInput = document.getElementById('searchInput');
    const debouncedSearch = debounce((query) => {
      if (!query.trim()) {
        this._activeFilters.search = '';
        var clearBtn = document.getElementById('searchClear');
        if (clearBtn) clearBtn.classList.add('hidden');
        this._handleRoute();
        return;
      }
      this._searchLinks(query.trim());
    }, 300);

    searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));

    // Search clear button
    document.getElementById('searchClear').addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        this._activeFilters.search = '';
        document.getElementById('searchClear').classList.add('hidden');
        this._handleRoute();
      }
    });

    // === Keyboard Shortcuts ===
    document.addEventListener('keydown', (e) => {
      // Modal açıkken kısayolları engelleme
      var modalOpen = document.querySelector('.modal-overlay:not(.hidden)');
      var inInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

      // ? → Kısayollar penceresi (input odaklı değilse)
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !inInput) {
        e.preventDefault();
        ui.openModal('shortcutsModal');
        return;
      }

      // Ctrl+K → Arama
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
      // Ctrl+N → Yeni link
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        document.getElementById('addLinkBtn').click();
      }
      // Ctrl+I → Import
      if (e.ctrlKey && e.key === 'i') {
        e.preventDefault();
        window.location.hash = '#import';
      }
      // Ctrl+D → Dashboard
      if (e.ctrlKey && !e.shiftKey && e.key === 'd') {
        e.preventDefault();
        window.location.hash = '#dashboard';
      }
      // Ctrl+B → Sidebar toggle
      if (e.ctrlKey && !e.shiftKey && e.key === 'b') {
        e.preventDefault();
        ui.toggleSidebar();
      }
      // Ctrl+Enter → Kaydet/Güncelle (modal açıkken)
      if (e.ctrlKey && e.key === 'Enter' && modalOpen) {
        e.preventDefault();
        var saveBtn = modalOpen.querySelector('#saveLinkBtn') || modalOpen.querySelector('#updateLinkBtn');
        if (saveBtn) saveBtn.click();
      }
      // Shift+Ctrl kısayolları (input odaklı değilse)
      if (e.ctrlKey && e.shiftKey && !inInput) {
        switch (e.key) {
          case 'A': case 'a': e.preventDefault(); window.location.hash = '#all'; break;
          case 'F': case 'f': e.preventDefault(); window.location.hash = '#favorites'; break;
          case 'X': case 'x': e.preventDefault(); window.location.hash = '#archived-view'; break;
          case 'S': case 's': e.preventDefault(); window.location.hash = '#settings'; break;
          case 'M': case 'm': e.preventDefault(); window.location.hash = '#memory'; break;
          case 'L': case 'l': e.preventDefault(); window.location.hash = '#dead-links'; break;
        }
      }
      // Escape → Modal kapat
      if (e.key === 'Escape') {
        ui.closeAllModals();
      }
    });

    // === Sidebar Navigation ===
    document.getElementById('sidebarCategories').addEventListener('click', (e) => {
      const reorderBtn = e.target.closest('[data-action="moveCategoryUp"], [data-action="moveCategoryDown"]');
      if (reorderBtn) {
        e.stopPropagation();
        e.preventDefault();
        const action = reorderBtn.dataset.action;
        const catId = reorderBtn.dataset.categoryId;
        if (!catId || reorderBtn.disabled) return;
        this.moveCategory(catId, action === 'moveCategoryUp' ? 'up' : 'down');
        return;
      }

      const item = e.target.closest('.sidebar-item');
      if (!item) return;
      
      const filter = item.dataset.filter;
      if (!filter) return;
      
      if (filter === 'all') {
        window.location.hash = '#dashboard';
      } else if (filter === 'favorites') {
        window.location.hash = '#favorites';
      } else if (filter === 'uncategorized') {
        window.location.hash = '#uncategorized';
      } else if (filter === 'archived-view') {
        window.location.hash = '#archived-view';
      } else if (filter === 'trash-view') {
        window.location.hash = '#trash-view';
      } else if (filter === 'dead-links') {
        window.location.hash = '#dead-links';
      } else if (filter === 'memory') {
        window.location.hash = '#memory';
      } else {
        window.location.hash = '#' + filter;
      }
    });

    document.getElementById('sidebarPlatforms').addEventListener('click', (e) => {
      const item = e.target.closest('.sidebar-item');
      if (!item) return;
      const filter = item.dataset.filter;
      if (filter) {
        window.location.hash = '#' + filter;
      }
    });

    document.getElementById('sidebarTags').addEventListener('click', (e) => {
      var item = e.target.closest('.sidebar-item');
      if (!item) return;
      var tag = item.dataset.tag;
      if (tag) {
        window.location.hash = '#tag:' + encodeURIComponent(tag);
      }
    });

    document.getElementById('manageTagsBtn').addEventListener('click', () => {
      window.location.hash = '#settings';
      setTimeout(() => {
        this._loadTagManager();
      }, 100);
    });

    // Sidebar Bölümler (Arşiv, Hafıza)
    document.getElementById('sidebarSections').addEventListener('click', (e) => {
      var item = e.target.closest('.sidebar-item');
      if (!item) return;
      var filter = item.dataset.filter;
      if (filter === 'archived-view') {
        window.location.hash = '#archived-view';
      } else if (filter === 'trash-view') {
        window.location.hash = '#trash-view';
      } else if (filter === 'memory') {
        window.location.hash = '#memory';
      } else if (filter === 'bookmarks') {
        window.location.hash = '#bookmarks';
      } else if (filter === 'dead-links') {
        window.location.hash = '#dead-links';
      }
    });

    App.prototype._setBackTarget = function(hash) {
      this._backTarget = hash;
      var labels = { '#dashboard': '← Tüm Linkler', '#bookmarks': '← Yer İmleri' };
      var btn = document.querySelector('#toolbarBack button');
      if (btn) btn.textContent = labels[hash] || '← Geri';
    };

    document.getElementById('bookmarkBackBtn').addEventListener('click', () => {
      var target = this._backTarget || '#dashboard';
      window.location.hash = target;
    });

    document.getElementById('sidebarManageCategories').addEventListener('click', () => {
      window.location.hash = '#settings';
    });

    // === Archived View Events ===
    document.getElementById('archiveRestoreSelectedBtn').addEventListener('click', async () => {
      var checks = document.querySelectorAll('.archive-check:checked');
      var ids = Array.from(checks).map(function(c) { return c.dataset.id; });
      if (ids.length === 0) { ui.showToast('Seçili link yok', 'warning'); return; }
      for (var i = 0; i < ids.length; i++) {
        await this.db.updateLink(ids[i], { isArchived: false });
      }
      ui.showToast(ids.length + ' link arşivden geri yüklendi', 'success');
      this.loadArchivedView();
    });

    document.getElementById('archiveDeleteSelectedBtn').addEventListener('click', async () => {
      var checks = document.querySelectorAll('.archive-check:checked');
      var ids = Array.from(checks).map(function(c) { return c.dataset.id; });
      if (ids.length === 0) { ui.showToast('Seçili link yok', 'warning'); return; }
      var confirmed = await ui.confirmDialog(ids.length + ' link kalıcı olarak silinecek. Bu işlem geri alınamaz!');
      if (!confirmed) return;
      await this.db.permanentlyDeleteLinks(ids);
      ui.showToast(ids.length + ' link kalıcı olarak silindi', 'success');
      this.loadArchivedView();
    });

    // Archived list item actions (event delegation)
    document.getElementById('archivedList').addEventListener('click', async (e) => {
      var restoreBtn = e.target.closest('[data-action="archiveRestore"]');
      if (restoreBtn) {
        await this.db.updateLink(restoreBtn.dataset.id, { isArchived: false });
        ui.showToast('Link geri yüklendi', 'success');
        this.loadArchivedView();
        return;
      }
      var deleteBtn = e.target.closest('[data-action="archiveDelete"]');
      if (deleteBtn) {
        var confirmed = await ui.confirmDialog('Bu link kalıcı olarak silinsin mi? Bu işlem geri alınamaz!');
        if (!confirmed) return;
        await this.db.permanentlyDeleteLinks([deleteBtn.dataset.id]);
        ui.showToast('Link kalıcı olarak silindi', 'success');
        this.loadArchivedView();
      }
    });
    document.getElementById('archivedList').addEventListener('change', async (e) => {
      var sel = e.target.closest('[data-action="changeCategory"]');
      if (!sel) return;
      var linkId = sel.dataset.linkId;
      var newCatId = sel.value;
      await this.db.updateLink(linkId, { category: newCatId });
      ui.showToast('Oda değiştirildi', 'success');
      var cats = await this.db.getCategories();
      var stats = await this.db.getStats();
      ui.updateSidebarCounts(stats, cats);
    });

    // === Memory View Events ===
    document.getElementById('memoryClearBtn').addEventListener('click', async () => {
      var confirmed = await ui.confirmDialog('Tüm konuşma geçmişi silinecek. Emin misin?');
      if (!confirmed) return;
      await this.db.clearChatMessages();
      ui.showToast('Konuşma geçmişi temizlendi', 'success');
      this.loadMemoryView();
    });

    // === Dashboard ===
    document.getElementById('categoryGrid').addEventListener('click', (e) => {
      const card = e.target.closest('.category-card');
      if (card) {
        const catId = card.dataset.category;
        window.location.hash = `#category:${catId}`;
      }
    });

    document.getElementById('viewAllLinksBtn').addEventListener('click', () => {
      window.location.hash = '#all';
    });

    // === Link Card Actions (Event Delegation) ===
    const handleLinkAction = async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      
      const action = btn.dataset.action;
      const linkId = btn.dataset.linkId || btn.dataset.id;
      
      switch (action) {
        case 'toggleFavorite':
          await this.toggleFavorite(linkId);
          break;
        case 'toggleArchive':
          await this.toggleArchive(linkId);
          break;
        case 'editLink':
          await this.openEditLink(linkId);
          break;
        case 'deleteLink':
          await this.deleteLink(linkId);
          break;
        case 'selectLink':
          ui.toggleLinkSelection(linkId);
          break;
        case 'previewLink':
          this._showLinkPreview(linkId);
          break;
        case 'summarizeLink':
          ui.showToast('🔍 Link özetleniyor...', 'info');
          await this.summarizeSingleLink(linkId);
          break;
        case 'aiAnalyze':
          ui.showToast('🤖 AI analiz başlatılıyor...', 'info');
          await this.runServerAiAnalyze(linkId, 'full');
          break;
        case 'shareLink':
          await this.shareLink(linkId);
          break;
        case 'restoreTrash':
          await this.db.restoreLink(linkId);
          ui.showToast('Link geri yüklendi', 'success');
          this.loadTrash();
          break;
        case 'permanentDelete':
          var c = await ui.confirm('Kalıcı Sil', 'Bu link tamamen silinecek. Geri alınamaz!');
          if (!c) return;
          await this.db.permanentlyDeleteLinks([linkId]);
          ui.showToast('Link kalıcı olarak silindi', 'info');
          this.loadTrash();
          break;
      }
    };

    document.getElementById('linksList').addEventListener('click', handleLinkAction);
    document.getElementById('recentLinks').addEventListener('click', handleLinkAction);

    // === Load More ===
    document.getElementById('linksList').addEventListener('click', (e) => {
      if (e.target.id === 'loadMoreBtn') {
        ui.loadMoreLinks();
      }
    });

    // === Category Change (inline room dropdown) ===
    document.getElementById('linksList').addEventListener('change', async (e) => {
      var sel = e.target.closest('[data-action="changeCategory"]');
      if (!sel) return;
      var linkId = sel.dataset.linkId;
      var newCatId = sel.value;
      await this.db.updateLink(linkId, { category: newCatId });
      ui.showToast('Oda değiştirildi', 'success');
      var cats = await this.db.getCategories();
      var stats = await this.db.getStats();
      ui.updateSidebarCounts(stats, cats);
    });
    document.getElementById('recentLinks').addEventListener('change', async (e) => {
      var sel = e.target.closest('[data-action="changeCategory"]');
      if (!sel) return;
      var linkId = sel.dataset.linkId;
      var newCatId = sel.value;
      await this.db.updateLink(linkId, { category: newCatId });
      ui.showToast('Oda değiştirildi', 'success');
      var cats = await this.db.getCategories();
      var stats = await this.db.getStats();
      ui.updateSidebarCounts(stats, cats);
    });

    // === Tag Click (link kartlarındaki etiketler) ===
    function handleTagClick(e) {
      var tagEl = e.target.closest('.tag-clickable');
      if (!tagEl) return;
      e.preventDefault();
      e.stopPropagation();
      var tag = tagEl.dataset.tag;
      if (tag) window.location.hash = '#tag:' + encodeURIComponent(tag);
    }
    document.getElementById('linksList').addEventListener('click', handleTagClick);
    document.getElementById('recentLinks').addEventListener('click', handleTagClick);

    // === Sort ===
    document.getElementById('sortSelect').addEventListener('change', (e) => {
      ui.currentSort = e.target.value;
      localStorage.setItem('sortSelect', ui.currentSort);
      this._handleRoute();
    });

    // === Bulk Actions ===
    document.getElementById('bulkCategoryBtn').addEventListener('click', async () => {
      const categories = await this.db.getCategories();
      ui.renderBulkCategoryModal(categories, ui.selectedLinks.size, async (categoryId) => {
        await this.bulkSetCategory(categoryId);
      });
    });
    document.getElementById('bulkTagBtn').addEventListener('click', async () => {
      var tagsStr = prompt('Etiket(ler) girin (virgülle ayırın):');
      if (!tagsStr) return;
      await this.bulkSetTags(tagsStr);
    });

    document.getElementById('bulkDeleteBtn').addEventListener('click', async () => {
      const confirmed = await ui.confirm(
        'Toplu Silme',
        `${ui.selectedLinks.size} link silinecek. Emin misin?`
      );
      if (confirmed) {
        await this.bulkDelete();
      }
    });

    document.getElementById('bulkDeselectBtn').addEventListener('click', () => {
      ui.clearSelection();
    });

    document.getElementById('selectAllLinksBtn').addEventListener('click', async () => {
      const links = await this.db.getAllLinks();
      ui.selectAllLinks(links.map(l => l.id));
    });

    document.getElementById('bulkArchiveBtn').addEventListener('click', async () => {
      await this.bulkArchive();
    });

    document.getElementById('bulkFavoriteBtn').addEventListener('click', async () => {
      await this.bulkFavorite();
    });

    document.getElementById('checkLinksBtn').addEventListener('click', async () => {
      await this.checkAllLinks();
    });
    document.getElementById('batchSummarizeBtn').addEventListener('click', async () => {
      await this.batchSummarize();
    });

    // === Filter Panel Events ===
    document.getElementById('toggleFilterPanelBtn').addEventListener('click', () => {
      var panel = document.getElementById('filterPanel');
      panel.classList.toggle('hidden');
    });

    document.getElementById('applyFiltersBtn').addEventListener('click', () => {
      this._activeFilters.dateFrom = document.getElementById('filterDateFrom').value || '';
      this._activeFilters.dateTo = document.getElementById('filterDateTo').value || '';
      var panel = document.getElementById('filterPanel');
      panel.classList.add('hidden');
      this._handleRoute();
    });

    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
      this._activeFilters.dateFrom = '';
      this._activeFilters.dateTo = '';
      document.getElementById('filterDateFrom').value = '';
      document.getElementById('filterDateTo').value = '';
      var panel = document.getElementById('filterPanel');
      panel.classList.add('hidden');
      this._handleRoute();
    });

    document.querySelectorAll('.filter-quick-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var days = parseInt(this.dataset.days, 10);
        var from = new Date();
        from.setDate(from.getDate() - days);
        document.getElementById('filterDateFrom').value = from.toISOString().split('T')[0];
        document.getElementById('filterDateTo').value = new Date().toISOString().split('T')[0];
      });
    });

    // === Tag Manager Events ===
    document.getElementById('tagManagerList').addEventListener('click', async (e) => {
      var renameBtn = e.target.closest('.tag-rename-btn');
      if (renameBtn) {
        var oldTag = renameBtn.dataset.tag;
        var newTag = prompt('Yeni etiket adı:', oldTag);
        if (newTag && newTag.trim() && newTag.trim() !== oldTag) {
          await this._renameTag(oldTag, newTag.trim());
        }
        return;
      }
      var deleteBtn = e.target.closest('.tag-delete-btn');
      if (deleteBtn) {
        await this._deleteTag(deleteBtn.dataset.tag);
      }
    });

    // === Save New Link ===
    document.getElementById('saveLinkBtn').addEventListener('click', async () => {
      await this.saveNewLink();
    });

    // === URL Preview ===
    document.getElementById('newLinkUrl').addEventListener('input', (e) => {
      ui.showPlatformPreview(e.target.value);
    });

    // === Update Link ===
    document.getElementById('updateLinkBtn').addEventListener('click', async () => {
      await this.updateLink();
    });

    // === Modal Close Buttons ===
    document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
      if (btn.classList.contains('modal-close') || btn.closest('.modal-footer')) {
        btn.addEventListener('click', () => {
          const modalId = btn.dataset.modal;
          if (modalId) {
            ui.closeModal(modalId);
          }
        });
      }
    });

    // Modal overlay tıklama ile kapat
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.add('hidden');
        }
      });
    });

    // === Import Events ===
    document.getElementById('importSelectAll').addEventListener('change', (e) => {
      ui.selectAllImport(e.target.checked);
    });

    document.getElementById('importTableBody').addEventListener('change', (e) => {
      if (e.target.classList.contains('import-row-check')) {
        const index = parseInt(e.target.dataset.index);
        ui.toggleImportSelection(index);
      }
    });

    document.getElementById('selectAllImportBtn').addEventListener('click', () => {
      ui.selectAllImport(true);
      document.getElementById('importSelectAll').checked = true;
    });

    document.getElementById('aiCategorizeBtn').addEventListener('click', () => {
      this.aiCategorize();
    });

    document.getElementById('manualCategoryImportBtn').addEventListener('click', async () => {
      const categories = await this.db.getCategories();
      ui.renderBulkCategoryModal(categories, ui.selectedImportLinks.size, (categoryId) => {
        // Seçili import satırlarının kategorisini güncelle
        ui.selectedImportLinks.forEach(index => {
          const catSelect = document.querySelector(`.import-category[data-index="${index}"]`);
          if (catSelect) catSelect.value = categoryId;
        });
        ui.showToast(`${ui.selectedImportLinks.size} linke kategori atandı`, 'success');
      });
    });

    document.getElementById('saveImportBtn').addEventListener('click', () => {
      this.saveImportedLinks();
    });

    document.getElementById('undoImportBtn').addEventListener('click', async () => {
      await this.undoLastBookmarkImport();
    });

    // Import mode tabs
    document.querySelector('.import-tabs').addEventListener('click', (e) => {
      var tab = e.target.closest('.import-tab');
      if (!tab) return;
      var mode = tab.dataset.importMode;
      this._highlightImportTab(mode);
      ui.resetDropZone();
      ui.setImportMode(mode);
      // Bookmark modunda geri al butonunu göster/gizle
      this._refreshUndoButton();
    });

    // === Bulk AI Events ===
    document.getElementById('startBulkAIBtn').addEventListener('click', () => {
      this.startBulkAICategorization(false);
    });
    document.getElementById('startBulkAIAllBtn').addEventListener('click', () => {
      this.startBulkAICategorization(true);
    });
    document.getElementById('bulkAIApplyAllBtn').addEventListener('click', () => {
      if (this._agentResults && this._agentResults.length > 0) {
        this.applyAgentResults(true);
      } else {
        this.applyBulkAIResults(true);
      }
    });
    document.getElementById('bulkAISelectAllBtn').addEventListener('click', () => {
      ui.toggleBulkAISelectAll(true);
    });
    document.getElementById('bulkAIDeselectAllBtn').addEventListener('click', () => {
      ui.toggleBulkAISelectAll(false);
    });
    document.getElementById('bulkAISelectAllCheck').addEventListener('change', (e) => {
      ui.toggleBulkAISelectAll(e.target.checked);
    });

    // İptal butonu (hem bulk AI hem ajan için)
    var cancelBtn = document.getElementById('cancelBulkAIBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this._bulkAICancelled = true;
        this._agentCancelled = true;
        if (this._agentCancelToken) this._agentCancelToken.cancelled = true;
        ui.showToast('Islem durduruluyor...', 'warning');
      });
    }

    // Ajan Modu
    document.getElementById('startAgentBtn').addEventListener('click', async () => {
      var criteria = document.getElementById('agentCriteria').value.trim() || 'Genel icerik analizi';
      var platforms = Array.from(document.querySelectorAll('.agent-platform:checked')).map(function(cb) { return cb.value; });
      if (platforms.length === 0) {
        ui.showToast('En az bir platform seçmelisin', 'warning');
        return;
      }
      await this.runAgent(platforms, criteria);
    });

    // Mega buton: Tum linkleri AI ile duzenle
    document.getElementById('autoOrganizeBtn').addEventListener('click', async () => {
      await this.autoOrganizeAll();
    });

    // Hizli yedek butonu
    document.getElementById('quickBackupBtn').addEventListener('click', async () => {
      await this.exportJson();
    });

    // === AI Chat Events ===
    document.getElementById('chatFab').addEventListener('click', () => {
      ui.toggleChatPanel(true);
    });
    document.getElementById('closeChatBtn').addEventListener('click', () => {
      ui.toggleChatPanel(false);
    });
    document.getElementById('sendChatBtn').addEventListener('click', () => {
      this.handleChatMessage();
    });
    document.getElementById('chatInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleChatMessage();
      }
    });

    // === Settings Events ===
    
    // API Key kaydet
    document.getElementById('apiKeyInput').addEventListener('change', (e) => {
      const key = e.target.value.trim();
      if (key) {
        localStorage.setItem('groq_api_key', key);
        this._initAI();
        ui.showToast('API key kaydedildi', 'success');
      } else {
        localStorage.removeItem('groq_api_key');
        this._initAI();
      }
    });

    // API Key test
    document.getElementById('testApiKeyBtn').addEventListener('click', async () => {
      const key = document.getElementById('apiKeyInput').value.trim();
      if (!key) {
        ui.showApiKeyStatus(false, 'API key girilmedi');
        return;
      }
      
      localStorage.setItem('groq_api_key', key);
      var testAI = new GroqAI(key);
      
      ui.showApiKeyStatus(false, 'Test ediliyor...');
      const result = await testAI.testConnection();
      
      if (result.success) {
        ui.showApiKeyStatus(true, '✅ Bağlantı başarılı!');
        ui.showToast('Groq bağlantısı başarılı!', 'success');
      } else {
        ui.showApiKeyStatus(false, `❌ Hata: ${result.error}`);
        ui.showToast('Bağlantı başarısız: ' + result.error, 'error');
      }
    });

    // API Key göster/gizle
    document.getElementById('toggleApiKeyVisibility').addEventListener('click', () => {
      const input = document.getElementById('apiKeyInput');
      input.type = input.type === 'password' ? 'text' : 'password';
    });

    // AI Sağlayıcı seçimi
    var aiProviderSelect = document.getElementById('aiProviderSelect');
    if (aiProviderSelect) {
      var savedProvider = localStorage.getItem('ai_provider') || 'groq';
      aiProviderSelect.value = savedProvider;
      ui.toggleAIProviderSettings(savedProvider);
      aiProviderSelect.addEventListener('change', (e) => {
        var provider = e.target.value;
        localStorage.setItem('ai_provider', provider);
        ui.toggleAIProviderSettings(provider);
        this._initAI();
        ui.showToast('AI sağlayıcı: ' + (provider === 'groq' ? 'Groq' : provider === 'deepseek' ? 'DeepSeek' : 'Ollama'), 'success');
      });
    }

    // Ollama URL & Model kaydet
    document.getElementById('ollamaUrl').addEventListener('change', (e) => {
      localStorage.setItem('ollama_url', e.target.value.trim());
      this._initAI();
    });
    document.getElementById('ollamaModel').addEventListener('change', (e) => {
      localStorage.setItem('ollama_model', e.target.value.trim());
      this._initAI();
    });

    // DeepSeek API key
    var dsKeyInput = document.getElementById('deepseekApiKey');
    if (dsKeyInput) {
      dsKeyInput.addEventListener('change', (e) => {
        localStorage.setItem('deepseek_api_key', e.target.value.trim());
        if (localStorage.getItem('ai_provider') === 'groq' || localStorage.getItem('ai_provider') === 'deepseek') {
          this._initAI();
        }
      });
    }

    // DeepSeek budget
    var dsBudget = document.getElementById('deepseekBudget');
    if (dsBudget) {
      dsBudget.addEventListener('change', (e) => {
        localStorage.setItem('deepseek_monthly_budget', e.target.value);
      });
    }

    // DeepSeek test
    document.getElementById('testDeepSeekBtn').addEventListener('click', async () => {
      var key = document.getElementById('deepseekApiKey').value.trim();
      if (!key) { ui.showToast('Önce DeepSeek API key gir', 'error'); return; }
      localStorage.setItem('deepseek_api_key', key);
      var testAI = new DeepSeekAI(key);
      ui._updateDeepSeekUsageDisplay();
      var el = document.getElementById('deepseekStatus');
      if (el) { el.classList.remove('hidden'); el.className = 'api-key-status'; el.textContent = 'Test ediliyor...'; }
      var result = await testAI.testConnection();
      if (result.success) {
        if (el) { el.className = 'api-key-status api-key-success'; el.textContent = '✅ DeepSeek bağlantısı başarılı!'; }
        ui.showToast('DeepSeek bağlantısı başarılı!', 'success');
      } else {
        if (el) { el.className = 'api-key-status api-key-error'; el.textContent = '❌ ' + result.error; }
        ui.showToast('DeepSeek bağlantısı başarısız: ' + result.error, 'error');
      }
    });

    // DeepSeek usage reset
    document.getElementById('resetDeepSeekUsage').addEventListener('click', () => {
      localStorage.setItem('deepseek_usage', JSON.stringify({ month: '', tokens: 0 }));
      ui._updateDeepSeekUsageDisplay();
      ui.showToast('DeepSeek kullanım sayacı sıfırlandı', 'info');
    });

    // Ollama test
    document.getElementById('testOllamaBtn').addEventListener('click', async () => {
      var url = document.getElementById('ollamaUrl').value.trim() || 'http://localhost:11434';
      var model = document.getElementById('ollamaModel').value.trim() || 'qwen2.5:7b';
      localStorage.setItem('ollama_url', url);
      localStorage.setItem('ollama_model', model);
      var testAI = new OllamaAI(url, model);
      ui.showOllamaStatus(false, 'Test ediliyor...');
      var result = await testAI.testConnection();
      if (result.success) {
        ui.showOllamaStatus(true, '✅ Ollama bağlantısı başarılı!');
        ui.showToast('Ollama bağlantısı başarılı!', 'success');
      } else {
        ui.showOllamaStatus(false, '❌ ' + result.error);
        ui.showToast('Ollama bağlantısı başarısız: ' + result.error, 'error');
      }
    });

    // Yeni kategori ekle
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
      ui.openModal('newCategoryModal');
    });

    document.getElementById('saveNewCategoryBtn').addEventListener('click', async () => {
      await this.saveNewCategory();
    });

    document.getElementById('updateCategoryBtn').addEventListener('click', async () => {
      await this.updateCategory();
    });

    // Kategori düzenle/sil/sırala (event delegation)
    document.getElementById('categoryManagerList').addEventListener('click', async (e) => {
      const check = e.target.closest('.category-manager-check');
      if (check) {
        ui.toggleCategorySelection(check.dataset.categoryId);
        const item = check.closest('.category-manager-item');
        if (item) item.classList.toggle('selected', check.checked);
        return;
      }

      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      
      const action = btn.dataset.action;
      const catId = btn.dataset.categoryId;
      
      if (action === 'editCategory') {
        const categories = await this.db.getCategories();
        const cat = categories.find(c => c.id === catId);
        if (cat) ui.openEditCategoryModal(cat);
      } else if (action === 'deleteCategory') {
        const confirmed = await ui.confirm(
          'Odayi Sil',
          'Bu oda silinecek. İçindeki linkler odasiz kalacak. Devam et?'
        );
        if (confirmed) {
          await this.db.deleteCategory(catId);
          const links = await this.db.getLinks({ category: catId });
          for (const link of links) {
            await this.db.updateLink(link.id, { category: '' });
          }
          await this.loadSettings();
          ui.showToast('Kategori silindi', 'success');
        }
      } else if (action === 'moveCategoryUp' || action === 'moveCategoryDown') {
        if (btn.disabled) return;
        await this.moveCategory(catId, action === 'moveCategoryUp' ? 'up' : 'down');
      }
    });

    document.getElementById('selectAllCategoriesBtn').addEventListener('click', async () => {
      const categories = await this.db.getCategories();
      ui.selectAllCategories(categories.map(c => c.id));
      ui.renderCategoryManager(categories);
    });

    document.getElementById('deselectAllCategoriesBtn').addEventListener('click', async () => {
      ui.deselectAllCategories();
      const categories = await this.db.getCategories();
      ui.renderCategoryManager(categories);
    });

    document.getElementById('deleteSelectedCategoriesBtn').addEventListener('click', async () => {
      const selected = ui.getSelectedCategories();
      if (selected.length === 0) {
        ui.showToast('Silinecek oda secilmedi', 'warning');
        return;
      }
      const confirmed = await ui.confirm(
        'Odalari Sil',
        selected.length + ' oda silinecek. İçindeki linkler odasiz kalacak. Devam et?'
      );
      if (!confirmed) return;
      for (const catId of selected) {
        await this.db.deleteCategory(catId);
        const links = await this.db.getLinks({ category: catId });
        for (const link of links) {
          await this.db.updateLink(link.id, { category: '' });
        }
      }
      ui.deselectAllCategories();
      await this.loadSettings();
      ui.showToast(selected.length + ' oda silindi', 'success');
    });

    document.getElementById('deleteAllCategoriesBtn').addEventListener('click', async () => {
      const categories = await this.db.getCategories();
      if (categories.length === 0) {
        ui.showToast('Silinecek oda yok', 'info');
        return;
      }
      const confirmed = await ui.confirm(
        'Tum Odalari Sil',
        categories.length + ' oda silinecek. İçindeki tüm linkler kategorisiz olacak. Devam et?'
      );
      if (!confirmed) return;
      for (const cat of categories) {
        await this.db.deleteCategory(cat.id);
        const links = await this.db.getLinks({ category: cat.id });
        for (const link of links) {
          await this.db.updateLink(link.id, { category: '' });
        }
      }
      ui.deselectAllCategories();
      await this.loadSettings();
      ui.showToast('Tum odalar silindi', 'success');
    });

    document.getElementById('loadDefaultCategoriesBtn').addEventListener('click', async () => {
      const defaults = DEFAULT_CATEGORIES;
      const existing = await this.db.getCategories();
      const existingIds = new Set(existing.map(c => c.id));
      var added = 0;
      for (const def of defaults) {
        if (existingIds.has(def.id)) continue;
        await this.db.addCategory({
          id: def.id,
          name: def.name,
          emoji: def.emoji,
          color: def.color,
          description: def.description || '',
          order: def.order || 0
        });
        added++;
      }
      await this.loadSettings();
      ui.showToast(added + ' varsayilan oda yuklendi', 'success');
    });

    // Cloud Sync manual trigger
    var cloudSyncBtn = document.getElementById('cloudSyncNowBtn');
    if (cloudSyncBtn) {
      cloudSyncBtn.addEventListener('click', async () => {
        if (typeof LinkSlashCloudSync !== 'undefined') {
          await LinkSlashCloudSync.runFullSync(this.db, ui);
          ui.showToast('☁️ Cloud sync tamamlandı', 'success');
          this._handleRoute();
        }
      });
    }

    // Export
    document.getElementById('exportJsonBtn').addEventListener('click', async () => {
      await this.exportJson();
    });
    document.getElementById('exportCsvBtn').addEventListener('click', async () => {
      await this.exportCsv();
    });

    // Import JSON
    document.getElementById('importDataBtn').addEventListener('click', () => {
      document.getElementById('importJsonInput').click();
    });

    document.getElementById('importJsonInput').addEventListener('change', async (e) => {
      if (e.target.files.length > 0) {
        await this.importJsonData(e.target.files[0]);
      }
    });

    // Clear all
    document.getElementById('clearAllDataBtn').addEventListener('click', async () => {
      const confirmed = await ui.confirm(
        '⚠️ Tüm Verileri Sil',
        'Bu işlem geri alınamaz! Tüm linkler, odalar ve ayarlar silinecek.'
      );
      if (confirmed) {
        await this.db.clearAll();
        await this.db.init(); // Varsayilan odalari yeniden olustur
        ui.showToast('Tüm veriler silindi', 'info');
        window.location.hash = '#dashboard';
        await this.loadDashboard();
      }
    });
  }

  // ==========================================
  // MOBILE SWIPE GESTURES
  // ==========================================

  _initSwipeGestures() {
    var touchStartX = 0;
    var touchStartY = 0;
    var touchStartTime = 0;
    var swipeTarget = null;

    document.addEventListener('touchstart', function(e) {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
      touchStartTime = Date.now();
      swipeTarget = e.target;
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
      var touchEndX = e.changedTouches[0].screenX;
      var touchEndY = e.changedTouches[0].screenY;
      var deltaX = touchEndX - touchStartX;
      var deltaY = touchEndY - touchStartY;
      var elapsed = Date.now() - touchStartTime;

      if (elapsed > 500) return; // too slow

      var absX = Math.abs(deltaX);
      var absY = Math.abs(deltaY);

      // Horizontal swipe
      if (absX > absY && absX > 80) {
        var sidebar = document.getElementById('sidebar');
        var isCollapsed = sidebar && sidebar.classList.contains('collapsed');

        // Swipe from left edge to open sidebar
        if (deltaX > 0 && touchStartX < 24 && isCollapsed) {
          ui.toggleSidebar();
          return;
        }

        // Swipe right on sidebar to close it
        if (deltaX < 0 && !isCollapsed && swipeTarget && swipeTarget.closest('#sidebar')) {
          ui.toggleSidebar();
          return;
        }
      }

      // Vertical swipe: pull down modal header to close modal
      if (absY > absX && deltaY > 80 && swipeTarget && swipeTarget.closest('.modal-header')) {
        var modal = swipeTarget.closest('.modal');
        if (modal) {
          var overlay = modal.closest('.modal-overlay');
          if (overlay) overlay.classList.add('hidden');
        }
      }
    }, { passive: true });
  }

  // ==========================================
  // CRUD İŞLEMLERİ
  // ==========================================

  async saveNewLink() {
    const linkData = ui.getNewLinkData();
    if (!linkData) {
      ui.showToast('Geçerli bir URL girin', 'error');
      return;
    }

    try {
      // Duplicate kontrolü
      const existingLinks = await this.db.getAllLinks();
      if (existingLinks.some(l => l.url === linkData.url)) {
        ui.showToast('Bu URL zaten kayıtlı!', 'warning');
        return;
      }

      const added = await this.db.addLink(linkData);
      if (typeof LinkSlashCloudSync !== 'undefined') {
        await this.db.putLink(Object.assign({}, added, { _syncPending: true, _localUpdatedAt: new Date().toISOString() }));
        LinkSlashCloudSync.schedulePush(this.db, ui);
      }
      ui.closeModal('addLinkModal');
      ui.clearAddLinkForm();
      ui.showToast('Link eklendi!', 'success');
      this._handleRoute(); // Mevcut view'ı yenile
    } catch (error) {
      ui.showToast('Link eklenemedi: ' + error.message, 'error');
    }
  }

  async openEditLink(linkId) {
    const link = await this.db.getLink(linkId);
    if (!link) return;
    const categories = await this.db.getCategories();
    ui.openEditModal(link, categories);
  }

  async shareLink(linkId) {
    const link = await this.db.getLink(linkId);
    if (!link) return;
    const shareData = {
      title: link.title || 'LinkSlash',
      text: link.description || link.title || '',
      url: link.url
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') {
          ui.showToast('Paylaşma hatası: ' + err.message, 'error');
        }
      }
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(link.url);
        ui.showToast('Link panoya kopyalandı', 'success');
      } catch (err) {
        ui.showToast('Kopyalama başarısız', 'error');
      }
    } else {
      ui.showToast('Paylaşma desteklenmiyor', 'warning');
    }
  }

  async updateLink() {
    const data = ui.getEditLinkData();
    if (!data || !data.id) return;

    try {
      const updated = await this.db.updateLink(data.id, {
        url: data.url,
        title: data.title || extractDomain(data.url),
        category: data.category,
        description: data.description,
        tags: data.tags,
        platform: detectPlatform(data.url),
        _syncPending: true,
        _localUpdatedAt: new Date().toISOString()
      });
      if (typeof LinkSlashCloudSync !== 'undefined') {
        LinkSlashCloudSync.schedulePush(this.db, ui);
      }
      ui.closeModal('editLinkModal');
      ui.showToast('Link güncellendi!', 'success');
      this._handleRoute();
    } catch (error) {
      ui.showToast('Güncelleme hatası: ' + error.message, 'error');
    }
  }

  async deleteLink(linkId) {
    const confirmed = await ui.confirm('Çöp Kutusu', 'Bu link çöp kutusuna taşınacak. 30 gün sonra otomatik silinir.');
    if (!confirmed) return;

    try {
      const link = await this.db.getLink(linkId);
      await this.db.deleteLink(linkId);
      if (link && link.cloudId && typeof LinkSlashCloudSync !== 'undefined') {
        fetch('/api/linkslash/sync/push', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ changes: [{ op: 'delete', entityType: 'link', cloudId: link.cloudId, localId: link.id }] })
        }).catch(function() {});
      } else if (typeof LinkSlashCloudSync !== 'undefined') {
        LinkSlashCloudSync.schedulePush(this.db, ui);
      }
      ui.showToast('🗑️ Link çöp kutusuna taşındı', 'info');
      this._handleRoute();
    } catch (error) {
      ui.showToast('Hata: ' + error.message, 'error');
    }
  }

  async toggleFavorite(linkId) {
    const link = await this.db.getLink(linkId);
    if (!link) return;

    await this.db.updateLink(linkId, { isFavorite: !link.isFavorite });
    
    if (!link.isFavorite) {
      ui.showToast('Favorilere eklendi ⭐', 'success');
    } else {
      ui.showToast('Favorilerden çıkarıldı', 'info');
    }
    
    this._handleRoute();
  }

  async summarizeSingleLink(linkId) {
    try {
      var link = await this.db.getLink(linkId);
      if (!link) { ui.showToast('Link bulunamadı', 'error'); return; }
      if (!this.ai) { ui.showToast('Önce Ayarlar\'dan API anahtarı girmelisin', 'warning'); return; }

      // Proxy'den içerik çek
      var proxyUrl = PROXY_URL + '/summarize?url=' + encodeURIComponent(link.url);
      var resp = await fetch(proxyUrl);
      var data = await resp.json();
      if (data.error && !data.text_content) {
        ui.showToast('Sayfa içeriği çekilemedi: ' + data.error, 'warning');
        return;
      }

      var cats = await this.db.getCategories();
      var result = await this.ai.summarizeLink({
        url: link.url,
        title: link.title || '',
        description: link.description || '',
        text_content: data.text_content || data.description || ''
      }, cats);

      if (result.summary) {
        await this.db.updateLink(linkId, {
          summary: result.summary,
          aiTags: result.aiTags || [],
          aiSuggestCategory: result.suggestedCategory || '',
          summarizedAt: new Date().toISOString()
        });
        ui.showToast('✅ Özet çıkarıldı', 'success');
        this._handleRoute();
      } else {
        ui.showToast('Özet çıkarılamadı', 'warning');
      }
    } catch (err) {
      console.error('Özetleme hatası:', err);
      ui.showToast('Özetleme hatası: ' + err.message, 'error');
    }
  }

  async runServerAiAnalyze(linkId, mode) {
    mode = mode || 'full';
    try {
      var link = await this.db.getLink(linkId);
      if (!link) { ui.showToast('Link bulunamadı', 'error'); return null; }

      var payload = {
        linkId: link.cloudId || undefined,
        url: link.url,
        title: link.title || '',
        description: link.description || link.summary || '',
        rawText: link.notes || '',
        sourceType: link.sourceType || link.platform || 'other',
        save: !!link.cloudId
      };

      var data = await LinkSlashServerAI.analyzeLink(payload);
      link = LinkSlashServerAI.mergeToLocalLink(link, data);
      await this.db.updateLink(linkId, {
        summary: link.summary,
        aiAnalysis: link.aiAnalysis,
        aiAnalyzedAt: link.aiAnalyzedAt,
        tags: link.tags || []
      });

      if (typeof LinkSlashCloudSync !== 'undefined' && LinkSlashCloudSync.schedulePush) {
        LinkSlashCloudSync.schedulePush(this.db, ui);
      }

      var resultEl = document.getElementById('previewAiResult');
      var loadingEl = document.getElementById('previewAiLoading');
      if (loadingEl) loadingEl.classList.add('hidden');
      if (resultEl) {
        resultEl.innerHTML = LinkSlashServerAI.renderAnalysisHtml(data.analysis, data.status);
      }

      ui.showToast(data.status === 'provider_missing' ? 'Fallback AI sonucu' : '✅ AI analiz tamam', 'success');
      this._handleRoute();
      return data;
    } catch (err) {
      console.error('Server AI hatası:', err);
      ui.showToast('AI hatası: ' + err.message, 'error');
      var loadingEl2 = document.getElementById('previewAiLoading');
      if (loadingEl2) loadingEl2.classList.add('hidden');
      return null;
    }
  }

  _bindPreviewAiButtons() {
    var self = this;
    var analyzeBtn = document.getElementById('previewAiAnalyzeBtn');
    var ideasBtn = document.getElementById('previewAiIdeasBtn');
    var seoBtn = document.getElementById('previewAiSeoBtn');
    if (!analyzeBtn || analyzeBtn._bound) return;
    analyzeBtn._bound = true;

    var run = function(mode) {
      if (!self._previewLinkId) return;
      var loadingEl = document.getElementById('previewAiLoading');
      var resultEl = document.getElementById('previewAiResult');
      if (loadingEl) loadingEl.classList.remove('hidden');
      if (resultEl) resultEl.innerHTML = '';
      self.runServerAiAnalyze(self._previewLinkId, mode);
    };

    analyzeBtn.addEventListener('click', function() { run('full'); });
    if (ideasBtn) ideasBtn.addEventListener('click', function() { run('ideas'); });
    if (seoBtn) seoBtn.addEventListener('click', function() { run('seo'); });
  }

  async batchSummarize() {
    if (!this.ai) {
      ui.showToast('Önce Ayarlar\'dan API anahtarı girmelisin', 'warning');
      return;
    }
    var allLinks = await this.db.getAllLinks();
    var toSummarize = allLinks.filter(function(l) { return !l.summary; });
    if (toSummarize.length === 0) {
      ui.showToast('Özetlenecek link kalmadı!', 'info');
      return;
    }
    var confirmed = await ui.confirmDialog(toSummarize.length + ' link özetlenecek. Bu işlem biraz zaman alabilir. Devam edelim mi?');
    if (!confirmed) return;

    ui.showToast(toSummarize.length + ' link özetleniyor...', 'info');

    var cats = await this.db.getCategories();
    var batchSize = 5;
    var done = 0;

    for (var i = 0; i < toSummarize.length; i++) {
      try {
        var link = toSummarize[i];
        var proxyUrl = PROXY_URL + '/summarize?url=' + encodeURIComponent(link.url);
        var resp = await fetch(proxyUrl);
        var data = await resp.json();
        if (data.error && !data.text_content) {
          done++;
          continue;
        }
        var result = await this.ai.summarizeLink({
          url: link.url,
          title: link.title || '',
          description: link.description || '',
          text_content: data.text_content || data.description || ''
        }, cats);
        if (result.summary) {
          await this.db.updateLink(link.id, {
            summary: result.summary,
            aiTags: result.aiTags || [],
            aiSuggestCategory: result.suggestedCategory || '',
            summarizedAt: new Date().toISOString()
          });
        }
        done++;
        if (done % batchSize === 0) {
          ui.showToast(done + '/' + toSummarize.length + ' link özetlendi...', 'info');
        }
      } catch (_) {
        done++;
      }
    }
    ui.showToast('✅ ' + done + '/' + toSummarize.length + ' link özetlendi!', 'success');
    this._handleRoute();
  }

  async toggleArchive(linkId) {
    const link = await this.db.getLink(linkId);
    if (!link) return;

    await this.db.updateLink(linkId, { isArchived: !link.isArchived });
    
    if (!link.isArchived) {
      ui.showToast('Arşivlendi 📦', 'success');
    } else {
      ui.showToast('Arşivden çıkarıldı', 'info');
    }
    
    this._handleRoute();
  }

  async bulkSetCategory(categoryId) {
    const ids = Array.from(ui.selectedLinks);
    for (const id of ids) {
      await this.db.updateLink(id, { category: categoryId });
    }
    ui.clearSelection();
    ui.showToast(`${ids.length} linke kategori atandı`, 'success');
    this._handleRoute();
  }

  async bulkSetTags(tagsStr) {
    var newTags = tagsStr.split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t; });
    if (newTags.length === 0) { ui.showToast('Geçerli etiket girmediniz', 'error'); return; }
    const ids = Array.from(ui.selectedLinks);
    for (const id of ids) {
      var link = await this.db.getLink(id);
      if (!link) continue;
      var merged = (link.tags || []).concat(newTags);
      // Remove duplicates
      merged = merged.filter(function(t, i) { return merged.indexOf(t) === i; });
      await this.db.updateLink(id, { tags: merged });
    }
    ui.clearSelection();
    ui.showToast(`${ids.length} linke etiket eklendi`, 'success');
    this._handleRoute();
  }

  async bulkDelete() {
    const ids = Array.from(ui.selectedLinks);
    const confirmed = await ui.confirm('Çöp Kutusu', ids.length + ' link çöp kutusuna taşınacak. 30 gün sonra otomatik silinir.');
    if (!confirmed) return;
    await this.db.deleteLinks(ids);
    ui.clearSelection();
    ui.showToast(ids.length + ' link çöp kutusuna taşındı', 'info');
    this._handleRoute();
  }

  async bulkArchive() {
    const ids = Array.from(ui.selectedLinks);
    for (const id of ids) {
      await this.db.updateLink(id, { isArchived: true });
    }
    ui.clearSelection();
    ui.showToast(`${ids.length} link arşivlendi`, 'success');
    this._handleRoute();
  }

  async bulkFavorite() {
    const ids = Array.from(ui.selectedLinks);
    for (const id of ids) {
      await this.db.updateLink(id, { isFavorite: true });
    }
    ui.clearSelection();
    ui.showToast(`${ids.length} link favorilendi`, 'success');
    this._handleRoute();
  }

  // ==========================================
  // LINK SAĞLIĞI KONTROLÜ
  // ==========================================

  async checkAllLinks() {
    var allLinks = await this.db.getAllLinks();
    var activeLinks = allLinks.filter(function(l) { return !l.isArchived; });
    if (activeLinks.length === 0) {
      ui.showToast('Kontrol edilecek link yok', 'warning');
      return;
    }

    ui.showToast(activeLinks.length + ' link kontrol ediliyor...', 'info');
    var urls = activeLinks.map(function(l) { return l.url; });

    var results = await checkLinkStatus(urls, function(url, status) {
      // progress callback — UI güncellemesi yok, sadece konsol log
    });

    // Sonuçları DB'ye kaydet
    var urlToLink = {};
    activeLinks.forEach(function(l) { urlToLink[l.url] = l; });

    var deadCount = 0;
    var okCount = 0;
    var errorCount = 0;

    results.forEach(function(r) {
      var link = urlToLink[r.url];
      if (!link) return;
      if (r.status === 'ok') okCount++;
      else if (r.status === 'dead') deadCount++;
      else errorCount++;
    });

    // Toplu güncelleme — her link için updateLink
    for (const r of results) {
      var link = urlToLink[r.url];
      if (!link) continue;
      await this.db.updateLink(link.id, {
        healthStatus: r.status,
        lastChecked: new Date().toISOString(),
        statusCode: r.statusCode
      });
    }

    ui.showToast('✅ ' + okCount + ' erişilebilir, 💀 ' + deadCount + ' ölü, ⚠️ ' + errorCount + ' hata', 'success');
    await this._refreshSidebarCounts();
    this._handleRoute();
  }

  async _refreshSidebarCounts() {
    var stats = await this.db.getStats();
    var categories = await this.db.getCategories();
    ui.updateSidebarCounts(stats, categories);
    this._renderSidebarTags();
  }

  // ==========================================
  // IMPORT (WhatsApp + Bookmark)
  // ==========================================

  /**
   * İçe aktarma modu sekmesini vurgular.
   * @param {'whatsapp'|'bookmark'} mode
   */
  _highlightImportTab(mode) {
    document.querySelectorAll('.import-tab').forEach(function(tab) {
      tab.classList.toggle('active', tab.dataset.importMode === mode);
    });
  }

  async _refreshUndoButton() {
    var undoBar = document.getElementById('undoImportBar');
    if (!undoBar) return;
    if (ui.getImportMode() !== 'bookmark') { undoBar.classList.add('hidden'); return; }
    try {
      var allLinks = await this.db.getAllLinks();
      var count = allLinks.filter(function(l) { return !l.whatsappContext; }).length;
      undoBar.classList.toggle('hidden', count === 0);
      var btn = document.getElementById('undoImportBtn');
      if (btn) btn.textContent = '↩️ ' + count + ' Linki Sil (Kalan: ' + (allLinks.length - count) + ')';
    } catch (e) { console.error('[undo] hata:', e); }
  }

  async handleFileImport(text, fileName) {
    try {
      var mode = ui.getImportMode();
      var isHtml = fileName.toLowerCase().endsWith('.html') || fileName.toLowerCase().endsWith('.htm');
      var result;

      if (mode === 'bookmark' || isHtml) {
        result = this.bookmarkParser.parse(text);
      } else {
        result = this.parser.parse(text);
      }
      
      if (result.links.length === 0) {
        ui.showToast('Dosyada link bulunamadı', 'warning');
        ui.resetDropZone();
        return;
      }

      const categories = await this.db.getCategories();

      ui.renderImportResults(result.links, categories);
      
      // Drop zone'u güncelle
      const dropZone = document.getElementById('dropZone');
      const content = dropZone.querySelector('.drop-zone-content');
      var statsText = '';
      if (mode === 'bookmark' || isHtml) {
        statsText = result.stats.totalLinks + ' link';
        if (result.stats.folders && result.stats.folders.length > 0) {
          statsText += ', ' + result.stats.folders.length + ' klasör';
        }
      } else {
        var skipInfo = result.stats.skippedLines > 0 ? ' (' + result.stats.skippedLines + ' satır atlandı)' : '';
        statsText = result.stats.totalMessages + ' mesaj, ' + result.stats.totalLinks + ' link (' + result.format + ')' + skipInfo;
      }
      content.innerHTML = `
        <div class="drop-zone-icon">✅</div>
        <p class="drop-zone-text">${escapeHtml(fileName)}</p>
        <p class="drop-zone-hint">${statsText}</p>
      `;

      ui.showToast(`${result.links.length} link bulundu!`, 'success');
    } catch (error) {
      console.error('Parse hatası:', error);
      ui.showToast('Dosya parse edilemedi: ' + error.message, 'error');
      ui.resetDropZone();
    }
  }

  async aiCategorize() {
    if (!this.ai) {
      var provider = localStorage.getItem('ai_provider') || 'groq';
      var msg = provider === 'groq'
        ? 'Önce Ayarlar\'dan Groq API key girin'
        : 'Önce Ayarlar\'dan Ollama bağlantısını kurun';
      ui.showToast(msg, 'warning');
      return;
    }

    const categories = await this.db.getCategories();
    const linksToProcess = [];
    
    ui.selectedImportLinks.forEach(index => {
      const link = ui.parsedLinks[index];
      if (link) {
        linksToProcess.push({
          index,
          url: link.url,
          whatsappContext: link.whatsappContext || '',
          platform: link.platform
        });
      }
    });

    if (linksToProcess.length === 0) {
      ui.showToast('Kategorize edilecek link seçilmedi', 'warning');
      return;
    }

    ui.showAIProgress();

    try {
      const allSuggestions = [];
      const batchSize = 12;
      const totalBatches = Math.ceil(linksToProcess.length / batchSize);

      for (let i = 0; i < linksToProcess.length; i += batchSize) {
        const batch = linksToProcess.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        
        ui.updateAIProgress(
          Math.round((batchNum / totalBatches) * 100),
          `Batch ${batchNum}/${totalBatches} işleniyor... (${batch.length} link)`
        );

        const batchForAI = batch.map(l => ({
          url: l.url,
          whatsappContext: l.whatsappContext,
          platform: l.platform
        }));

        const suggestions = await this.ai.categorizeLinks(batchForAI, categories);
        
        // İndeksleri orijinal indekslere çevir
        suggestions.forEach(s => {
          allSuggestions.push({
            ...s,
            index: batch[s.index] ? batch[s.index].index : s.index
          });
        });
      }

      ui.updateImportWithAISuggestions(allSuggestions);
      ui.hideAIProgress();
      ui.showToast(`${allSuggestions.length} link AI tarafından kategorize edildi!`, 'success');
    } catch (error) {
      console.error('AI kategorizasyon hatası:', error);
      ui.hideAIProgress();
      ui.showToast('AI hatası: ' + error.message, 'error');
    }
  }

  async saveImportedLinks() {
    const selectedLinks = ui.getSelectedImportLinks();
    
    if (selectedLinks.length === 0) {
      ui.showToast('Kaydedilecek link seçilmedi', 'warning');
      return;
    }

    try {
      // Cursor-based duplicate kontrolu (938 linki hafizaya cekmek yerine)
      var urlsToCheck = selectedLinks.map(function(l) { return l.url; });
      var dupCheck = await this.db.filterNewUrls(urlsToCheck);
      var newUrlsSet = new Set(dupCheck.newUrls.map(function(u) { return u.toLowerCase().trim(); }));

      const newLinksOnly = selectedLinks.filter(function(l) {
        return newUrlsSet.has(l.url.toLowerCase().trim());
      });

      if (newLinksOnly.length === 0) {
        ui.showToast('Seçili tüm linkler zaten sistemde mevcut.', 'info');
        return;
      }

      if (newLinksOnly.length < selectedLinks.length) {
        ui.showToast(selectedLinks.length - newLinksOnly.length + ' adet tekrar eden link atlandi.', 'info');
      }

      // Bookmark import: tüm linkler tek bir "🔖 Yer İmleri" kategorisine gitsin
      var hasBookmark = newLinksOnly.some(function(l) { return l.folder; });
      if (hasBookmark) {
        var allCats = await this.db.getCategories();
        var bookCat = allCats.find(function(c) { return c.name === '🔖 Yer İmleri'; });
        if (!bookCat) {
          var catId = 'bookmarks_' + Date.now();
          await this.db.addCategory({ id: catId, name: '🔖 Yer İmleri', emoji: '🔖', color: '#6b7280', order: 0 });
          bookCat = { id: catId };
        }
        newLinksOnly.forEach(function(link) {
          if (!link.category) {
            link.category = bookCat.id;
          }
        });
      }

      const linksToSave = newLinksOnly.map(link => ({
        id: generateId(),
        url: link.url,
        title: link.title || extractDomain(link.url),
        description: link.description || '',
        category: link.category || '',
        tags: link.tags || [],
        platform: link.platform || detectPlatform(link.url),
        dateAdded: new Date().toISOString(),
        dateOriginal: link.dateOriginal || null,
        whatsappContext: link.whatsappContext || (link.folder ? '📁 ' + link.folder : ''),
        isFavorite: false,
        isArchived: false,
        aiCategorized: !!link._suggestedCategory
      }));

      await this.db.addLinks(linksToSave);
      
      var isBookmarkImport = hasBookmark;
      ui.showToast(
        isBookmarkImport
          ? linksToSave.length + ' link Yer İmlerine kaydedildi!'
          : linksToSave.length + ' link kaydedildi!',
        'success'
      );
      ui.resetDropZone();
      
      // Bookmark import ise geri al butonunu göster
      var undoBar = document.getElementById('undoImportBar');
      if (undoBar) {
        undoBar.classList.toggle('hidden', !isBookmarkImport);
      }
      
      // Bookmark ise yer imleri goruntusune, degilse dashboard'a yonlendir
      if (isBookmarkImport) {
        window.location.hash = '#bookmarks';
      } else {
        window.location.hash = '#dashboard';
        await this.loadDashboard();
      }
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      ui.showToast('Kaydetme hatası: ' + error.message, 'error');
    }
  }

  // ==========================================
  // IMPORT GERİ ALMA
  // ==========================================

  /**
   * whatsappContext alanı boş olan tüm linkleri siler (bookmark importları).
   */
  async undoLastBookmarkImport() {
    try {
      var allLinks = await this.db.getAllLinks();
      var toDelete = allLinks.filter(function(l) { return !l.whatsappContext; });
      if (toDelete.length === 0) {
        ui.showToast('Geri alınacak yer imi linki bulunamadı', 'info');
        return;
      }
      var confirmed = await ui.confirmDialog(toDelete.length + ' link silinecek (whatsappContext\'i boş olanlar). Kalan: ' + (allLinks.length - toDelete.length) + ' link. Emin misin?');
      if (!confirmed) return;
      var ids = toDelete.map(function(l) { return l.id; });
      await this.db.deleteLinks(ids);
      // Silinen kategorileri de temizle (içi boşalanları)
      var categories = await this.db.getCategories();
      for (var i = 0; i < categories.length; i++) {
        var catLinks = await this.db.getLinks({ category: categories[i].id });
        if (catLinks.length === 0) {
          await this.db.deleteCategory(categories[i].id);
        }
      }
      ui.showToast(toDelete.length + ' link geri alındı!', 'success');
      var ub = document.getElementById('undoImportBar');
      if (ub) ub.classList.add('hidden');
      window.location.hash = '#dashboard';
      await this.loadDashboard();
    } catch (error) {
      console.error('Geri alma hatası:', error);
      ui.showToast('Geri alma hatası: ' + error.message, 'error');
    }
  }

  // ==========================================
  // KATEGORİ YÖNETİMİ
  // ==========================================

  async saveNewCategory() {
    const name = document.getElementById('newCatName').value.trim();
    const emoji = document.getElementById('newCatEmoji').value.trim() || '🏛️';
    const color = document.getElementById('newCatColor').value;
    const description = document.getElementById('newCatDescription').value.trim();

    if (!name) {
      ui.showToast('Oda adi gerekli', 'error');
      return;
    }

    const categories = await this.db.getCategories();
    const id = name.toLowerCase()
      .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i')
      .replace(/İ/g, 'i')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    await this.db.addCategory({
      id,
      name,
      emoji,
      color,
      description,
      order: categories.length
    });

    ui.closeModal('newCategoryModal');
    document.getElementById('newCatName').value = '';
    document.getElementById('newCatEmoji').value = '';
    document.getElementById('newCatDescription').value = '';
    
    ui.showToast('Oda eklendi!', 'success');

    // Önizleme modal'ından eklendiyse dropdown'ı güncelle
    if (this._previewPendingCategory && this._previewLink) {
      this._previewPendingCategory = false;
      var allCats = await this.db.getCategories();
      this._renderPreviewCategory(this._previewLink, allCats);
      // Yeni kategoriyi linke ata
      var select = document.getElementById('previewCategorySelect');
      if (select) {
        select.value = id;
        await this.db.updateLink(this._previewLink.id, { category: id });
        this._previewLink.category = id;
        ui.showToast('Kategori atandı!', 'success');
        // Listeyi güncelle (arka planda, modal açık kalır)
        this._handleRoute();
      }
    } else {
      await this.loadSettings();
    }
  }

  async updateCategory() {
    const data = ui.getEditCategoryData();
    if (!data.name) {
      ui.showToast('Oda adi gerekli', 'error');
      return;
    }
    
    try {
      await this.db.updateCategory(data.id, {
        name: data.name,
        emoji: data.emoji,
        color: data.color,
        description: data.description
      });
      ui.closeModal('editCategoryModal');
      ui.showToast('Oda guncellendi!', 'success');
      await this.loadSettings();
      this._handleRoute();
    } catch (error) {
      ui.showToast('Kategori güncellenemedi: ' + error.message, 'error');
    }
  }

  // ==========================================
  // VERİ YEDEKLEMİ
  // ==========================================

  async exportJson() {
    try {
      const data = await this.db.exportAll();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `linkslash_backup_${formatDateShort(new Date()).replace(/\./g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      localStorage.setItem('linkslash_last_export', Date.now().toString());
      ui.showToast('✅ Yedek alindi! (' + data.links.length + ' link, ' + data.categories.length + ' oda)', 'success');
    } catch (error) {
      ui.showToast('JSON dışa aktarma hatası: ' + error.message, 'error');
    }
  }

  async exportCsv() {
    try {
      var links = await this.db.getAllLinks();
      var categories = await this.db.getCategories();
      var catMap = {};
      categories.forEach(function(c) { catMap[c.id] = c; });

      // CSV header
      var csv = '\uFEFF'; // BOM for Turkish chars
      csv += '"URL","Başlık","Açıklama","Kategori","Platform","Etiketler","Eklenme Tarihi","Orijinal Tarih","Favori","Arşiv"';

      links.forEach(function(link) {
        var cat = catMap[link.category];
        var catName = cat ? cat.emoji + ' ' + cat.name : '';
        var tags = (link.tags || []).join('; ');
        csv += '\n' + [
          escapeCsv(link.url),
          escapeCsv(link.title || ''),
          escapeCsv(link.description || ''),
          escapeCsv(catName),
          escapeCsv(link.platform || ''),
          escapeCsv(tags),
          escapeCsv(link.dateAdded || ''),
          escapeCsv(link.dateOriginal || ''),
          link.isFavorite ? 'Evet' : 'Hayır',
          link.isArchived ? 'Evet' : 'Hayır'
        ].join(',');
      });

      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = `linkslash_export_${formatDateShort(new Date()).replace(/\./g, '-')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      ui.showToast(links.length + ' link CSV olarak dışa aktarıldı!', 'success');
    } catch (error) {
      ui.showToast('CSV dışa aktarma hatası: ' + error.message, 'error');
    }
  }

  async importJsonData(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const confirmed = await ui.confirm(
        'Verileri İçe Aktar',
        `${data.links?.length || 0} link ve ${data.categories?.length || 0} kategori içe aktarılacak. Mevcut veriler silinecek. Devam et?`
      );
      
      if (!confirmed) return;

      await this.db.importAll(data);
      ui.showToast('Veriler içe aktarıldı!', 'success');
      window.location.hash = '#dashboard';
      await this.loadDashboard();
    } catch (error) {
      ui.showToast('İçe aktarma hatası: ' + error.message, 'error');
    }
  }

  // ==========================================
  // TOPLU AI KATEGORIZASYONU
  // ==========================================

  async startBulkAICategorization(allLinks) {
    if (!this.ai) {
      var provider = localStorage.getItem('ai_provider') || 'groq';
      var msg = provider === 'groq'
        ? 'Önce Ayarlar\'dan Groq API key girin'
        : 'Önce Ayarlar\'dan Ollama bağlantısını kurun';
      ui.showToast(msg, 'warning');
      return;
    }

    var links = await this.db.getAllLinks();
    var overwrite = document.getElementById('bulkAIOverwriteExisting').checked;

    if (!allLinks) {
      links = links.filter(function(l) { return !l.category; });
    }

    if (links.length === 0) {
      ui.showToast('Kategorize edilecek link bulunamadı.', 'info');
      return;
    }

    // Python proxy kontrolü
    var proxyAvailable = false;
    try {
      var ctrl = new AbortController();
      setTimeout(function() { ctrl.abort(); }, 5000);
      var proxyCheck = await fetch(PROXY_URL + '/health', { signal: ctrl.signal });
      proxyAvailable = proxyCheck.ok;
    } catch (_) {
      proxyAvailable = false;
    }

    if (!proxyAvailable) {
      var proceed = await ui.confirm(
        'Proxy Uyarısı',
        'Python proxy (localhost:5000) çalışmıyor. Linklerin başlık ve açıklamaları çekilemeyecek, sadece URL bazlı kategorizasyon yapılacak. Devam edilsin mi?'
      );
      if (!proceed) return;
    } else {
      ui.showToast('Python proxy aktif! Meta tag\'ler de çekilecek.', 'success');
    }

    var generateSummary = document.getElementById('bulkAIGenerateSummary').checked;
    var generateTags = document.getElementById('bulkAIGenerateTags').checked;
    var categories = await this.db.getCategories();

    // İlerleme UI'ı göster
    var progressEl = document.getElementById('bulkAIProgress');
    var progressFill = document.getElementById('bulkAIProgressFill');
    var progressText = document.getElementById('bulkAIProgressText');
    var estimateEl = document.getElementById('bulkAIEstimate');
    var cancelBtn = document.getElementById('cancelBulkAIBtn');
    progressEl.classList.remove('hidden');
    if (cancelBtn) cancelBtn.classList.remove('hidden');
    document.getElementById('bulkAIResults').classList.add('hidden');

    // İptal bayrağını sıfırla
    this._bulkAICancelled = false;

    var batchSize = this.ai.batchSize || 12;
    var totalBatches = Math.ceil(links.length / batchSize);
    var startTime = Date.now();

    try {
      var allResults = [];

      for (var i = 0; i < links.length; i += batchSize) {
        // İptal kontrolü
        if (this._bulkAICancelled) {
          progressText.textContent = 'Durduruldu. ' + allResults.length + ' link islendi.';
          if (cancelBtn) cancelBtn.classList.add('hidden');
          ui.showToast('Islem kullanici tarafindan durduruldu.', 'warning');
          break;
        }

        var batch = links.slice(i, i + batchSize);
        var batchNum = Math.floor(i / batchSize) + 1;
        var percent = Math.round((batchNum / totalBatches) * 100);

        progressFill.style.width = percent + '%';
        progressText.textContent = 'Batch ' + batchNum + '/' + totalBatches + ' işleniyor... (' + batch.length + ' link)' +
          (proxyAvailable ? ' + meta tag çekimi' : '');

        // Tahmini süre
        var elapsed = Date.now() - startTime;
        var avgPerBatch = elapsed / batchNum;
        var remainingBatches = totalBatches - batchNum;
        var remainingSec = Math.round((remainingBatches * avgPerBatch) / 1000);
        if (batchNum > 1 && remainingSec > 0) {
          var min = Math.floor(remainingSec / 60);
          var sec = remainingSec % 60;
          estimateEl.textContent = 'Tahmini kalan süre: ' + min + 'dk ' + sec + 'sn';
        }

        // Proxy'den meta tag'leri çek (batch olarak)
        var metaMap = {};
        if (proxyAvailable) {
          try {
            var ctrl2 = new AbortController();
            setTimeout(function() { ctrl2.abort(); }, 30000);
            var batchResp = await fetch(PROXY_URL + '/fetch-batch', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({urls: batch.map(function(l) { return l.url; })}),
              signal: ctrl2.signal
            });
            if (batchResp.ok) {
              var batchData = await batchResp.json();
              if (batchData.results) {
                batchData.results.forEach(function(r) {
                  if (r && r.url) {
                    metaMap[r.url] = {title: r.title || '', description: r.description || ''};
                  }
                });
              }
            }
          } catch (proxyErr) {
            console.warn('Proxy batch hatası:', proxyErr);
          }
        }

        var batchForAI = batch.map(function(l) {
          var meta = metaMap[l.url] || {};
          return {
            url: l.url,
            platform: l.platform || '',
            whatsappContext: l.whatsappContext || '',
            title: meta.title,
            description: meta.description
          };
        });

        var suggestions = await this.ai.categorizeLinks(batchForAI, categories, {
          generateSummary: generateSummary,
          generateTags: generateTags
        });

        suggestions.forEach(function(s) {
          var batchIdx = s.index % batchSize;
          allResults.push({
            linkId: batch[batchIdx] ? batch[batchIdx].id : '',
            linkUrl: batch[batchIdx] ? batch[batchIdx].url : '',
            linkTitle: batch[batchIdx] ? batch[batchIdx].title : '',
            currentCategory: batch[batchIdx] ? batch[batchIdx].category : '',
            suggestedCategory: s.categoryId,
            suggestedTitle: s.title,
            description: s.description,
            tags: s.tags || []
          });
        });
      }

      progressFill.style.width = '100%';
      progressText.textContent = 'Tamamlandı! ' + allResults.length + ' link kategorize edildi.' +
        (proxyAvailable ? ' (Meta tag\'li)' : ' (URL-only)');
      estimateEl.textContent = '';

      this._bulkAIResults = allResults;
      ui.renderBulkAIResults(allResults, categories);
      document.getElementById('bulkAIResults').classList.remove('hidden');
      ui.showToast(allResults.length + ' link AI tarafından kategorize edildi!', 'success');
    } catch (error) {
      console.error('Toplu AI hatası:', error);
      progressText.textContent = 'Hata: ' + error.message;
      ui.showToast('AI hatası: ' + error.message, 'error');
    }
  }

  async applyBulkAIResults(applyAll) {
    if (!this._bulkAIResults || this._bulkAIResults.length === 0) return;

    var selectedIndices = ui.getSelectedBulkAIIndices();
    var categories = await this.db.getCategories();
    var catMap = {};
    categories.forEach(function(c) { catMap[c.id] = c; });

    var toApply = applyAll ? this._bulkAIResults : this._bulkAIResults.filter(function(_, i) {
      return selectedIndices.has(i);
    });

    var appliedCount = 0;
    for (var i = 0; i < toApply.length; i++) {
      var r = toApply[i];
      try {
        var updates = { category: r.suggestedCategory };
        if (r.suggestedTitle) updates.title = r.suggestedTitle;
        if (r.description) updates.description = r.description;
        if (r.tags && r.tags.length > 0) updates.tags = r.tags;
        updates.aiCategorized = true;
        await this.db.updateLink(r.linkId, updates);
        appliedCount++;
      } catch (err) {
        console.warn('Link güncellenemedi:', r.linkId, err);
      }
    }

    ui.showToast(appliedCount + ' link güncellendi!', 'success');
    await this.loadBulkAI();
  }

  // ==========================================
  // AI CHATBOT — Tool Calling (Function Calling)
  // ==========================================

  _getChatTools() {
    var self = this;
    return [
      {
        type: 'function',
        function: {
          name: 'koleksiyon_ozeti',
          description: 'Koleksiyon hakkinda anlik istatistik verir: toplam link sayisi, kategori dagilimi, platform dagilimi, favori sayisi. Hic parametre almaz.',
          parameters: { type: 'object', properties: {} }
        }
      },
      {
        type: 'function',
        function: {
          name: 'link_ara',
          description: 'Koleksiyonda link aramak icin kullanilir. Sorgu, platform, kategori, favori gibi kriterlere gore filtreleme yapar. Sadece ihtiyac duydugunda kullan.',
          parameters: {
            type: 'object',
            properties: {
              sorgu: { type: 'string', description: 'Aranacak metin (baslik, URL, aciklama, etiketler icinde aranir)' },
              platform: { type: 'string', description: 'Platform filtresi: youtube, x, instagram, github, linkedin, medium, reddit, spotify', enum: ['youtube', 'x', 'instagram', 'github', 'linkedin', 'medium', 'reddit', 'spotify'] },
              kategori: { type: 'string', description: 'Oda ID (ornek: spor-salonu, savas-odasi, kutuphane, atolye, ai-odasi, diger)' },
              favori: { type: 'boolean', description: 'Sadece favoriler' },
              limit: { type: 'number', description: 'En fazla kac sonuc (varsayilan 10, max 30)' },
              sirala: { type: 'string', description: 'Siralama', enum: ['tarih', 'baslik'] }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'kategorileri_listele',
          description: 'Tum odalari (hafiza sarayindaki kategorileri) ve herbirindeki link sayisini getirir. Hic parametre almaz.',
          parameters: { type: 'object', properties: {} }
        }
      },
      {
        type: 'function',
        function: {
          name: 'son_eklenenler',
          description: 'En son eklenen linkleri getirir.',
          parameters: {
            type: 'object',
            properties: {
              adet: { type: 'number', description: 'Kac link istendigi (varsayilan 5)' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'ajani_baslat',
          description: 'AI AJANI baslatir: linkleri toplu olarak analiz eder, hafiza sarayindaki odalara yerlestirir, etiketler. Kullanici "arastir", "kategorize et", "odalara yerlestir", "tara", "incele", "temizle" gibi seyler soylediginde kullan.',
          parameters: {
            type: 'object',
            properties: {
              platformlar: {
                type: 'array',
                items: { type: 'string' },
                description: 'Hedef platformlar (bos birakilirsa tumu): youtube, x, instagram, github, linkedin, medium, reddit, spotify'
              },
              kriterler: { type: 'string', description: 'Aranacak konu/kriter (ornek: "AI icerikleri", "komik", "egitim")' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'linkleri_tasi',
          description: 'Linkleri baska bir odaya tasir. Hangi linklerin tasinacagini URL, platform, oda veya arama sorgusu ile belirtebilirsin.',
          parameters: {
            type: 'object',
            properties: {
              hedef_kategori: { type: 'string', description: 'Hedef oda adi (ornek: "Spor Salonu", "AI Odasi", "Atolye")' },
              url: { type: 'string', description: 'Tasinacak linkin URLsi (tam URL veya kismi eslesme)' },
              platform: { type: 'string', description: 'Platform filtresi: youtube, x, instagram, github, linkedin, medium, reddit, spotify' },
              sorgu: { type: 'string', description: 'Baslik/URL/aciklamada aranacak metin' },
              tumu: { type: 'boolean', description: 'True ise tum linkleri tasir (filtre yoksa tehlikeli, onay al)' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'link_sil',
          description: 'Link/leri siler. URL, platform veya sorgu ile belirt. KALICI olarak siler, dikkatli kullan.',
          parameters: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'Silinecek linkin URLsi (tam veya kismi)' },
              platform: { type: 'string', description: 'Platform filtresi' },
              sorgu: { type: 'string', description: 'Arama metni' },
              ids: { type: 'array', items: { type: 'string' }, description: 'Dogrudan link IDleri (URL yerine)' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'link_favori',
          description: 'Linklerin favori durumunu degistirir. URL, platform veya sorgu ile belirt. parametre: favori (true/false).',
          parameters: {
            type: 'object',
            properties: {
              favori: { type: 'boolean', description: 'true = favori ekle, false = favoriden cikar' },
              url: { type: 'string', description: 'Link URLsi (tam veya kismi)' },
              platform: { type: 'string', description: 'Platform filtresi' },
              sorgu: { type: 'string', description: 'Arama metni' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'etiket_ekle',
          description: 'Linklere etiket ekler. URL, platform veya sorgu ile linkleri belirt, etiket parametresinde etiketleri virgulle ayir.',
          parameters: {
            type: 'object',
            properties: {
              etiketler: { type: 'string', description: 'Eklenecek etiketler, virgulle ayrilmis (ornek: "ai, yapay-zeka, tutorial")' },
              url: { type: 'string', description: 'Link URLsi' },
              platform: { type: 'string', description: 'Platform filtresi' },
              sorgu: { type: 'string', description: 'Arama metni' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'kategori_olustur',
          description: 'Yeni bir oda (hafiza sarayi mekani) olusturur.',
          parameters: {
            type: 'object',
            properties: {
              ad: { type: 'string', description: 'Oda adi (ornek: "Mutfak", "Seyahat")' },
              emoji: { type: 'string', description: 'Oda emojisi (ornek: "🤖", varsayilan "🏛️")' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'kategori_sil',
          description: 'Bir odayi ve icindeki tum linkleri siler. Oda adi ile belirt. ONAY GEREKTIRIR.',
          parameters: {
            type: 'object',
            properties: {
              ad: { type: 'string', description: 'Silinecek oda adi' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'link_ekle',
          description: 'Koleksiyona yeni bir link ekler.',
          parameters: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'Link URLsi (zorunlu)' },
              baslik: { type: 'string', description: 'Link basligi' },
              aciklama: { type: 'string', description: 'Kisa aciklama' },
              kategori: { type: 'string', description: 'Oda adi (bos birakilirsa odasiz)' },
              etiketler: { type: 'string', description: 'Etiketler, virgulle ayrilmis' }
            },
            required: ['url']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'toplu_kategorize_et',
          description: 'Belirtilen linkleri AI ile otomatik odalara yerlestirir. URL, platform veya sorgu ile linkleri sec, AI hangi odaya gideceklerine karar versin.',
          parameters: {
            type: 'object',
            properties: {
              platform: { type: 'string', description: 'Platform filtresi' },
              sorgu: { type: 'string', description: 'Arama metni' },
              kategori: { type: 'string', description: 'Sadece bu odadaki linkleri yerlestir' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'link_ozetle',
          description: 'Bir veya birden fazla linki AI ile analiz eder, özet çıkarır, konusunu belirler, kategori ve etiket önerir. URL, platform veya sorgu ile linkleri belirt.',
          parameters: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'Özetlenecek linkin URLsi' },
              platform: { type: 'string', description: 'Platform filtresi' },
              sorgu: { type: 'string', description: 'Arama metni ile eslesen linkleri özetle' }
            }
          }
        }
      }
    ];
  }

  async _executeTool(name, args) {
    switch (name) {
      case 'koleksiyon_ozeti': return await this._toolCollectionSummary();
      case 'link_ara': return await this._toolSearchLinks(args || {});
      case 'kategorileri_listele': return await this._toolListCategories();
      case 'son_eklenenler': return await this._toolRecentLinks((args && args.adet) || 5);
      case 'ajani_baslat': return await this._toolRunAgent(args || {});
      case 'linkleri_tasi': return await this._toolMoveLinks(args || {});
      case 'link_sil': return await this._toolDeleteLinks(args || {});
      case 'link_favori': return await this._toolToggleFavorite(args || {});
      case 'etiket_ekle': return await this._toolAddTags(args || {});
      case 'kategori_olustur': return await this._toolCreateCategory(args || {});
      case 'kategori_sil': return await this._toolDeleteCategory(args || {});
      case 'link_ekle': return await this._toolAddLink(args || {});
      case 'toplu_kategorize_et': return await this._toolBulkCategorize(args || {});
      case 'link_ozetle': return await this._toolSummarizeLinks(args || {});
      default: return JSON.stringify({ hata: 'Bilinmeyen tool: ' + name });
    }
  }

  async _toolCollectionSummary() {
    var stats = await this.db.getStats();
    var categories = await this.db.getCategories();
    var byCategory = {};
    stats.byCategory && Object.keys(stats.byCategory).forEach(function(k) {
      var cat = categories.find(function(c) { return c.id === k; });
      byCategory[cat ? cat.emoji + ' ' + cat.name : k] = stats.byCategory[k];
    });
    var byPlatform = {};
    var platformLabels = { x: 'X (Twitter)', youtube: 'YouTube', github: 'GitHub', instagram: 'Instagram', linkedin: 'LinkedIn', medium: 'Medium', reddit: 'Reddit', spotify: 'Spotify' };
    stats.byPlatform && Object.keys(stats.byPlatform).forEach(function(p) {
      byPlatform[platformLabels[p] || p] = stats.byPlatform[p];
    });
    return JSON.stringify({
      toplam_link: stats.total,
      favori_sayisi: stats.favorites || 0,
      kategori_dagilimi: byCategory,
      platform_dagilimi: byPlatform
    });
  }

  async _toolSearchLinks(args) {
    var allLinks = await this.db.getAllLinks();
    var normalize = function(str) {
      return str.toLowerCase().replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i').replace(/İ/g, 'i');
    };
    var result = allLinks.slice();
    var limit = Math.min(args.limit || 10, 30);

    if (args.platform) {
      var p = args.platform === 'x' ? ['x', 'twitter'] : [args.platform];
      result = result.filter(function(l) {
        return p.indexOf(normalize(l.platform)) !== -1 || p.some(function(kw) { return normalize(l.url).indexOf(kw) !== -1; });
      });
    }
    if (args.kategori) {
      result = result.filter(function(l) { return normalize(l.category) === normalize(args.kategori); });
    }
    if (args.favori) {
      result = result.filter(function(l) { return l.isFavorite; });
    }
    if (args.sorgu) {
      var qWords = normalize(args.sorgu).split(/\s+/).filter(function(w) { return w.length > 2; });
      if (qWords.length > 0) {
        var scored = [];
        result.forEach(function(l) {
          var text = normalize(l.title + ' ' + (l.description || '') + ' ' + l.url + ' ' + (l.tags || []).join(' '));
          var score = 0;
          qWords.forEach(function(w) {
            if (text.indexOf(w) !== -1) {
              score += w.length;
              if (normalize(l.title || '').indexOf(w) !== -1) score += 5;
              if ((l.tags || []).some(function(t) { return normalize(t).indexOf(w) !== -1; })) score += 3;
            }
          });
          if (score > 0) scored.push({ link: l, score: score });
        });
        scored.sort(function(a, b) { return b.score - a.score; });
        result = scored.map(function(s) { return s.link; });
      }
    }

    if (args.sirala === 'baslik') {
      result.sort(function(a, b) { return (a.title || '').localeCompare(b.title || ''); });
    } else {
      result.sort(function(a, b) { return new Date(b.dateOriginal || b.dateAdded) - new Date(a.dateOriginal || a.dateAdded); });
    }

    result = result.slice(0, limit);
    var platformLabels = { x: 'X (Twitter)', youtube: 'YouTube', github: 'GitHub', instagram: 'Instagram', linkedin: 'LinkedIn', medium: 'Medium', reddit: 'Reddit', spotify: 'Spotify' };
    var categories = await this.db.getCategories();
    var catMap = {};
    categories.forEach(function(c) { catMap[c.id] = c; });

    return JSON.stringify({
      toplam_sonuc: result.length,
      linkler: result.map(function(l) {
        var cat = catMap[l.category];
        return {
          baslik: l.title || '',
          url: l.url,
          platform: platformLabels[l.platform] || l.platform || 'web',
          kategori: cat ? cat.emoji + ' ' + cat.name : 'Odasiz',
          favori: !!l.isFavorite,
          tarih: l.dateOriginal || l.dateAdded
        };
      })
    });
  }

  async _toolListCategories() {
    var stats = await this.db.getStats();
    var categories = await this.db.getCategories();
    return JSON.stringify({
      kategoriler: categories.map(function(c) {
        return { id: c.id, ad: c.emoji + ' ' + c.name, aciklama: c.description || '', link_sayisi: (stats.byCategory[c.id] || 0) };
      })
    });
  }

  async _toolRecentLinks(adet) {
    var allLinks = await this.db.getAllLinks();
    allLinks.sort(function(a, b) { return new Date(b.dateOriginal || b.dateAdded) - new Date(a.dateOriginal || a.dateAdded); });
    var recent = allLinks.slice(0, Math.min(adet, 20));
    var platformLabels = { x: 'X (Twitter)', youtube: 'YouTube', github: 'GitHub', instagram: 'Instagram', linkedin: 'LinkedIn', medium: 'Medium', reddit: 'Reddit', spotify: 'Spotify' };
    var categories = await this.db.getCategories();
    var catMap = {};
    categories.forEach(function(c) { catMap[c.id] = c; });
    return JSON.stringify({
      son_eklenenler: recent.map(function(l) {
        var cat = catMap[l.category];
        return {
          baslik: l.title || '',
          url: l.url,
          platform: platformLabels[l.platform] || l.platform || 'web',
          kategori: cat ? cat.emoji + ' ' + cat.name : 'Odasiz',
          tarih: l.dateOriginal || l.dateAdded
        };
      })
    });
  }

  async _toolRunAgent(args) {
    var platforms = args.platformlar || [];
    var criteria = args.kriterler || 'Genel';
    if (platforms.length === 0) platforms = ['all'];
    // Agent'ı arka planda başlat, sonucu bekleme
    this.runAgent(platforms, criteria);
    return JSON.stringify({
      durum: 'basladi',
      mesaj: 'Ajan ' + platforms.join(', ') + ' platformlarinda "' + criteria + '" kriteri ile arastirmaya basladi. Bu islem bir sure alabilir, sonuclari panelden takip edebilirsin.'
    });
  }

  async _toolMoveLinks(args) {
    var targetCatName = (args.hedef_kategori || '').toLowerCase().replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i');
    var cats = await this.db.getCategories();
    var targetCat = cats.find(function(c) {
      var cn = c.name.toLowerCase().replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i');
      return cn.indexOf(targetCatName) !== -1 || targetCatName.indexOf(cn) !== -1;
    });
    if (!targetCat) return JSON.stringify({ hata: '"' + args.hedef_kategori + '" adinda kategori bulunamadi. Mevcut kategoriler: ' + cats.map(function(c) { return c.emoji + ' ' + c.name; }).join(', ') });
    var allLinks = await this.db.getAllLinks();
    var matched = this._filterLinks(allLinks, args);
    if (matched.length === 0) return JSON.stringify({ hata: 'Eslesen link bulunamadi' });
    for (var i = 0; i < matched.length; i++) {
      await this.db.updateLink(matched[i].id, { category: targetCat.id });
    }
    return JSON.stringify({ basarili: true, mesaj: matched.length + ' link "' + targetCat.emoji + ' ' + targetCat.name + '" odasina tasindi.', link_sayisi: matched.length, hedef_kategori: targetCat.emoji + ' ' + targetCat.name });
  }

  async _toolDeleteLinks(args) {
    var allLinks = await this.db.getAllLinks();
    var matched = this._filterLinks(allLinks, args);
    if (args.ids && args.ids.length > 0) {
      matched = allLinks.filter(function(l) { return args.ids.indexOf(l.id) !== -1; });
    }
    if (matched.length === 0) return JSON.stringify({ hata: 'Silinecek link bulunamadi' });
    var ids = matched.map(function(l) { return l.id; });
    await this.db.deleteLinks(ids);
    return JSON.stringify({ basarili: true, mesaj: matched.length + ' link kalici olarak silindi.', link_sayisi: matched.length });
  }

  async _toolToggleFavorite(args) {
    var allLinks = await this.db.getAllLinks();
    var matched = this._filterLinks(allLinks, args);
    if (matched.length === 0) return JSON.stringify({ hata: 'Eslesen link bulunamadi' });
    var favValue = args.favori === true || args.favori === 'true';
    for (var i = 0; i < matched.length; i++) {
      await this.db.updateLink(matched[i].id, { isFavorite: favValue });
    }
    var durum = favValue ? 'favorilere eklendi' : 'favorilerden cikarildi';
    return JSON.stringify({ basarili: true, mesaj: matched.length + ' link ' + durum + '.', link_sayisi: matched.length, yeni_durum: favValue });
  }

  async _toolAddTags(args) {
    var etiketler = (args.etiketler || '').split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t.length > 0; });
    if (etiketler.length === 0) return JSON.stringify({ hata: 'En az bir etiket belirtmelisin.' });
    var allLinks = await this.db.getAllLinks();
    var matched = this._filterLinks(allLinks, args);
    if (matched.length === 0) return JSON.stringify({ hata: 'Eslesen link bulunamadi' });
    for (var i = 0; i < matched.length; i++) {
      var existingTags = matched[i].tags || [];
      var newTags = etiketler.filter(function(t) { return existingTags.indexOf(t) === -1; });
      if (newTags.length > 0) {
        await this.db.updateLink(matched[i].id, { tags: existingTags.concat(newTags) });
      }
    }
    return JSON.stringify({ basarili: true, mesaj: matched.length + ' linke "' + etiketler.join(', ') + '" etiketleri eklendi.', link_sayisi: matched.length, eklenen_etiketler: etiketler });
  }

  async _toolCreateCategory(args) {
    var name = (args.ad || '').trim();
    if (!name) return JSON.stringify({ hata: 'Oda adi gerekli.' });
    var cats = await this.db.getCategories();
    var exists = cats.some(function(c) { return c.name.toLowerCase() === name.toLowerCase(); });
    if (exists) return JSON.stringify({ hata: '"' + name + '" odasi zaten var.' });
    var catId = 'cat_' + Date.now();
    await this.db.addCategory({ id: catId, name: name, emoji: args.emoji || '🏛️', color: '#6b7280', order: cats.length });
    return JSON.stringify({ basarili: true, mesaj: '"' + (args.emoji || '🏛️') + ' ' + name + '" odasi olusturuldu.', kategori_id: catId });
  }

  async _toolDeleteCategory(args) {
    var name = (args.ad || '').toLowerCase().replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i');
    var cats = await this.db.getCategories();
    var target = cats.find(function(c) {
      var cn = c.name.toLowerCase().replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i');
      return cn.indexOf(name) !== -1;
    });
    if (!target) return JSON.stringify({ hata: '"' + args.ad + '" odasi bulunamadi.' });
    var catLinks = await this.db.getLinks({ category: target.id });
    if (catLinks.length > 0) {
      return JSON.stringify({ hata: 'Oda bos degil. Once linkleri baska odaya tasi veya sil. ("' + target.emoji + ' ' + target.name + '" odasinda ' + catLinks.length + ' link var)' });
    }
    await this.db.deleteCategory(target.id);
    return JSON.stringify({ basarili: true, mesaj: '"' + target.emoji + ' ' + target.name + '" odasi silindi.' });
  }

  async _toolAddLink(args) {
    if (!args.url) return JSON.stringify({ hata: 'URL zorunludur.' });
    var cats = await this.db.getCategories();
    var catId = '';
    if (args.kategori) {
      var searchName = args.kategori.toLowerCase().replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i');
      var found = cats.find(function(c) {
        var cn = c.name.toLowerCase().replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i');
        return cn.indexOf(searchName) !== -1;
      });
      if (!found) return JSON.stringify({ hata: '"' + args.kategori + '" odasi bulunamadi. Once olustur veya var olan bir oda adi kullan.' });
      catId = found.id;
    }
    var tags = (args.etiketler || '').split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t.length > 0; });
    var newLink = {
      id: generateId(),
      url: args.url,
      title: args.baslik || extractDomain(args.url),
      description: args.aciklama || '',
      category: catId,
      tags: tags,
      platform: detectPlatform(args.url),
      dateAdded: new Date().toISOString(),
      isFavorite: false,
      isArchived: false
    };
    await this.db.addLinks([newLink]);
    return JSON.stringify({ basarili: true, mesaj: 'Link eklendi: ' + (newLink.title || newLink.url) });
  }

  async _toolBulkCategorize(args) {
    var allLinks = await this.db.getAllLinks();
    // Kategori adi ile eslestirme (ID yerine ad verilmisse)
    if (args.kategori) {
      var cats = await this.db.getCategories();
      var k = args.kategori.toLowerCase().replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i');
      var match = cats.find(function(c) {
        var cn = c.name.toLowerCase().replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i');
        return cn.indexOf(k) !== -1 || c.id.indexOf(k) !== -1;
      });
      if (match) args.kategori = match.id;
    }
    var matched = this._filterLinks(allLinks, args);
    if (matched.length === 0) return JSON.stringify({ hata: 'Kategorize edilecek link bulunamadi' });
    var cats = await this.db.getCategories();
    var ai = this.ai;
    if (!ai) return JSON.stringify({ hata: 'AI baglantisi yok, once API anahtari gir.' });
    var categorized = await ai.categorizeLinks(matched, cats);
    var sayac = 0;
    for (var i = 0; i < categorized.length; i++) {
      var c = categorized[i];
      if (c && c.categoryId && matched[c.index]) {
        await this.db.updateLink(matched[c.index].id, { category: c.categoryId, aiCategorized: true });
        sayac++;
      }
    }
    return JSON.stringify({ basarili: true, mesaj: sayac + '/' + matched.length + ' link AI ile kategorize edildi.', islenen: sayac, toplam: matched.length });
  }

  async _toolSummarizeLinks(args) {
    if (!this.ai) return JSON.stringify({ hata: 'AI baglantisi yok.' });
    var allLinks = await this.db.getAllLinks();
    var matched = this._filterLinks(allLinks, args);
    if (matched.length === 0) return JSON.stringify({ hata: 'Özetlenecek link bulunamadi' });
    var cats = await this.db.getCategories();
    var sonuc = { basarili: 0, toplam: matched.length, detay: [] };
    for (var i = 0; i < Math.min(matched.length, 3); i++) {
      try {
        var link = matched[i];
        var proxyUrl = PROXY_URL + '/summarize?url=' + encodeURIComponent(link.url);
        var resp = await fetch(proxyUrl);
        var data = await resp.json();
        var result = await this.ai.summarizeLink({
          url: link.url, title: link.title || '', description: link.description || '',
          text_content: data.text_content || data.description || ''
        }, cats);
        if (result.summary) {
          await this.db.updateLink(link.id, { summary: result.summary, aiTags: result.aiTags || [], aiSuggestCategory: result.suggestedCategory || '', summarizedAt: new Date().toISOString() });
          sonuc.basarili++;
        }
        sonuc.detay.push({ url: link.url, ozet: result.summary || 'Özet çikarilamadi', onerilen_kategori: result.suggestedCategory || '', etiketler: result.aiTags || [] });
      } catch (_) {}
    }
    sonuc.mesaj = sonuc.basarili + '/' + sonuc.toplam + ' link özetlendi.';
    return JSON.stringify(sonuc);
  }

  // Ortak link filtreleme yardimcisi
  _filterLinks(links, args) {
    var result = links.slice();
    if (args.url) {
      var urlLower = args.url.toLowerCase();
      result = result.filter(function(l) { return l.url.toLowerCase().indexOf(urlLower) !== -1; });
    }
    if (args.platform) {
      var p = args.platform.toLowerCase();
      result = result.filter(function(l) { return (l.platform || '').toLowerCase() === p; });
    }
    if (args.sorgu) {
      var q = args.sorgu.toLowerCase();
      result = result.filter(function(l) {
        return (l.title || '').toLowerCase().indexOf(q) !== -1 ||
               (l.description || '').toLowerCase().indexOf(q) !== -1 ||
               l.url.toLowerCase().indexOf(q) !== -1 ||
               (l.tags || []).some(function(t) { return t.toLowerCase().indexOf(q) !== -1; });
      });
    }
    if (args.kategori) {
      var k = args.kategori.toLowerCase();
      result = result.filter(function(l) { return (l.category || '').toLowerCase().indexOf(k) !== -1; });
    }
    return result;
  }

  async handleChatMessage() {
    var input = document.getElementById('chatInput');
    var message = input.value.trim();
    if (!message) return;

    ui.addChatMessage('user', message);
    input.value = '';
    this.db.addChatMessage('user', message).catch(function() {});

    if (!this.ai) {
      var noKeyMsg = 'Önce Ayarlar\'dan Groq API key girmen gerekiyor.';
      ui.addChatMessage('bot', noKeyMsg);
      this.db.addChatMessage('bot', noKeyMsg).catch(function() {});
      return;
    }

    // Agent komutlarini dogrudan ele al (hizli yol)
    var agentKeywords = ['arastir', 'kategorize et', 'ajani', 'incele', 'tara', 'analiz et', 'ayristir', 'etiketle', 'duzenle', 'temizle'];
    var normalizedMsg = message.toLowerCase().replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ı/g, 'i');
    var directAgent = false;
    for (var kwIdx = 0; kwIdx < agentKeywords.length; kwIdx++) {
      if (normalizedMsg.indexOf(agentKeywords[kwIdx]) !== -1) { directAgent = true; break; }
    }

    if (directAgent) {
      ui.showChatLoading(true);
      try {
        await this.handleAgentCommand(message);
        ui.showChatLoading(false);
      } catch (err) {
        console.error('Ajan hatası:', err);
        ui.showChatLoading(false);
        ui.addChatMessage('bot', 'Ajan calistirilirken hata olustu: ' + err.message);
      }
      return;
    }

    // Tool calling chat akisi
    ui.showChatLoading(true);
    try {
      var result = await this._chatToolLoop(message);
      ui.showChatLoading(false);
      ui.addChatMessage('bot', result);
    } catch (err) {
      console.error('Chat hatası:', err);
      ui.showChatLoading(false);
      var errorMsg = err.message || 'Bilinmeyen hata';
      var friendlyMsg = '⚠️ Şu anda cevap veremiyorum. ';
      if (errorMsg.indexOf('Rate limit') !== -1 || errorMsg.indexOf('429') !== -1) {
        friendlyMsg += 'Çok fazla istek gönderildi, biraz bekle ve tekrar dene.';
      } else if (errorMsg.indexOf('Günlük') !== -1 || errorMsg.indexOf('daily') !== -1) {
        friendlyMsg += 'Groq günlük limiti doldu. Ya DeepSeek\'e geç ya da yarın dene.';
      } else if (errorMsg.indexOf('API anahtarı') !== -1 || errorMsg.indexOf('401') !== -1 || errorMsg.indexOf('geçersiz') !== -1) {
        friendlyMsg += 'API anahtarı geçersiz, ayarlardan kontrol et.';
      } else if (errorMsg.indexOf('bütçe') !== -1) {
        friendlyMsg += errorMsg;
      } else if (errorMsg.indexOf('Ağ') !== -1 || errorMsg.indexOf('bağlanılamıyor') !== -1) {
        friendlyMsg += 'İnternet bağlantını kontrol et.';
      } else if (errorMsg.indexOf('Insufficient Balance') !== -1 || errorMsg.indexOf('402') !== -1) {
        friendlyMsg += 'DeepSeek bakiyen yetersiz, hesabına para yüklemelisin.';
      } else {
        friendlyMsg += errorMsg;
      }
      ui.addChatMessage('bot', friendlyMsg);
    }
  }

  async _chatToolLoop(userMessage) {
    var systemPrompt =
      'Sen LinkSlash adli kisisel HAFIZA SARAYI ASISTANIsin. Kullanicinin dijital kutuphanesindeki linkleri ODA adini verdigimiz zihinsel mekanlarda duzenlemek icin sana guveniyor.\n\n' +
      'YAPABILDIKLERIN:\n' +
      '- Koleksiyon hakkinda istatistik ver — koleksiyon_ozeti fonksiyonunu kullan\n' +
      '- Linkleri ara/listele/goster — link_ara fonksiyonunu uygun parametrelerle kullan\n' +
      '- Odalari goster — kategorileri_listele fonksiyonunu kullan\n' +
      '- Son eklenen linkleri goster — son_eklenenler fonksiyonunu kullan\n' +
      '- AI ajanini baslat (arastir/oda yerlestir/temizle) — ajani_baslat fonksiyonunu kullan\n' +
      '- Linkleri BASKA ODAYA TASI — linkleri_tasi fonksiyonunu kullan\n' +
      '- Linkleri SIL — link_sil fonksiyonunu kullan (dikkatli, kalici!)\n' +
      '- Linkleri FAVORIYE EKLE/CIKAR — link_favori fonksiyonunu kullan\n' +
      '- Linklere ETIKET / CENGEL EKLE — etiket_ekle fonksiyonunu kullan\n' +
      '- Yeni ODA OLUSTUR — kategori_olustur fonksiyonunu kullan\n' +
      '- Oda SIL — kategori_sil fonksiyonunu kullan (bos odalar icin)\n' +
      '- Yeni LINK EKLE — link_ekle fonksiyonunu kullan\n' +
      '- Toplu AI ODA YERLESTIRME YAP — toplu_kategorize_et fonksiyonunu kullan\n' +
      '- Linkleri OZETLE, iceriklerini analiz et, konu cikar — link_ozetle fonksiyonunu kullan\n\n' +
      'YETKI ve SINIRLAR:\n' +
      '- Kullanici acikca istemeden linkleri silme veya tasima. Once onay al: "su linkleri tasiyim mi?" diye sor.\n' +
      '- Link silme islemlerinde mutlaka kullanicidan onay iste: "X linki kalici olarak sileyim mi?"\n' +
      '- Oda silme islemlerinde once odanin bos oldugundan emin ol, bos degilse kullaniciyi uyar.\n' +
      '- Link ekleme islemlerinde kullaniciya eklenen linki goster.\n\n' +
      'KENDI KAPASITENI BIL:\n' +
      '- Koleksiyonda kac link oldugunu koleksiyon_ozeti ile ogrenebilirsin.\n' +
      '- Toplu islemlerde (oda yerlestir, ozetle) link sayisi onemli degil, fonksiyonlar batch halinde calisir.\n' +
      '- Kullanici "cok zaman almaz mi?", "fazla token harcar mi?", "1616 link iyi mi?" gibi seyler sorarsa: "Her sey batch halinde calisiyor, sen isine bak, ben arkada hallederim. Ama coook beklersen Groq rate limit\'e takilabilir, o zaman DeepSeek\'e geceriz." seklinde cevap ver.\n' +
      '- Token/tahmini sure hesaplama yapma, sadece "batch sistemi var, sikinti olmaz" de.\n' +
      '- Kendi limitlerini bilmiyormus gibi davranma. Samimi ama bilgili ol.\n\n' +
      'KONUSMA KURALLARI:\n' +
      '- Kisa ve oz konus, max 3-4 cumle\n' +
      '- Samimi ol, arkadas gibi ("kanka", "tamamdir", "hallediyorum")\n' +
      '- Emoji kullan ama abartma\n' +
      '- Link gosterirken en fazla 3-5 linkten bahset, fazlasi icin "daha var" de\n' +
      '- Kullanici senden, yeteneklerinden, token/tahmini sure/kapasiteden bahsediyorsa (meta-soru) ASLA fonksiyon cagirma. Direkt samimi cevap ver. Batch sistemi var de, "sen isine bak" de.\n' +
      '- Kullanici linklerle ilgili bir sey soruyorsa (ara, listele, goster, kac tane, odalar) o ZAMAN fonksiyon cagir.\n' +
      '- ASLA uydurma, sadece fonksiyonlardan gelen verilerle konus\n' +
      '- Kullaniciya aksiyon oner: "su linkleri bir odaya yerlestirelim mi?", "bunlara etiket ekleyelim mi?" gibi\n' +
      '- Islem sonucunu soyle: kac link tasindi, hangi odaya, vb.';

    var messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Onceki konusmalari ekle (son 10)
    var chatHistory = ui.getChatHistory();
    for (var h = Math.max(0, chatHistory.length - 10); h < chatHistory.length; h++) {
      var msg = chatHistory[h];
      if (msg.content && msg.content.length > 0) {
        messages.push({ role: msg.role, content: msg.content.substring(0, 2000) });
      }
    }

    messages.push({ role: 'user', content: userMessage });

    var tools = this._getChatTools();
    var maxToolIterations = 5;

    for (var iter = 0; iter < maxToolIterations; iter++) {
      var response = await this.ai._makeChatRequest(messages, tools);
      var choice = response.choices && response.choices[0];
      if (!choice) throw new Error('API yanıtı beklenmedik formatta.');

      var message = choice.message;
      if (!message) throw new Error('Mesaj alınamadı.');

      // AI direkt cevap verdi
      if (!message.tool_calls || message.tool_calls.length === 0) {
        return message.content || 'Cevap alınamadı.';
      }

      // AI fonksiyon cagirmak istedi
      messages.push(message);
      for (var tc = 0; tc < message.tool_calls.length; tc++) {
        var toolCall = message.tool_calls[tc];
        if (toolCall.type !== 'function') continue;

        var funcName = toolCall.function.name;
        var funcArgs = {};
        try { funcArgs = JSON.parse(toolCall.function.arguments || '{}'); } catch (_) {}

        var toolResult = await this._executeTool(funcName, funcArgs);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResult
        });
      }
      // Döngü devam eder — AI tool sonuçlarını değerlendirir
    }

    // Max iterasyon asildi, son mesaji dondur
    return 'Cok fazli islem tamamlandi. Baska bir sey sorabilir misin?';
  }

  // ==========================================
  // DIJITAL KUTUPHANE AJANI v1.0
  // ==========================================

  /**
   * Mega buton: Tum linkleri tek tikta AI ile odalara yerlestirir.
   */
  async autoOrganizeAll() {
    if (!this.ai) {
      ui.showToast('AI ayarlari yapilmamis. Ayarlardan API anahtari gir.', 'warning');
      return;
    }

    var allLinks = await this.db.getAllLinks();
    if (allLinks.length === 0) {
      ui.showToast('Henuz hic link yok. Once link ekleyin.', 'info');
      return;
    }

    var categories = await this.db.getCategories();
    if (!categories || categories.length === 0) {
      ui.showToast('Odalar yuklenemedi. Sayfayi yenileyin.', 'error');
      return;
    }

    var confirmed = await ui.confirm(
      '✨ AI ile Düzenle',
      allLinks.length + ' link taranip uygun odalara yerlestirilecek. Islem birkac dakika surebilir. Devam edilsin mi?'
    );
    if (!confirmed) return;

    ui.showToast('AI dusunuyor... ' + allLinks.length + ' link incelenecek.', 'info');
    await this._runAgentInternal(allLinks, categories, 'Genel icerik analizi');
  }

  /**
   * Sade Ajan: Secili platformlardaki linkleri AI ile odalara yerlestirir.
   */
  async runAgent(platforms, criteria) {
    if (!this.ai) {
      ui.showToast('AI baglantisi gerekli.', 'warning');
      return;
    }

    platforms = platforms || ['x', 'twitter', 'youtube'];
    criteria = criteria || 'Genel icerik analizi';

    var allLinks = await this.db.getAllLinks();
    var targetLinks = allLinks.filter(function(l) {
      var p = (l.platform || '').toLowerCase();
      var url = (l.url || '').toLowerCase();
      return platforms.some(function(target) {
        return p === target || url.includes(target);
      });
    });

    if (targetLinks.length === 0) {
      ui.showToast('Secili platformlarda link bulunamadi.', 'info');
      return;
    }

    var categories = await this.db.getCategories();
    if (!categories || categories.length === 0) {
      ui.showToast('Once oda/kategori olusturun.', 'warning');
      return;
    }

    ui.showToast('Ajan ' + targetLinks.length + ' linki inceliyor...', 'success');
    await this._runAgentInternal(targetLinks, categories, criteria);
  }

  /**
   * Ortak batch isleme: Linkleri AI'a yollar, sonuclari tabloda gosterir.
   */
  async _runAgentInternal(targetLinks, categories, criteria) {
    // UI'a gec
    window.location.hash = '#bulkai';
    await this.loadBulkAI();

    var progressEl = document.getElementById('bulkAIProgress');
    var progressFill = document.getElementById('bulkAIProgressFill');
    var progressText = document.getElementById('bulkAIProgressText');
    var cancelBtn = document.getElementById('cancelBulkAIBtn');
    progressEl.classList.remove('hidden');
    if (cancelBtn) cancelBtn.classList.remove('hidden');
    document.getElementById('bulkAIResults').classList.add('hidden');

    this._agentCancelled = false;
    var cancelToken = { cancelled: false };
    this._agentCancelToken = cancelToken;

    var batchSize = 12;
    var totalBatches = Math.ceil(targetLinks.length / batchSize);
    var allResults = [];
    var self = this;

    var roomList = categories.map(function(c) {
      return c.emoji + ' ' + c.name + ' (id: ' + c.id + ') → ' + (c.description || 'Aciklama yok');
    }).join('\n');

    progressText.textContent = 'AI hazirlaniyor...';

    for (var bi = 0; bi < totalBatches; bi++) {
      if (self._agentCancelled || cancelToken.cancelled) break;

      var batch = targetLinks.slice(bi * batchSize, (bi + 1) * batchSize);

      var linkList = batch.map(function(l, i) {
        var parts = ['[' + i + '] ' + l.url];
        if (l.platform) parts.push('Platform: ' + l.platform);
        if (l.title) parts.push('Baslik: ' + l.title);
        return parts.join(' | ');
      }).join('\n');

      var systemPrompt =
        'Sen bir HAFIZA SARAYI ARASTIRMACISIsin. Linkleri dogru ODAYA yerlestir.\n' +
        'YANIT SADECE JSON. Baska bir sey yazma.\n\n' +
        'ARASTIRMA KRITERI: ' + criteria + '\n\n' +
        'ODALAR:\n' + roomList + '\n\n' +
        'Her link icin sunlari belirle:\n' +
        '- categoryId: Odalardan en uygununun IDsi\n' +
        '- subcategory: Alt konu / çengel (1-3 kelime)\n' +
        '- title: En iyi baslik\n' +
        '- description: 1 cumlelik Turkce ozet\n' +
        '- confidence: 0-1 arasi guven\n' +
        '- reasoning: Neden bu oda (1 cumle)\n\n' +
        'KURALLAR:\n' +
        '1. Her linki MUTLAKA bir odaya yerlestir. "diger" son care.\n' +
        '2. Oda aciklamalarina gore karar ver.\n' +
        '3. URL ve platform yeterli, tahmin et.\n\n' +
        'YANIT FORMATI (sadece JSON):\n' +
        '{"results":[{"index":0,"categoryId":"kutuphane","subcategory":"Derin Ogrenme","title":"...","description":"...","confidence":0.9,"reasoning":"..."}]}';

      var messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Linkler:\n\n' + linkList }
      ];

      var percent = Math.round((bi / totalBatches) * 100);
      progressFill.style.width = percent + '%';
      progressText.textContent = 'Isleniyor: ' + (bi + 1) + '/' + totalBatches + ' grup (' + (bi * batchSize + 1) + '-' + Math.min((bi + 1) * batchSize, targetLinks.length) + '. link)';

      try {
        var response = await this.ai._makeChatRequest(messages);
        var content = response.choices[0].message?.content || '';
        var suggestions = self._parseAgentResponse(content, batch.length);

        suggestions.forEach(function(s) {
          var link = batch[s.index];
          if (!link) return;
          allResults.push({
            linkId: link.id,
            url: link.url,
            currentCategory: link.category,
            title: s.title || link.title || '',
            description: s.description || link.description || '',
            categoryId: s.categoryId || 'diger',
            subcategory: s.subcategory || '',
            confidence: s.confidence,
            reasoning: s.reasoning || ''
          });
        });
      } catch (err) {
        console.error('[Ajan] Batch ' + (bi + 1) + ' hatasi:', err);
        batch.forEach(function(link) {
          allResults.push({
            linkId: link.id, url: link.url, currentCategory: link.category,
            title: link.title || '', description: link.description || '',
            categoryId: 'diger', subcategory: 'Belirsiz', confidence: 0,
            reasoning: 'AI hatasi'
          });
        });
      }
    }

    if (this._agentCancelled || cancelToken.cancelled) {
      progressText.textContent = 'Durduruldu.';
      if (cancelBtn) cancelBtn.classList.add('hidden');
      ui.showToast('Islem durduruldu.', 'warning');
      return;
    }
    if (cancelBtn) cancelBtn.classList.add('hidden');

    progressFill.style.width = '100%';
    progressText.textContent = 'Tamamlandi: ' + allResults.length + ' link incelendi.';

    var highConf = allResults.filter(function(r) { return r.confidence >= 0.5; });
    var lowConf = allResults.filter(function(r) { return r.confidence < 0.5; });

    ui.showToast(
      highConf.length + ' link yuksek guvenle yerlestirildi, ' + lowConf.length + ' dusuk guven/belirsiz',
      'success'
    );

    this._agentResults = allResults;
    ui.renderAgentResults(allResults, await this.db.getCategories(), criteria);
    document.getElementById('bulkAIResults').classList.remove('hidden');
  }

  /**
   * AI'ın JSON yanıtını parse eder. 
   */
  _parseAgentResponse(responseText, linkCount) {
    var parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (_) {
      var jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch (_2) { parsed = null; }
      }
    }

    var results = (parsed && (parsed.results || parsed.data)) || [];

    if (!Array.isArray(results)) {
      results = (typeof results === 'object' && results !== null) ? [results] : [];
    }

    var cleaned = [];
    for (var i = 0; i < results.length; i++) {
      var item = results[i];
      if (!item || typeof item !== 'object') continue;
      cleaned.push({
        index: typeof item.index === 'number' ? item.index : i,
        categoryId: (item.categoryId || item.category_id || item.category || 'diger').toString(),
        subcategory: (item.subcategory || '').toString().substring(0, 40),
        title: (item.title || '').toString().substring(0, 60),
        description: (item.description || '').toString().substring(0, 200),
        confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
        reasoning: (item.reasoning || '').toString().substring(0, 150)
      });
    }

    var covered = {};
    cleaned.forEach(function(c) { covered[c.index] = true; });
    for (var j = 0; j < linkCount; j++) {
      if (!covered[j]) {
        cleaned.push({ index: j, categoryId: 'diger', subcategory: 'Belirsiz', title: '', description: '', confidence: 0, reasoning: '' });
      }
    }

    cleaned.sort(function(a, b) { return a.index - b.index; });
    return cleaned;
  }

  async applyAgentResults(applyAll) {
    if (!this._agentResults || this._agentResults.length === 0) return;

    var selectedIndices = ui.getSelectedBulkAIIndices();
    var toApply = applyAll ? this._agentResults : this._agentResults.filter(function(_, i) {
      return selectedIndices.has(i);
    });

    var appliedCount = 0;
    for (var i = 0; i < toApply.length; i++) {
      var r = toApply[i];
      try {
        var updates = { category: r.categoryId };
        if (r.title) updates.title = r.title;
        if (r.description) updates.description = r.description;
        if (r.subcategory) {
          var link = await this.db.getLink(r.linkId);
          var currentTags = (link && link.tags) || [];
          if (!currentTags.includes(r.subcategory)) {
            updates.tags = currentTags.concat([r.subcategory]);
          }
        }
        updates.aiCategorized = true;
        await this.db.updateLink(r.linkId, updates);
        appliedCount++;
      } catch (err) {
        console.warn('Ajan: Link guncellenemedi:', r.linkId, err);
      }
    }

    ui.showToast('Ajan: ' + appliedCount + ' link guncellendi!', 'success');
    await this.loadBulkAI();
  }

  async handleAgentCommand(userMessage) {
    var fallback = function() {
      var msg = userMessage.toLowerCase()
        .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
        .replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i')
        .replace(/İ/g, 'i');
      var platforms = [];
      if (msg.includes('x') || msg.includes('twitter')) platforms.push('x', 'twitter');
      if (msg.includes('youtube')) platforms.push('youtube');
      if (msg.includes('instagram')) platforms.push('instagram');
      if (msg.includes('github')) platforms.push('github');
      if (msg.includes('linkedin')) platforms.push('linkedin');
      if (platforms.length === 0) platforms = ['x', 'twitter', 'youtube'];
      // Sadece "x" platformu belirtilmisse diger platformlari EKLEME
      if (platforms.length === 1 && platforms[0] === 'x') platforms = ['x', 'twitter'];
      var criteria = msg.includes('ai') || msg.includes('yapay zeka') ? 'AI ile alakali' :
                     msg.includes('egitim') ? 'Egitim ile alakali' :
                     msg.includes('proje') || msg.includes('kod') ? 'Yazilim ve projeler' :
                     msg.includes('is') ? 'Is ve kariyer' :
                     'Genel icerik analizi';
      return { platforms: platforms, criteria: criteria, action: 'research', category: 'diger' };
    };

    var systemPrompt =
      'Sen bir komut analiz asistanisin. Kullanicinin dogal dil komutunu analiz et ve SADECE JSON formatinda yanit ver.\n' +
      'JSON formati: {"action": "research|move|categorize|info|cleanup", "platforms": ["x","youtube","instagram","github","linkedin","all"], "criteria": "...", "category": "egitim|is|projeler|etkilesim|diger"}\n\n' +
      'Kurallar:\n' +
      '- action: "research" (arastir/analiz et), "categorize" (kategorize et/tasi), "info" (bilgi ver), "cleanup" (temizle)\n' +
      '- platforms: Kullanicinin belirttigi platformlar. SADECE belirtilenleri ekle.\n' +
      '   * "X" veya "Twitter" dediyse → ["x"]\n' +
      '   * "sadece X" dediyse → ["x"] (sadece o platform)\n' +
      '   * "X ve YouTube" dediyse → ["x", "youtube"]\n' +
      '   * Hic platform belirtilmediyse → ["all"]\n' +
      '   * ASLA platform belirtilmemisse tum platformlari ekleme\n' +
      '- criteria: Kullanicinin aradigi konu/kriter. Kisa ozet.\n' +
      '   * "AI ile alakali" → "AI icerikleri"\n' +
      '   * "egitim" → "Egitim icerigi"\n' +
      '   * "komik" → "Komik/mizah"\n' +
      '   * ONEMLI: Kullanici "X" (platform) dediyse criteria "X" olmaz, bos veya "Genel" olur\n' +
      '- category: Hedef kategori (sadece categorize action icin, yoksa "diger")';

    var messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Komut: "' + userMessage + '"' }
    ];

    try {
      var resp = await this.ai._makeChatRequest(messages);
      var content = resp.choices && resp.choices[0] && resp.choices[0].message ? resp.choices[0].message.content : null;
      if (!content) { var fb = fallback(); this.runAgent(fb.platforms, fb.criteria); return null; }

      var parsed;
      try {
        var match = content.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(match ? match[0] : content);
      } catch (e) {
        console.warn('Komut analizi JSON parse hatasi:', content);
        var fb2 = fallback();
        this.runAgent(fb2.platforms, fb2.criteria);
        return null;
      }

      var action = parsed.action || 'research';
      var platforms = parsed.platforms || ['all'];
      var criteria = parsed.criteria || 'Genel icerik analizi';

      if (platforms.indexOf('all') !== -1 || platforms.length === 0) {
        platforms = ['x', 'twitter', 'youtube', 'instagram', 'github', 'linkedin'];
      }

      if (action === 'research' || action === 'categorize') {
        var platformLabels = { x: 'X (Twitter)', youtube: 'YouTube', instagram: 'Instagram', github: 'GitHub', linkedin: 'LinkedIn' };
        var platformNames = platforms
          .filter(function(p) { return p !== 'twitter'; })
          .map(function(p) { return platformLabels[p] || p; })
          .join(', ') || 'tum platformlar';
        ui.addChatMessage('bot', '✅ Anladim! **' + platformNames + '** platformlarinda "' + criteria + '" kriterine gore arastirma basliyor...\nSonuclar **#bulkai** goruntusunde listelenecek.');
        this.runAgent(platforms, criteria);
      } else if (action === 'info') {
        ui.addChatMessage('bot', 'Bilgi sorgusu: ' + criteria);
      } else if (action === 'cleanup') {
        ui.addChatMessage('bot', 'Temizleme ozelligi henuz hazir degil. Manuel olarak yapabilirsin.');
      } else {
        var fb3 = fallback();
        this.runAgent(fb3.platforms, fb3.criteria);
      }
    } catch (err) {
      console.error('Komut analizi hatasi:', err);
      var fb4 = fallback();
      this.runAgent(fb4.platforms, fb4.criteria);
    }

    return null;
  }
}

// ==========================================
// UYGULAMA BAŞLATMA
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();

  // Global hata yakalama
  window.addEventListener('unhandledrejection', function(e) {
    console.error('[LinkSlash] Yakalanamayan hata:', e.reason);
    if (e.reason && e.reason.message && e.reason.message.indexOf('DeepSeek aylık') === -1) {
      ui.showToast('Beklenmeyen bir hata oluştu. Konsola bak: ' + (e.reason.message || ''), 'error', 10000);
    }
  });
  window.addEventListener('error', function(e) {
    console.error('[LinkSlash] Global hata:', e.error || e.message);
  });
});
