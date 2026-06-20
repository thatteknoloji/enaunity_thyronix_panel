/**
 * LinkSlash UI Bileşenleri
 * Tüm render ve DOM manipülasyon fonksiyonları
 */

class UI {
  constructor() {
    this.selectedLinks = new Set();
    this.selectedImportLinks = new Set();
    this.parsedLinks = [];
    this.currentView = 'dashboard';
    this.currentFilter = { type: 'all' };
    this.currentSort = 'dateAdded-desc';
    this.chatHistory = [];
    this.maxChatHistory = 10;
    this.db = null;
  }

  // ==========================================
  // TOAST BİLDİRİMLERİ
  // ==========================================

  showToast(message, type = 'info', duration) {
    if (duration === undefined) {
      duration = type === 'error' ? 8000 : type === 'warning' ? 5000 : 3000;
    }
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };
    
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${escapeHtml(message)}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Otomatik kaldır (error/warning uzun süreli)
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ==========================================
  // VIEW YÖNETİMİ
  // ==========================================

  showLoading(msg) {
    var bar = document.getElementById('loadingBar');
    if (bar) {
      bar.classList.add('active');
      bar.title = msg || '';
    }
  }

  hideLoading() {
    var bar = document.getElementById('loadingBar');
    if (bar) bar.classList.remove('active');
  }

  showView(viewName) {
    this.hideLoading();
    // Tüm view'ları gizle
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    
    // İstenen view'ı göster
    const view = document.getElementById(`view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
    if (view) {
      view.classList.remove('hidden');
    }
    
    this.currentView = viewName;
  }

  showWelcomeScreen() {
    document.getElementById('welcomeScreen').classList.remove('hidden');
    document.getElementById('appLayout').classList.add('hidden');
  }

  showAppLayout() {
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('appLayout').classList.remove('hidden');
  }

  // ==========================================
  // MODAL YÖNETİMİ
  // ==========================================

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
      // İlk input'a fokusla
      const firstInput = modal.querySelector('input:not([type="hidden"]), textarea, select');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  }

  // Onay dialog'u
  confirm(title, message) {
    return new Promise((resolve) => {
      document.getElementById('confirmTitle').textContent = title;
      document.getElementById('confirmMessage').textContent = message;
      this.openModal('confirmModal');
      
      const okBtn = document.getElementById('confirmOkBtn');
      const cancelBtn = document.getElementById('confirmCancelBtn');
      
      const cleanup = () => {
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        this.closeModal('confirmModal');
      };
      
      const onOk = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };
      
      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
    });
  }

  // ==========================================
  // DASHBOARD
  // ==========================================

  async renderDashboard(db) {
    const stats = await db.getStats();
    const categories = await db.getCategories();
    const allLinks = await db.getAllLinks();
    const recentLinks = allLinks.slice(0, 8);

    // İstatistikler
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statCategories').textContent = categories.length;
    
    const platformCount = Object.keys(stats.byPlatform).length;
    document.getElementById('statPlatforms').textContent = platformCount;
    document.getElementById('statFavorites').textContent = stats.favorites;

    // Kategori kartları
    const categoryGrid = document.getElementById('categoryGrid');
    
    // Eğer hiç link yoksa hoş bir rehber ekranı göster
    if (allLinks.length === 0) {
      categoryGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">👋</div>
          <h3>LinkSlash'e Hoş Geldin</h3>
          <p>Henüz hiç link kaydetmemişsin. Hemen bir link eklemek için <strong>Ctrl+N</strong> tuşlarına basabilir<br>veya sol menüdeki 📥 <strong>Import</strong> kısmından WhatsApp geçmişini yükleyebilirsin.</p>
        </div>
      `;
      document.getElementById('recentLinks').innerHTML = '';
    } else {
      categoryGrid.innerHTML = categories.map(cat => {
        const count = stats.byCategory[cat.id] || 0;
        return `
          <div class="category-card" data-category="${escapeHtml(cat.id)}" onclick="window.location.hash='category:${escapeHtml(cat.id)}'" style="--cat-color: ${cat.color}; cursor: pointer;">
            <span class="emoji">${cat.emoji}</span>
            <div class="info">
              <div class="name">${escapeHtml(cat.name)}</div>
              <div class="count">${count} link</div>
              ${cat.description ? `<div class="desc">${escapeHtml(cat.description)}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');
      
      // Son eklenenler
      this.renderLinkCards(recentLinks, 'recentLinks', categories);
    }

    // Sidebar sayaçları güncelle
    this.updateSidebarCounts(stats, categories);
  }

  // ==========================================
  // SIDEBAR
  // ==========================================

  renderSidebarCategories(categories, stats) {
    const container = document.getElementById('dynamicCategories');
    container.innerHTML = categories.map(cat => {
      const count = (stats && stats.byCategory && stats.byCategory[cat.id]) || 0;
      return `
        <div class="sidebar-item-wrap">
          <button class="sidebar-item" data-filter="category:${escapeHtml(cat.id)}">
            <span class="sidebar-item-emoji">${cat.emoji}</span>
            <span class="sidebar-item-name">${escapeHtml(cat.name)}</span>
            <span class="sidebar-item-count">${count}</span>
          </button>
          <div class="sidebar-item-reorder">
            <button class="reorder-btn" data-action="moveCategoryUp" data-category-id="${escapeHtml(cat.id)}" title="Yukarı">▲</button>
            <button class="reorder-btn" data-action="moveCategoryDown" data-category-id="${escapeHtml(cat.id)}" title="Aşağı">▼</button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderSidebarPlatforms(stats) {
    const container = document.getElementById('sidebarPlatforms');
    var byPlatform = (stats && stats.byPlatform) || {};
    
    // Tüm tanımlı platformları göster (sıfır olsa bile), link sayısına göre sırala
    var platforms = Object.keys(PLATFORMS)
      .map(function(p) { return [p, byPlatform[p] || 0]; })
      .sort(function(a, b) { return b[1] - a[1]; });
    
    container.innerHTML = platforms.map(function(entry) {
      var platform = entry[0];
      var count = entry[1];
      var info = PLATFORMS[platform] || PLATFORMS.website;
      return `
        <button class="sidebar-item" data-filter="platform:${platform}">
          <span class="sidebar-item-emoji">${info.emoji}</span>
          <span class="sidebar-item-name">${info.name}</span>
          <span class="sidebar-item-count">${count}</span>
        </button>
      `;
    }).join('');
  }

  updateSidebarCounts(stats, categories) {
    document.getElementById('countAll').textContent = stats.total;
    document.getElementById('countFavorites').textContent = stats.favorites;
    
    // Kategorisiz sayısı: toplam - kategorili olanlar toplamı
    const categorized = Object.values(stats.byCategory).reduce((a, b) => a + b, 0);
    document.getElementById('countUncategorized').textContent = stats.total - categorized;

    this.renderSidebarCategories(categories, stats);
    this.renderSidebarPlatforms(stats);
    
    // Arşiv sayısı
    const archivedCount = stats.total - (typeof stats.activeCount === 'number' ? stats.activeCount : stats.total);
    const countArchivedSection = document.getElementById('countArchivedSection');
    if (countArchivedSection) {
      countArchivedSection.textContent = archivedCount || 0;
    }

    // Ölü link sayısı
    const countDeadLinks = document.getElementById('countDeadLinks');
    if (countDeadLinks) {
      countDeadLinks.textContent = stats.deadLinks || 0;
    }

    // Yer imi sayısı
    var bookCat = categories.find(function(c) { return c.name === '🔖 Yer İmleri'; });
    var countBookmarks = document.getElementById('countBookmarks');
    if (countBookmarks) {
      countBookmarks.textContent = bookCat && stats.byCategory[bookCat.id] ? stats.byCategory[bookCat.id] : 0;
    }
  }

  renderSidebarTags(tagList) {
    var container = document.getElementById('sidebarTags');
    if (!container) return;
    if (!tagList || tagList.length === 0) {
      container.innerHTML = '<p class="text-muted text-xs" style="padding: var(--sp-2) var(--sp-3)">Henüz etiket yok</p>';
      return;
    }
    var maxCount = tagList[0].count;
    container.innerHTML = tagList.slice(0, 20).map(function(t) {
      var size = Math.max(0.7, Math.min(1, 0.7 + (t.count / maxCount) * 0.3));
      return '<button class="sidebar-item sidebar-item-tag" data-tag="' + escapeHtml(t.tag) + '">' +
        '<span class="sidebar-item-emoji" style="opacity:0.6">🏷️</span>' +
        '<span class="sidebar-item-name" style="font-size:' + size + 'rem">' + escapeHtml(t.tag) + '</span>' +
        '<span class="sidebar-item-count">' + t.count + '</span>' +
      '</button>';
    }).join('');
  }

  renderTagManager(tagList) {
    var container = document.getElementById('tagManagerList');
    var noTagsMsg = document.getElementById('noTagsMsg');
    if (!container) return;
    if (!tagList || tagList.length === 0) {
      container.innerHTML = '';
      if (noTagsMsg) noTagsMsg.classList.remove('hidden');
      return;
    }
    if (noTagsMsg) noTagsMsg.classList.add('hidden');
    container.innerHTML = tagList.map(function(t) {
      return '<div class="tag-manager-item" data-tag="' + escapeHtml(t.tag) + '">' +
        '<span class="tag-manager-tag">🏷️ ' + escapeHtml(t.tag) + '</span>' +
        '<span class="text-muted text-sm">' + t.count + ' link</span>' +
        '<div class="tag-manager-actions">' +
          '<button class="btn btn-ghost btn-sm tag-rename-btn" data-tag="' + escapeHtml(t.tag) + '">✏️</button>' +
          '<button class="btn btn-ghost btn-sm text-danger tag-delete-btn" data-tag="' + escapeHtml(t.tag) + '">🗑️</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  renderArchivedList(links, categories) {
    const container = document.getElementById('archivedList');
    const restoreBtn = document.getElementById('archiveRestoreSelectedBtn');
    const deleteBtn = document.getElementById('archiveDeleteSelectedBtn');

    if (!links || links.length === 0) {
      container.innerHTML = '<p class="text-muted">Arşivlenmiş link bulunmuyor.</p>';
      if (restoreBtn) restoreBtn.classList.add('hidden');
      if (deleteBtn) deleteBtn.classList.add('hidden');
      return;
    }

    if (restoreBtn) restoreBtn.classList.remove('hidden');
    if (deleteBtn) deleteBtn.classList.remove('hidden');

    var catMap = {};
    if (categories) categories.forEach(function(c) { catMap[c.id] = c; });

    // Generate category options for the dropdown
    var catOpts = '';
    if (categories) {
      categories.forEach(function(c) {
        catOpts += '<option value="' + escapeHtml(c.id) + '">' + c.emoji + ' ' + escapeHtml(c.name) + '</option>';
      });
    }

    container.innerHTML = '<div class="link-grid">' + links.map(function(link) {
      var cat = catMap[link.category] || { name: 'Odasiz', emoji: '🗃️' };
      var platformInfo = PLATFORMS[link.platform] || { emoji: '🔗' };
      var title = link.title || link.url;
      var desc = link.description || '';
      var catSel = catOpts ? '<select class="category-select category-select-sm" data-action="changeCategory" data-link-id="' + escapeHtml(link.id) + '">' +
        catOpts.replace('value="' + escapeHtml(link.category) + '"', 'value="' + escapeHtml(link.category) + '" selected') +
        '</select>' :
        '<span class="tag">' + cat.emoji + ' ' + escapeHtml(cat.name) + '</span>';
      return '<div class="link-card" data-id="' + escapeHtml(link.id) + '">' +
        '<div class="card-body">' +
          '<div class="card-header">' +
            '<input type="checkbox" class="archive-check" data-id="' + escapeHtml(link.id) + '">' +
            '<span class="card-platform">' + platformInfo.emoji + '</span>' +
            '<a href="' + escapeHtml(link.url) + '" target="_blank" rel="noopener" class="card-title">' + escapeHtml(title) + '</a>' +
          '</div>' +
          '<div class="card-meta">' +
            catSel +
            (desc ? '<span class="text-muted text-sm">' + escapeHtml(desc.substring(0, 100)) + '</span>' : '') +
          '</div>' +
          '<div class="card-actions">' +
            '<button class="btn btn-ghost btn-sm" data-action="archiveRestore" data-id="' + escapeHtml(link.id) + '">📦 Geri Yükle</button>' +
            '<button class="btn btn-ghost btn-sm text-danger" data-action="archiveDelete" data-id="' + escapeHtml(link.id) + '">🗑️ Kalıcı Sil</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
  }

  renderMemoryList(messages) {
    const container = document.getElementById('memoryList');

    if (!messages || messages.length === 0) {
      container.innerHTML = '<p class="text-muted">Henüz hiç konuşma yapılmamış.</p>';
      return;
    }

    container.innerHTML = '<div class="memory-list">' + messages.map(function(msg) {
      var roleClass = msg.role === 'user' ? 'memory-user' : 'memory-bot';
      var roleLabel = msg.role === 'user' ? '👤 Sen' : '🤖 Asistan';
      var date = new Date(msg.timestamp);
      var timeStr = date.toLocaleDateString('tr-TR') + ' ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      var content = escapeHtml(msg.content).replace(/\n/g, '<br>');
      return '<div class="memory-item ' + roleClass + '">' +
        '<div class="memory-header">' +
          '<span class="memory-role">' + roleLabel + '</span>' +
          '<span class="memory-time">' + timeStr + '</span>' +
        '</div>' +
        '<div class="memory-content">' + content + '</div>' +
      '</div>';
    }).reverse().join('') + '</div>';
  }

  setActiveFilter(filterKey) {
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.filter === filterKey) {
        item.classList.add('active');
      }
    });
  }

  // ==========================================
  // LINK KARTLARI
  // ==========================================

  renderLinkCards(links, containerId, categories) {
    this.hideLoading();
    const container = document.getElementById(containerId);
    
    if (!links || links.length === 0) {
      if (containerId === 'linksList') {
        document.getElementById('emptyState').classList.remove('hidden');
      }
      container.innerHTML = '';
      this._pagedLinks = [];
      this._renderedCount = 0;
      return;
    }
    
    if (containerId === 'linksList') {
      document.getElementById('emptyState').classList.add('hidden');
    }

    this._categoryList = categories || [];
    this._pagedLinks = links;
    this._renderedCount = 0;
    this._pageSize = 100;
    this._pageContainerId = containerId;

    container.innerHTML = '';
    this._appendPage();
  }

  _appendPage() {
    if (!this._pagedLinks || this._renderedCount >= this._pagedLinks.length) return;
    const container = document.getElementById(this._pageContainerId);
    if (!container) return;

    var categoryMap = {};
    if (this._categoryList) {
      this._categoryList.forEach(function(c) { categoryMap[c.id] = c; });
    }

    var endIdx = Math.min(this._renderedCount + this._pageSize, this._pagedLinks.length);
    var html = this._pagedLinks.slice(this._renderedCount, endIdx).map(function(link) {
      return this._renderLinkCard(link, categoryMap);
    }, this).join('');

    // Remove old load-more button before inserting new cards
    var oldBtn = container.querySelector('#loadMoreContainer');
    if (oldBtn) oldBtn.remove();

    container.insertAdjacentHTML('beforeend', html);
    this._renderedCount = endIdx;

    if (this._renderedCount < this._pagedLinks.length) {
      var remaining = this._pagedLinks.length - this._renderedCount;
      container.insertAdjacentHTML('beforeend',
        '<div id="loadMoreContainer" class="load-more-container">' +
        '<button id="loadMoreBtn" class="btn btn-secondary btn-sm">Daha Fazla Yükle (' + remaining + ' tane daha)</button>' +
        '<span class="load-more-info">' + this._renderedCount + ' / ' + this._pagedLinks.length + ' link gösteriliyor</span>' +
        '</div>'
      );
    } else {
      container.insertAdjacentHTML('beforeend',
        '<div class="load-more-container load-more-end">' + this._pagedLinks.length + '/' + this._pagedLinks.length + ' link gösteriliyor</div>'
      );
    }
  }

  loadMoreLinks() {
    this._appendPage();
  }

  showBookmarkFolders(links) {
    var container = document.getElementById('linksList');
    if (!container) return;
    document.getElementById('emptyState').classList.add('hidden');

    // Klasörlere göre grupla
    var groups = {};
    links.forEach(function(link) {
      var folder = link.whatsappContext || '';
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(link);
    });

    var folderNames = Object.keys(groups).sort();
    // Klasörsüzleri en alta
    if (folderNames.indexOf('') !== -1) {
      folderNames.splice(folderNames.indexOf(''), 1);
      folderNames.push('');
    }

    container.innerHTML = folderNames.map(function(folder) {
      var count = groups[folder].length;
      var isUnsorted = !folder;
      var displayName = isUnsorted ? '📌 Klasörsüz Linkler' : folder.replace('📁 ', '');
      var icon = isUnsorted ? '📌' : '📁';
      var folderHash = folder ? 'bookmark-folder/' + encodeURIComponent(folder) : 'bookmark-folder/__unsorted__';
      return '<div class="bookmark-folder-card' + (isUnsorted ? ' bookmark-folder-unsorted' : '') + '" onclick="window.location.hash=\'' + folderHash + '\'">' +
        '<div class="bookmark-folder-card-icon">' + icon + '</div>' +
        '<div class="bookmark-folder-card-body">' +
          '<div class="bookmark-folder-card-name">' + escapeHtml(displayName) + '</div>' +
          '<div class="bookmark-folder-card-count">' + count + ' link</div>' +
        '</div>' +
        '<div class="bookmark-folder-card-arrow">→</div>' +
      '</div>';
    }).join('');

    // Tum linkleri duz liste olarak goster butonu (klasor yapisini yok say)
    if (links.length > 0) {
      container.innerHTML += '<div style="margin-top:12px;text-align:center">' +
        '<button class="btn btn-ghost btn-sm" onclick="window.location.hash=\'bookmark-folder/__all__\'">📋 Tüm Linkleri Listele (' + links.length + ' link)</button>' +
      '</div>';
    }
  }

  renderBookmarkGroups(links, categories) {
    const container = document.getElementById('linksList');
    if (!container) return;
    if (!links || links.length === 0) {
      container.innerHTML = '';
      document.getElementById('emptyState').classList.remove('hidden');
      return;
    }
    document.getElementById('emptyState').classList.add('hidden');

    const categoryMap = {};
    if (categories) {
      categories.forEach(c => categoryMap[c.id] = c);
    }

    // Klasörlere göre grupla
    const groups = {};
    links.forEach(link => {
      var folder = '';
      if (link.whatsappContext && link.whatsappContext.startsWith('📁 ')) {
        folder = link.whatsappContext.substring(2).trim();
      }
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(link);
    });

    const folderOrder = Object.keys(groups).sort();
    // Klasörü olmayanlar en alta
    if (folderOrder.indexOf('') !== -1) {
      folderOrder.splice(folderOrder.indexOf(''), 1);
      folderOrder.push('');
    }

    container.innerHTML = folderOrder.map(folder => {
      var title = folder ? '📁 ' + escapeHtml(folder) : '📌 Klasörsüz';
      var cards = groups[folder].map(link => this._renderLinkCard(link, categoryMap)).join('');
      return `
        <div class="bookmark-folder-group">
          <h3 class="bookmark-folder-title">${title} <span class="bookmark-folder-count">${groups[folder].length}</span></h3>
          <div class="bookmark-folder-links">${cards}</div>
        </div>
      `;
    }).join('');
  }

  _renderLinkCard(link, categoryMap) {
    const platform = PLATFORMS[link.platform] || PLATFORMS.website;
    const category = categoryMap[link.category];
    const isSelected = this.selectedLinks.has(link.id);
    const domain = extractDomain(link.url);
    
    var healthStatus = link.healthStatus || '';
    var healthLabelStr = healthLabel(healthStatus);

    const tagsHtml = (link.tags && link.tags.length > 0) 
      ? link.tags.map(t => `<span class="tag tag-clickable" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`).join('')
      : '';
    
    var catOptions = '';
    if (this._categoryList) {
      this._categoryList.forEach(function(c) {
        var sel = c.id === link.category ? ' selected' : '';
        catOptions += '<option value="' + escapeHtml(c.id) + '"' + sel + '>' + c.emoji + ' ' + escapeHtml(c.name) + '</option>';
      });
    }
    const categoryBadge = `<select class="category-select" data-action="changeCategory" data-link-id="${link.id}">${catOptions}</select>`;
    const aiBadge = link.aiCategorized ? '<span class="ai-badge">🤖 AI</span>' : '';

    return `
      <div class="link-card ${isSelected ? 'selected' : ''} ${healthClass(healthStatus)}" data-link-id="${link.id}" data-link-url="${escapeHtml(link.url)}">
        <div class="link-card-header">
          <span class="platform-badge" style="--badge-color: ${platform.color}">${platform.emoji}</span>
          <span class="link-card-title">${escapeHtml(link.title || domain)}</span>
          <button class="btn btn-ghost btn-icon btn-sm link-favorite ${link.isFavorite ? 'active' : ''}" 
                  data-action="toggleFavorite" data-link-id="${link.id}" title="Favori">
            ${link.isFavorite ? '⭐' : '☆'}
          </button>
        </div>
        <a href="${escapeHtml(link.url)}" class="link-card-url" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(truncateText(link.url, 80))}
        </a>
        ${link.description ? `<p class="link-card-description">${escapeHtml(link.description)}</p>` : ''}
        ${link.summary ? `<div class="link-card-summary"><span class="summary-badge">AI</span> ${escapeHtml(link.summary)}</div>` : ''}
        <div class="link-card-meta">
          <div class="link-card-meta-left">
            ${categoryBadge}
            ${aiBadge}
            ${healthLabelStr ? `<span class="health-badge">${healthLabelStr}</span>` : ''}
            ${tagsHtml}
          </div>
          <div class="link-card-meta-right" style="display: flex; flex-direction: column; align-items: flex-end;">
            <span class="link-card-date" title="Eklendi: ${formatDate(new Date(link.dateAdded))}">${timeAgo(new Date(link.dateAdded))} eklendi</span>
            ${link.dateOriginal ? `<span class="link-card-date" style="font-size: 0.75rem; opacity: 0.7;" title="Gönderildi: ${formatDate(new Date(link.dateOriginal))}">WhatsApp: ${formatDateShort(new Date(link.dateOriginal))}</span>` : ''}
          </div>
        </div>
        <div class="link-card-actions">
          <button class="btn btn-ghost btn-sm" data-action="shareLink" data-link-id="${link.id}" title="Paylaş">📤</button>
          <button class="btn btn-ghost btn-sm" data-action="previewLink" data-link-id="${link.id}" title="Önizle">👁️</button>
          <button class="btn btn-ghost btn-sm" data-action="summarizeLink" data-link-id="${link.id}" title="Özetle">📝</button>
          <button class="btn btn-ghost btn-sm" data-action="toggleArchive" data-link-id="${link.id}" title="${link.isArchived ? 'Arşivden Çıkar' : 'Arşivle'}">${link.isArchived ? '📤' : '📦'}</button>
          <button class="btn btn-ghost btn-sm" data-action="editLink" data-link-id="${link.id}" title="Düzenle">✏️</button>
          <button class="btn btn-ghost btn-sm" data-action="deleteLink" data-link-id="${link.id}" title="Sil">🗑️</button>
          <button class="btn btn-ghost btn-sm" data-action="selectLink" data-link-id="${link.id}" title="Seç">
            ${isSelected ? '☑️' : '⬜'}
          </button>
        </div>
      </div>
    `;
  }

  // ==========================================
  // TOOLBAR
  // ==========================================

  updateToolbar(title, count, showBack) {
    document.getElementById('toolbarTitle').textContent = title;
    document.getElementById('toolbarCount').textContent = count + ' link';

    var backDiv = document.getElementById('toolbarBack');
    if (backDiv) {
      if (showBack) {
        backDiv.classList.remove('hidden');
      } else {
        backDiv.classList.add('hidden');
      }
    }

    // Cop ozel butonlari temizle, normal toolbar butonlarini geri getir
    var trashBar = document.getElementById('trashToolbarActions');
    if (trashBar) trashBar.remove();
    var selectAll = document.getElementById('selectAllLinksBtn');
    var batchSum = document.getElementById('batchSummarizeBtn');
    if (selectAll) selectAll.style.display = '';
    if (batchSum) batchSum.style.display = '';
  }

  renderFilterTags(tags, onRemove) {
    var container = document.getElementById('filterTags');
    if (!container) return;
    if (!tags || tags.length === 0) {
      container.classList.add('hidden');
      container.innerHTML = '';
      return;
    }
    container.classList.remove('hidden');
    container.innerHTML = tags.map(function(t) {
      return '<span class="filter-tag">' + escapeHtml(t.label) +
        '<button class="filter-tag-remove" data-filter-type="' + escapeHtml(t.type) + '">×</button></span>';
    }).join('');

    container.querySelectorAll('.filter-tag-remove').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (onRemove) onRemove(btn.getAttribute('data-filter-type'));
      });
    });
  }

  updateBulkActions() {
    const bulkActions = document.getElementById('bulkActions');
    const count = this.selectedLinks.size;
    
    if (count > 0) {
      bulkActions.style.display = 'flex';
      document.getElementById('selectionCount').textContent = `${count} seçili`;
    } else {
      bulkActions.style.display = 'none';
    }
  }

  toggleLinkSelection(linkId) {
    if (this.selectedLinks.has(linkId)) {
      this.selectedLinks.delete(linkId);
    } else {
      this.selectedLinks.add(linkId);
    }
    
    // Kartın görselini güncelle
    const card = document.querySelector(`.link-card[data-link-id="${linkId}"]`);
    if (card) {
      card.classList.toggle('selected', this.selectedLinks.has(linkId));
      const selectBtn = card.querySelector('[data-action="selectLink"]');
      if (selectBtn) {
        selectBtn.textContent = this.selectedLinks.has(linkId) ? '☑️' : '⬜';
      }
    }
    
    this.updateBulkActions();
  }

  clearSelection() {
    this.selectedLinks.clear();
    document.querySelectorAll('.link-card.selected').forEach(card => {
      card.classList.remove('selected');
      const selectBtn = card.querySelector('[data-action="selectLink"]');
      if (selectBtn) selectBtn.textContent = '⬜';
    });
    this.updateBulkActions();
  }

  selectAllLinks(linkIds) {
    this.selectedLinks = new Set(linkIds);
    document.querySelectorAll('.link-card').forEach(card => {
      var id = card.dataset.linkId;
      var isSelected = this.selectedLinks.has(id);
      card.classList.toggle('selected', isSelected);
      var selectBtn = card.querySelector('[data-action="selectLink"]');
      if (selectBtn) selectBtn.textContent = isSelected ? '☑️' : '⬜';
    });
    this.updateBulkActions();
  }

  // ==========================================
  // IMPORT (WhatsApp)
  // ==========================================

  renderImportResults(parsedLinks, categories) {
    this.parsedLinks = parsedLinks;
    this.selectedImportLinks = new Set(parsedLinks.map((_, i) => i));

    const resultsDiv = document.getElementById('importResults');
    if (!resultsDiv) return;
    resultsDiv.classList.remove('hidden');

    // İstatistikler
    const platformCounts = {};
    parsedLinks.forEach(l => {
      platformCounts[l.platform] = (platformCounts[l.platform] || 0) + 1;
    });

    const statsHtml = `
      <div class="import-stats-grid">
        <div class="import-stat">
          <span class="import-stat-number">${parsedLinks.length}</span>
          <span class="import-stat-label">link bulundu</span>
        </div>
        ${Object.entries(platformCounts).map(([platform, count]) => {
          const info = PLATFORMS[platform] || PLATFORMS.website;
          return `
            <div class="import-stat">
              <span class="import-stat-number">${info.emoji} ${count}</span>
              <span class="import-stat-label">${info.name}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
    document.getElementById('importStats').innerHTML = statsHtml;

    // Tablo
    this._renderImportTable(parsedLinks, categories);
    
    // AI butonu: sadece API key varsa göster
    const apiKey = localStorage.getItem('groq_api_key');
    const aiBtn = document.getElementById('aiCategorizeBtn');
    if (aiBtn) {
      aiBtn.style.display = apiKey ? 'inline-flex' : 'none';
    }

    // Select all checkbox
    var selectAllCheck = document.getElementById('importSelectAll');
    if (selectAllCheck) selectAllCheck.checked = true;
  }

  _renderImportTable(parsedLinks, categories) {
    const tbody = document.getElementById('importTableBody');
    tbody.innerHTML = parsedLinks.map((link, index) => {
      const platform = PLATFORMS[link.platform] || PLATFORMS.website;
      const isSelected = this.selectedImportLinks.has(index);
      var contextText = '';
      if (link.whatsappContext) {
        contextText = truncateText(link.whatsappContext.replace(link.url, '').trim(), 60);
      } else if (link.description) {
        contextText = truncateText(link.description, 60);
      } else if (link.tags && link.tags.length > 0) {
        contextText = link.tags.join(', ');
      } else if (link.folder) {
        contextText = '📁 ' + link.folder;
      }
      const dateStr = link.dateOriginal ? formatDateShort(new Date(link.dateOriginal)) : '-';
      
      return `
        <tr class="${isSelected ? 'selected' : ''}" data-import-index="${index}">
          <td class="import-th-check">
            <input type="checkbox" class="import-row-check" data-index="${index}" ${isSelected ? 'checked' : ''}>
          </td>
          <td>
            <span class="platform-badge" style="--badge-color: ${platform.color}">${platform.emoji} ${platform.name}</span>
          </td>
          <td>
            <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="import-url">
              ${escapeHtml(truncateText(link.url, 50))}
            </a>
          </td>
          <td class="text-muted">${escapeHtml(contextText)}</td>
          <td>
            <select class="form-select form-select-sm import-category" data-index="${index}">
              <option value="">Odasiz</option>
              ${categories.map(c => `
                <option value="${c.id}" ${link._suggestedCategory === c.id ? 'selected' : ''}>
                  ${c.emoji} ${escapeHtml(c.name)}
                </option>
              `).join('')}
            </select>
          </td>
          <td class="text-muted">${dateStr}</td>
        </tr>
      `;
    }).join('');
  }

  toggleImportSelection(index) {
    if (this.selectedImportLinks.has(index)) {
      this.selectedImportLinks.delete(index);
    } else {
      this.selectedImportLinks.add(index);
    }
    
    const row = document.querySelector(`tr[data-import-index="${index}"]`);
    if (row) {
      row.classList.toggle('selected', this.selectedImportLinks.has(index));
    }
  }

  selectAllImport(selectAll) {
    if (selectAll) {
      this.parsedLinks.forEach((_, i) => this.selectedImportLinks.add(i));
    } else {
      this.selectedImportLinks.clear();
    }
    
    document.querySelectorAll('.import-row-check').forEach((cb, i) => {
      cb.checked = selectAll;
      const row = cb.closest('tr');
      if (row) row.classList.toggle('selected', selectAll);
    });
  }

  getSelectedImportLinks() {
    const result = [];
    this.selectedImportLinks.forEach(index => {
      const link = this.parsedLinks[index];
      if (link) {
        // Kategori seçimini oku
        const catSelect = document.querySelector(`.import-category[data-index="${index}"]`);
        const category = catSelect ? catSelect.value : '';
        
        result.push({
          ...link,
          category: category,
          title: link._suggestedTitle || '',
          description: link._suggestedDescription || link.whatsappContext || ''
        });
      }
    });
    return result;
  }

  updateImportWithAISuggestions(suggestions) {
    suggestions.forEach(suggestion => {
      const index = suggestion.index;
      if (index >= 0 && index < this.parsedLinks.length) {
        // Parsed link'e önerileri ekle
        this.parsedLinks[index]._suggestedCategory = suggestion.categoryId;
        this.parsedLinks[index]._suggestedTitle = suggestion.title;
        this.parsedLinks[index]._suggestedDescription = suggestion.description;
        
        // Kategori dropdown'ını güncelle
        const catSelect = document.querySelector(`.import-category[data-index="${index}"]`);
        if (catSelect && suggestion.categoryId) {
          catSelect.value = suggestion.categoryId;
        }
      }
    });
  }

  // AI ilerleme
  showAIProgress() {
    this.openModal('aiProgressModal');
    this.updateAIProgress(0, 'Hazırlanıyor...');
  }

  updateAIProgress(percent, text) {
    document.getElementById('aiProgressFill').style.width = `${percent}%`;
    document.getElementById('aiProgressText').textContent = text;
  }

  hideAIProgress() {
    this.closeModal('aiProgressModal');
  }

  // ==========================================
  // LINK EKLEME/DÜZENLEME MODAL
  // ==========================================

  populateCategorySelects(categories) {
    const selects = ['newLinkCategory', 'editLinkCategory'];
    selects.forEach(selectId => {
      const select = document.getElementById(selectId);
      if (!select) return;
      
      select.innerHTML = `
        <option value="">Odasiz</option>
        ${categories.map(c => `
          <option value="${c.id}">${c.emoji} ${escapeHtml(c.name)}</option>
        `).join('')}
      `;
    });
  }

  showPlatformPreview(url) {
    const preview = document.getElementById('platformPreview');
    if (!isValidUrl(url)) {
      preview.classList.add('hidden');
      return;
    }
    
    const platform = detectPlatform(url);
    const info = PLATFORMS[platform] || PLATFORMS.website;
    const domain = extractDomain(url);
    
    preview.classList.remove('hidden');
    preview.innerHTML = `
      <span class="platform-badge" style="--badge-color: ${info.color}">${info.emoji} ${info.name}</span>
      <span class="text-muted">${escapeHtml(domain)}</span>
    `;
  }

  openEditModal(link, categories) {
    document.getElementById('editLinkId').value = link.id;
    document.getElementById('editLinkUrl').value = link.url;
    document.getElementById('editLinkTitle').value = link.title || '';
    document.getElementById('editLinkDescription').value = link.description || '';
    document.getElementById('editLinkTags').value = (link.tags || []).join(', ');
    
    // Kategori select'ini doldur
    const select = document.getElementById('editLinkCategory');
    select.innerHTML = `
      <option value="">Odasiz</option>
      ${categories.map(c => `
        <option value="${c.id}" ${link.category === c.id ? 'selected' : ''}>${c.emoji} ${escapeHtml(c.name)}</option>
      `).join('')}
    `;
    
    this.openModal('editLinkModal');
  }

  getNewLinkData() {
    const url = document.getElementById('newLinkUrl').value.trim();
    const title = document.getElementById('newLinkTitle').value.trim();
    const category = document.getElementById('newLinkCategory').value;
    const description = document.getElementById('newLinkDescription').value.trim();
    const tagsStr = document.getElementById('newLinkTags').value.trim();
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];
    
    if (!url) return null;
    if (!isValidUrl(url)) return null;
    
    return {
      id: generateId(),
      url,
      title: title || extractDomain(url),
      category,
      description,
      tags,
      platform: detectPlatform(url),
      dateAdded: new Date().toISOString(),
      dateOriginal: null,
      whatsappContext: '',
      isFavorite: false,
      isArchived: false,
      aiCategorized: false
    };
  }

  getEditLinkData() {
    return {
      id: document.getElementById('editLinkId').value,
      url: document.getElementById('editLinkUrl').value.trim(),
      title: document.getElementById('editLinkTitle').value.trim(),
      category: document.getElementById('editLinkCategory').value,
      description: document.getElementById('editLinkDescription').value.trim(),
      tags: document.getElementById('editLinkTags').value.trim().split(',').map(t => t.trim()).filter(t => t)
    };
  }

  clearAddLinkForm() {
    document.getElementById('newLinkUrl').value = '';
    document.getElementById('newLinkTitle').value = '';
    document.getElementById('newLinkCategory').value = '';
    document.getElementById('newLinkDescription').value = '';
    document.getElementById('newLinkTags').value = '';
    document.getElementById('platformPreview').classList.add('hidden');
  }

  // ==========================================
  // TOPLU KATEGORİ ATAMA
  // ==========================================

  renderBulkCategoryModal(categories, count, onSelect) {
    document.getElementById('bulkCategoryInfo').textContent = `${count} link seçildi`;
    
    const grid = document.getElementById('bulkCategoryGrid');
    grid.innerHTML = categories.map(cat => `
      <button class="category-select-btn" data-category-id="${cat.id}" style="--cat-color: ${cat.color}">
        <span>${cat.emoji}</span>
        <span>${escapeHtml(cat.name)}</span>
      </button>
    `).join('');
    
    // Event listeners
    grid.querySelectorAll('.category-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        onSelect(btn.dataset.categoryId);
        this.closeModal('bulkCategoryModal');
      });
    });
    
    this.openModal('bulkCategoryModal');
  }

  // ==========================================
  // KATEGORİ YÖNETİMİ (Ayarlar)
  // ==========================================

  renderCategoryManager(categories) {
    const list = document.getElementById('categoryManagerList');
    const selected = this._selectedCategories || new Set();
    list.innerHTML = categories.map((cat, idx) => `
      <div class="category-manager-item ${selected.has(cat.id) ? 'selected' : ''}" data-category-id="${cat.id}">
        <div class="category-manager-item-left">
          <input type="checkbox" class="category-manager-check" data-category-id="${cat.id}" ${selected.has(cat.id) ? 'checked' : ''}>
          <div class="category-manager-reorder">
            <button class="reorder-btn" data-action="moveCategoryUp" data-category-id="${escapeHtml(cat.id)}" title="Yukari" ${idx === 0 ? 'disabled' : ''}>▲</button>
            <button class="reorder-btn" data-action="moveCategoryDown" data-category-id="${escapeHtml(cat.id)}" title="Asagi" ${idx === categories.length - 1 ? 'disabled' : ''}>▼</button>
          </div>
          <span class="category-manager-emoji">${cat.emoji}</span>
          <div class="category-manager-info">
            <span class="category-manager-name">${escapeHtml(cat.name)}</span>
            <span class="category-manager-desc">${escapeHtml(cat.description || '')}</span>
          </div>
          <span class="category-manager-color" style="background: ${cat.color}"></span>
        </div>
        <div class="category-manager-item-right">
          <button class="btn btn-ghost btn-sm" data-action="editCategory" data-category-id="${cat.id}" title="Duzenle">✏️</button>
          <button class="btn btn-ghost btn-sm" data-action="deleteCategory" data-category-id="${cat.id}" title="Sil">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  getSelectedCategories() {
    return Array.from(this._selectedCategories || new Set());
  }

  selectAllCategories(categoryIds) {
    this._selectedCategories = new Set(categoryIds);
  }

  deselectAllCategories() {
    this._selectedCategories = new Set();
  }

  toggleCategorySelection(catId) {
    if (!this._selectedCategories) this._selectedCategories = new Set();
    if (this._selectedCategories.has(catId)) {
      this._selectedCategories.delete(catId);
    } else {
      this._selectedCategories.add(catId);
    }
  }

  openEditCategoryModal(category) {
    document.getElementById('editCatId').value = category.id;
    document.getElementById('editCatName').value = category.name;
    document.getElementById('editCatEmoji').value = category.emoji;
    document.getElementById('editCatColor').value = category.color;
    document.getElementById('editCatDescription').value = category.description || '';
    this.openModal('editCategoryModal');
  }

  getEditCategoryData() {
    return {
      id: document.getElementById('editCatId').value,
      name: document.getElementById('editCatName').value.trim(),
      emoji: document.getElementById('editCatEmoji').value.trim() || '🏛️',
      color: document.getElementById('editCatColor').value,
      description: document.getElementById('editCatDescription').value.trim()
    };
  }

  // ==========================================
  // AYARLAR
  // ==========================================

  loadApiKeyUI() {
    const apiKey = localStorage.getItem('groq_api_key');
    if (apiKey) document.getElementById('apiKeyInput').value = apiKey;
    const dsKey = localStorage.getItem('deepseek_api_key');
    if (dsKey) document.getElementById('deepseekApiKey').value = dsKey;
    const budget = localStorage.getItem('deepseek_monthly_budget');
    if (budget) document.getElementById('deepseekBudget').value = budget;
    this._updateDeepSeekUsageDisplay();
  }

  _updateDeepSeekUsageDisplay() {
    var el = document.getElementById('deepseekUsageDisplay');
    if (!el) return;
    var data = this._getDeepSeekUsage();
    var cost = (data.tokens / 1000000) * 0.20;
    el.textContent = 'Bu ay: ' + data.tokens.toLocaleString() + ' token (~$' + cost.toFixed(2) + ')';
  }

  _getDeepSeekUsage() {
    try {
      return JSON.parse(localStorage.getItem('deepseek_usage') || '{"month":"","tokens":0}');
    } catch (_) { return { month: '', tokens: 0 }; }
  }

  recordDeepSeekUsage(tokens) {
    var data = this._getDeepSeekUsage();
    var now = new Date();
    var monthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    if (data.month !== monthKey) { data.month = monthKey; data.tokens = 0; }
    data.tokens += tokens || 0;
    localStorage.setItem('deepseek_usage', JSON.stringify(data));
    this._updateDeepSeekUsageDisplay();
  }

  isDeepSeekBudgetExceeded() {
    var budget = parseFloat(localStorage.getItem('deepseek_monthly_budget')) || 0;
    if (budget <= 0) return false;
    var data = this._getDeepSeekUsage();
    var cost = (data.tokens / 1000000) * 0.20;
    return cost >= budget;
  }

  showApiKeyStatus(success, message) {
    const status = document.getElementById('apiKeyStatus');
    status.classList.remove('hidden');
    status.className = `api-key-status ${success ? 'api-key-success' : 'api-key-error'}`;
    status.textContent = message;
  }

  toggleAIProviderSettings(provider) {
    ['groqSettings', 'deepseekSettings', 'ollamaSettings'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', id.replace('Settings', '') !== provider);
    });
  }

  showOllamaStatus(success, message) {
    var status = document.getElementById('ollamaStatus');
    if (!status) return;
    status.classList.remove('hidden');
    status.className = 'api-key-status ' + (success ? 'api-key-success' : 'api-key-error');
    status.textContent = message;
  }

  // ==========================================
  // TOPLU AI KATEGORIZASYON
  // ==========================================

  clearBulkAITable() {
    var tbody = document.getElementById('bulkAITableBody');
    if (tbody) tbody.innerHTML = '';
    var countEl = document.getElementById('bulkAIResultCount');
    if (countEl) countEl.textContent = '0 öneri';
  }

  renderBulkAIResults(results, categories) {
    var tbody = document.getElementById('bulkAITableBody');
    var countEl = document.getElementById('bulkAIResultCount');
    if (!tbody) return;

    var catMap = {};
    categories.forEach(function(c) { catMap[c.id] = c; });

    tbody.innerHTML = results.map(function(r, i) {
      var currentCat = catMap[r.currentCategory] || { name: '—', emoji: '' };
      var suggestedCat = catMap[r.suggestedCategory] || { name: r.suggestedCategory, emoji: '' };

      var tagsHtml = '';
      if (r.tags && r.tags.length > 0) {
        tagsHtml = '<div class="ai-tags-preview">' + r.tags.map(function(t) {
          return '<span class="tag">' + t + '</span>';
        }).join('') + '</div>';
      }

      var titleHtml = r.linkTitle ? '<div class="text-sm text-muted">' + r.linkTitle + '</div>' : '';
      var descHtml = r.description ? '<div class="text-xs text-muted">' + r.description + '</div>' : '';

      return '<tr class="ai-suggestion-row" data-index="' + i + '">' +
        '<td><input type="checkbox" class="bulk-ai-check" data-index="' + i + '" checked></td>' +
        '<td>' +
          '<a href="' + r.linkUrl + '" target="_blank" rel="noopener" class="text-sm">' + r.linkUrl + '</a>' +
          titleHtml +
        '</td>' +
        '<td>' + currentCat.emoji + ' ' + currentCat.name + '</td>' +
        '<td class="ai-category-change">' +
          '<span>' + currentCat.emoji + ' ' + currentCat.name + '</span>' +
          '<span class="arrow">→</span>' +
          '<span class="new-cat">' + suggestedCat.emoji + ' ' + suggestedCat.name + '</span>' +
        '</td>' +
        '<td>' + descHtml + '</td>' +
        '<td>' + tagsHtml + '</td>' +
      '</tr>';
    }).join('');

    if (countEl) countEl.textContent = results.length + ' öneri';
  }

  renderAgentResults(results, categories, criteria) {
    var tbody = document.getElementById('bulkAITableBody');
    var countEl = document.getElementById('bulkAIResultCount');
    var table = document.getElementById('bulkAITable');
    if (!tbody || !table) return;

    var catMap = {};
    categories.forEach(function(c) { catMap[c.id] = c; });

    // Tablo başlığını ajan moduna göre güncelle
    table.querySelector('thead').innerHTML = '<tr>' +
      '<th><input type="checkbox" id="bulkAISelectAllCheck"></th>' +
      '<th>Link</th>' +
      '<th>Mevcut</th>' +
      '<th>Ajan Önerisi</th>' +
      '<th>Alt Kategori</th>' +
      '<th>Güven</th>' +
      '<th>Açıklama</th>' +
    '</tr>';

    tbody.innerHTML = results.map(function(r, i) {
      var currentCat = catMap[r.currentCategory] || { name: '—', emoji: '' };
      var suggestedCat = catMap[r.categoryId] || { name: r.categoryId, emoji: '' };

      var confidenceColor = r.confidence >= 0.8 ? 'var(--success)' :
                            r.confidence >= 0.5 ? 'var(--warning)' : 'var(--danger)';
      var confidenceText = Math.round(r.confidence * 100) + '%';

      var titleHtml = r.title ? '<div class="text-sm text-accent">' + r.title + '</div>' : '';

      return '<tr class="ai-suggestion-row" data-index="' + i + '">' +
        '<td><input type="checkbox" class="bulk-ai-check" data-index="' + i + '" ' + (r.confidence >= 0.5 ? 'checked' : '') + '></td>' +
        '<td>' +
          '<a href="' + r.url + '" target="_blank" rel="noopener" class="text-sm">' + r.url + '</a>' +
          titleHtml +
        '</td>' +
        '<td>' + currentCat.emoji + ' ' + currentCat.name + '</td>' +
        '<td class="ai-category-change">' +
          '<span class="new-cat">' + suggestedCat.emoji + ' ' + suggestedCat.name + '</span>' +
        '</td>' +
        '<td><span class="tag">' + (r.subcategory || '—') + '</span></td>' +
        '<td style="color:' + confidenceColor + ';font-weight:700;">' + confidenceText + '</td>' +
        '<td>' +
          '<div class="text-xs">' + (r.description || '') + '</div>' +
          (r.reasoning ? '<div class="text-xs text-muted mt-1" style="font-style:italic;">🤔 ' + r.reasoning + '</div>' : '') +
        '</td>' +
      '</tr>';
    }).join('');

    if (countEl) countEl.textContent = results.length + ' araştırma sonucu (' + criteria + ')';
  }

  toggleBulkAISelectAll(checked) {
    var checks = document.querySelectorAll('.bulk-ai-check');
    checks.forEach(function(c) { c.checked = checked; });
    var master = document.getElementById('bulkAISelectAllCheck');
    if (master) master.checked = checked;
  }

  getSelectedBulkAIIndices() {
    var indices = new Set();
    document.querySelectorAll('.bulk-ai-check:checked').forEach(function(c) {
      indices.add(parseInt(c.dataset.index));
    });
    return indices;
  }

  // ==========================================
  // AI CHATBOT UI
  // ==========================================

  addToChatHistory(role, content) {
    this.chatHistory.push({ role: role, content: content, timestamp: Date.now() });
    if (this.chatHistory.length > this.maxChatHistory) {
      this.chatHistory.shift();
    }
  }

  getChatHistory() {
    return this.chatHistory;
  }

  toggleChatPanel(show) {
    var panel = document.getElementById('chatPanel');
    if (!panel) return;
    if (show) {
      panel.classList.remove('hidden');
      var input = document.getElementById('chatInput');
      if (input) setTimeout(function() { input.focus(); }, 100);
    } else {
      panel.classList.add('hidden');
    }
  }

  addChatMessage(sender, text) {
    var body = document.getElementById('chatBody');
    if (!body) return;

    // DB'ye kaydet (arka planda, hata yut)
    if (this.db && typeof this.db.addChatMessage === 'function') {
      this.db.addChatMessage(sender, text).catch(function() {});
    }

    // Sidebar hafıza sayacını güncelle
    var memCount = document.getElementById('countMemorySection');
    if (memCount) {
      var current = parseInt(memCount.textContent) || 0;
      memCount.textContent = current + 1;
    }

    var msg = document.createElement('div');
    msg.className = 'chat-message ' + (sender === 'user' ? 'user' : 'bot');

    // Markdown-style formatting: **bold**, *italic*, `code`
    var formatted = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:rgba(0,0,0,0.2);padding:2px 4px;border-radius:4px;font-size:0.85em;">$1</code>')
      .replace(/\n/g, '<br>');

    msg.innerHTML = '<p>' + formatted + '</p>';
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
  }

  showChatLoading(show) {
    var body = document.getElementById('chatBody');
    if (!body) return;
    var existing = body.querySelector('.chat-loading');
    if (existing) existing.remove();

    if (show) {
      var loader = document.createElement('div');
      loader.className = 'chat-loading';
      loader.textContent = 'Düşünüyor...';
      body.appendChild(loader);
      body.scrollTop = body.scrollHeight;
    }
  }

  // ==========================================
  // DROP ZONE
  // ==========================================

  initDropZone(onFile) {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    ['dragenter', 'dragover'].forEach(event => {
      dropZone.addEventListener(event, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('active');
      });
    });

    ['dragleave', 'drop'].forEach(event => {
      dropZone.addEventListener(event, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('active');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this._handleFile(files[0], onFile);
      }
    });

    dropZone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this._handleFile(e.target.files[0], onFile);
      }
    });
  }

  _handleFile(file, callback) {
    var name = file.name.toLowerCase();
    var isHtml = name.endsWith('.html') || name.endsWith('.htm');
    if (!name.endsWith('.txt') && !isHtml) {
      this.showToast('Lütfen .txt veya .html dosyası seçin', 'error');
      return;
    }

    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;
    dropZone.classList.add('has-file');
    
    const content = dropZone.querySelector('.drop-zone-content');
    if (content) {
      content.innerHTML = `
        <div class="drop-zone-icon">📄</div>
        <p class="drop-zone-text">${escapeHtml(file.name)}</p>
        <p class="drop-zone-hint">${(file.size / 1024).toFixed(1)} KB — Parse ediliyor...</p>
      `;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      callback(e.target.result, file.name);
    };
    reader.onerror = () => {
      this.showToast('Dosya okunamadı', 'error');
    };
    reader.readAsText(file, 'UTF-8');
  }

  setImportMode(mode) {
    this._importMode = mode;
    var dropZoneText = document.getElementById('dropZoneText');
    var dropZoneHint = document.getElementById('dropZoneHint');
    var fileInput = document.getElementById('fileInput');
    if (mode === 'bookmark') {
      if (dropZoneText) dropZoneText.textContent = 'Yer imi HTML dosyasını buraya sürükle-bırak';
      if (dropZoneHint) dropZoneHint.textContent = 'veya tıklayarak dosya seç (.html)';
      if (fileInput) fileInput.accept = '.html,.htm';
    } else {
      if (dropZoneText) dropZoneText.textContent = 'WhatsApp export dosyasını buraya sürükle-bırak';
      if (dropZoneHint) dropZoneHint.textContent = 'veya tıklayarak dosya seç (.txt)';
      if (fileInput) fileInput.accept = '.txt';
    }
  }

  getImportMode() {
    return this._importMode || 'whatsapp';
  }

  resetDropZone() {
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
      dropZone.classList.remove('has-file', 'active');
      var dzContent = dropZone.querySelector('.drop-zone-content');
      if (dzContent) {
        dzContent.innerHTML = `
          <div class="drop-zone-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
          </div>
          <p class="drop-zone-text" id="dropZoneText">WhatsApp export dosyasını buraya sürükle-bırak</p>
          <p class="drop-zone-hint" id="dropZoneHint">veya tıklayarak dosya seç (.txt)</p>
        `;
      }
    }
    
    var importResults = document.getElementById('importResults');
    if (importResults) importResults.classList.add('hidden');
    var tbody = document.getElementById('importTableBody');
    if (tbody) tbody.innerHTML = '';
    var fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
  }

  // ==========================================
  // CONFIRM DIALOG
  // ==========================================

  confirmDialog(message) {
    return this.confirm('Onay', message);
  }

  // ==========================================
  // SIDEBAR TOGGLE
  // ==========================================

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
  }

  updateBottomNavActive(viewName) {
    var nav = document.getElementById('mobileBottomNav');
    if (!nav) return;
    nav.querySelectorAll('.bottom-nav-item').forEach(function(item) {
      item.classList.remove('active');
    });
    var active = nav.querySelector('.bottom-nav-item[data-view="' + viewName + '"]');
    if (active) active.classList.add('active');
  }
}

// Global instance
const ui = new UI();
