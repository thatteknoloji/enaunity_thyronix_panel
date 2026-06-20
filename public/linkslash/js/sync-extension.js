/**
 * LinkSlash — Chrome Extension capture senkronizasyonu
 * Extension'dan gelen pending kayıtları IndexedDB'ye aktarır.
 */
async function syncExtensionCaptures(db, ui) {
  try {
    var resp = await fetch('/api/linkslash/capture/pending', { credentials: 'include' });
    if (!resp.ok) return 0;
    var json = await resp.json();
    if (!json.success || !Array.isArray(json.data) || json.data.length === 0) return 0;

    var existing = await db.getAllLinks();
    var existingUrls = {};
    existing.forEach(function(l) { existingUrls[l.url] = true; });

    var toAdd = [];
    var ackIds = [];

    json.data.forEach(function(cap) {
      ackIds.push(cap.id);
      if (existingUrls[cap.url]) return;

      var tags = Array.isArray(cap.tags) ? cap.tags : [];
      var notes = cap.sourceType ? 'Extension · ' + cap.sourceType : 'Extension';
      if (cap.aiSummary) notes += '\n' + cap.aiSummary;

      toAdd.push({
        url: cap.url,
        title: cap.title || (typeof extractDomain === 'function' ? extractDomain(cap.url) : cap.domain),
        description: cap.description || cap.aiSummary || '',
        category: cap.aiCategory || '',
        tags: tags,
        platform: typeof detectPlatform === 'function' ? detectPlatform(cap.url) : 'website',
        notes: notes,
        aiCategorized: !!cap.aiCategory,
        dateAdded: cap.createdAt || new Date().toISOString(),
        thumbnail: cap.image || ''
      });
      existingUrls[cap.url] = true;
    });

    if (toAdd.length > 0) {
      await db.addLinks(toAdd);
    }

    if (ackIds.length > 0) {
      await fetch('/api/linkslash/capture/ack', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ackIds })
      });
    }

    if (toAdd.length > 0 && ui && typeof ui.showToast === 'function') {
      ui.showToast('📥 Extension\'dan ' + toAdd.length + ' link eklendi', 'success', 5000);
    }

    return toAdd.length;
  } catch (err) {
    console.warn('[LinkSlash] Extension sync atlandı:', err);
    return 0;
  }
}

if (typeof window !== 'undefined') {
  window.syncExtensionCaptures = syncExtensionCaptures;
}
