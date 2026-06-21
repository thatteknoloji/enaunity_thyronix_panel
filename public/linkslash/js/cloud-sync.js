/**
 * LinkSlash Cloud Sync — local-first + ENAUNITY cloud merge
 */
var LinkSlashCloudSync = (function() {
  var state = {
    active: false,
    licensed: false,
    lastSync: null,
    pending: 0,
    error: null,
    syncing: false
  };

  function normalizeUrl(url) {
    if (!url) return '';
    try {
      var parsed = new URL(url);
      parsed.hash = '';
      parsed.hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
      var path = parsed.pathname.replace(/\/+$/, '') || '/';
      parsed.pathname = path;
      return parsed.toString();
    } catch (_) {
      return String(url).trim().toLowerCase();
    }
  }

  function cloudToLocal(cl) {
    return {
      id: cl.localId || generateId(),
      cloudId: cl.id,
      url: cl.url,
      title: cl.title || cl.domain || cl.url,
      description: cl.description || '',
      notes: cl.notes || '',
      category: cl.categorySlug || '',
      tags: cl.tags || [],
      platform: cl.platform || (typeof detectPlatform === 'function' ? detectPlatform(cl.url) : 'website'),
      thumbnail: cl.imageUrl || '',
      aiSummary: cl.aiSummary || '',
      sourceType: cl.sourceType || 'other',
      isFavorite: !!cl.isFavorite,
      isArchived: !!cl.isArchived,
      aiCategorized: !!cl.categorySlug,
      dateAdded: cl.createdAt || new Date().toISOString(),
      _cloudUpdatedAt: cl.updatedAt,
      _syncPending: false
    };
  }

  function localToPushData(link) {
    return {
      url: link.url,
      title: link.title,
      description: link.description || '',
      notes: link.notes || '',
      categorySlug: link.category || '',
      platform: link.platform || 'website',
      imageUrl: link.thumbnail || '',
      aiSummary: link.aiSummary || '',
      isFavorite: !!link.isFavorite,
      isArchived: !!link.isArchived,
      tags: link.tags || []
    };
  }

  function updateUI() {
    var badge = document.getElementById('cloudSyncBadge');
    var text = document.getElementById('cloudSyncText');
    var statusEl = document.getElementById('cloudSyncStatus');
    var lastEl = document.getElementById('cloudSyncLast');
    var pendingEl = document.getElementById('cloudSyncPending');
    var errEl = document.getElementById('cloudSyncError');

    var label = 'Cloud Sync';
    var detail = '—';

    if (state.syncing) {
      label = 'Senkronize ediliyor…';
      detail = '…';
    } else if (!state.licensed) {
      label = 'Cloud Sync kapalı';
      detail = 'Lisans gerekli';
    } else if (state.error) {
      label = 'Sync hatası';
      detail = state.error;
    } else if (state.active) {
      label = 'Cloud Sync aktif';
      detail = state.lastSync ? new Date(state.lastSync).toLocaleString('tr-TR') : 'Az önce';
    }

    if (text) text.textContent = label;
    if (badge) {
      badge.classList.toggle('sync-error', !!state.error);
      badge.classList.toggle('sync-active', state.active && !state.error);
      badge.classList.toggle('syncing', state.syncing);
    }
    if (statusEl) statusEl.textContent = state.active ? 'Aktif' : (state.licensed ? 'Hazır' : 'Lisans yok');
    if (lastEl) lastEl.textContent = state.lastSync ? new Date(state.lastSync).toLocaleString('tr-TR') : 'Henüz yok';
    if (pendingEl) pendingEl.textContent = String(state.pending);
    if (errEl) errEl.textContent = state.error || '—';
  }

  async function checkSession() {
    var resp = await fetch('/api/linkslash/session', { credentials: 'include' });
    if (!resp.ok) throw new Error('Oturum kontrolü başarısız');
    var json = await resp.json();
    state.licensed = !!(json.authenticated && json.linkslashAccess);
    state.active = state.licensed;
    return json;
  }

  async function mergeBootstrap(db, data) {
    var localLinks = await db.getAllLinks();

    var byCloudId = {};
    var byNormUrl = {};
    localLinks.forEach(function(l) {
      if (l.cloudId) byCloudId[l.cloudId] = l;
      byNormUrl[normalizeUrl(l.url)] = l;
    });

    var merged = 0;
    var toPut = [];

    (data.links || []).forEach(function(cl) {
      var norm = cl.normalizedUrl || normalizeUrl(cl.url);
      var existing = (cl.id && byCloudId[cl.id]) || byNormUrl[norm];
      if (existing) {
        var serverTime = cl.updatedAt ? new Date(cl.updatedAt).getTime() : 0;
        var localTime = existing._cloudUpdatedAt ? new Date(existing._cloudUpdatedAt).getTime() : new Date(existing.dateAdded || 0).getTime();
        if (serverTime >= localTime || !existing.cloudId) {
          toPut.push(Object.assign({}, existing, cloudToLocal(cl), { id: existing.id }));
          merged++;
        }
        return;
      }
      toPut.push(cloudToLocal(cl));
      merged++;
    });

    (data.deletedLinks || []).forEach(function(del) {
      var existing = byCloudId[del.id] || (del.localId && localLinks.find(function(l) { return l.id === del.localId; }));
      if (existing && !existing.isArchived) {
        toPut.push(Object.assign({}, existing, { isArchived: true, _syncPending: false, cloudId: del.id }));
      }
    });

    if (toPut.length > 0) {
      await db.putLinks(toPut);
    }

    if (Array.isArray(data.categories)) {
      for (var i = 0; i < data.categories.length; i++) {
        var cat = data.categories[i];
        try {
          var cats = await db.getCategories();
          var found = cats.find(function(c) { return c.id === cat.slug || c.id === cat.id; });
          if (!found) {
            await db.addCategory({
              id: cat.slug,
              name: cat.name,
              emoji: cat.emoji || '📁',
              color: cat.color || '#6366f1',
              order: cat.sortOrder || 0,
              description: ''
            });
          }
        } catch (_) {}
      }
    }

    return merged;
  }

  async function collectPushChanges(db) {
    var links = await db.getAllLinks();
    var changes = [];
    var pending = 0;

    links.forEach(function(link) {
      if (link._syncPending || !link.cloudId) {
        pending++;
        changes.push({
          op: link.cloudId ? 'update' : 'create',
          entityType: 'link',
          localId: link.id,
          cloudId: link.cloudId || undefined,
          updatedAt: link._localUpdatedAt || link.dateAdded || new Date().toISOString(),
          data: localToPushData(link)
        });
      }
    });

    state.pending = pending;
    return changes;
  }

  async function applyPushResults(db, applied) {
    if (!applied || !applied.length) return;
    var links = await db.getAllLinks();
    var byLocal = {};
    links.forEach(function(l) { byLocal[l.id] = l; });

    var toPut = [];
    applied.forEach(function(item) {
      if (item.entityType !== 'link' || !item.localId) return;
      var local = byLocal[item.localId];
      if (!local) return;
      toPut.push(Object.assign({}, local, {
        cloudId: item.cloudId,
        _syncPending: false,
        _cloudUpdatedAt: new Date().toISOString()
      }));
    });

    if (toPut.length) await db.putLinks(toPut);
  }

  async function runFullSync(db, ui) {
    if (state.syncing) return state;
    state.syncing = true;
    state.error = null;
    updateUI();

    try {
      await checkSession();
      if (!state.licensed) {
        updateUI();
        return state;
      }

      var bootstrapResp = await fetch('/api/linkslash/sync/bootstrap', { credentials: 'include' });
      var bootstrapJson = await bootstrapResp.json();
      if (!bootstrapJson.success) throw new Error(bootstrapJson.error || 'Bootstrap başarısız');

      var merged = await mergeBootstrap(db, bootstrapJson.data);

      var changes = await collectPushChanges(db);
      if (changes.length > 0) {
        var pushResp = await fetch('/api/linkslash/sync/push', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ changes: changes })
        });
        var pushJson = await pushResp.json();
        if (!pushJson.success) throw new Error(pushJson.error || 'Push başarısız');

        if (pushJson.data.errors && pushJson.data.errors.length) {
          console.warn('[LinkSlash CloudSync] Push errors:', pushJson.data.errors);
        }

        await applyPushResults(db, pushJson.data.applied);

        var markItems = (pushJson.data.applied || []).map(function(a) {
          return { entityType: a.entityType, localId: a.localId, cloudId: a.cloudId };
        });
        if (markItems.length) {
          await fetch('/api/linkslash/sync/mark', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: markItems })
          });
        }
      }

      state.lastSync = bootstrapJson.data.serverTime || new Date().toISOString();
      state.pending = 0;
      state.active = true;
      await db.setSetting('linkslash_last_cloud_sync', state.lastSync);

      if (merged > 0 && ui && typeof ui.showToast === 'function') {
        ui.showToast('☁️ Cloud\'dan ' + merged + ' link birleştirildi', 'success', 4000);
      }

      updateUI();
      return state;
    } catch (err) {
      state.error = err.message || 'Sync hatası';
      updateUI();
      console.warn('[LinkSlash CloudSync]', err);
      return state;
    } finally {
      state.syncing = false;
      updateUI();
    }
  }

  async function markLocalPending(db) {
    state.pending = (await collectPushChanges(db)).length;
    updateUI();
  }

  function schedulePush(db, ui) {
    if (!state.licensed) return;
    clearTimeout(schedulePush._timer);
    schedulePush._timer = setTimeout(function() {
      runFullSync(db, ui);
    }, 2500);
  }

  return {
    state: state,
    runFullSync: runFullSync,
    checkSession: checkSession,
    markLocalPending: markLocalPending,
    schedulePush: schedulePush,
    updateUI: updateUI,
    normalizeUrl: normalizeUrl
  };
})();

if (typeof window !== 'undefined') {
  window.LinkSlashCloudSync = LinkSlashCloudSync;
}
