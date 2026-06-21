/**
 * Offline capture queue — localStorage based MVP
 */
var LinkSlashOfflineQueue = (function() {
  var STORAGE_KEY = 'linkslash_mobile_queue';
  var RECENT_KEY = 'linkslash_mobile_recent';

  function readQueue() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }

  function writeQueue(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function readRecent() {
    try {
      var raw = localStorage.getItem(RECENT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }

  function writeRecent(items) {
    localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, 20)));
  }

  function uid() {
    return 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  function enqueue(item) {
    var queue = readQueue();
    var entry = {
      id: uid(),
      url: item.url || '',
      rawText: item.rawText || '',
      title: item.title || '',
      sourceType: item.sourceType || 'web',
      sharedFrom: item.sharedFrom || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      syncedAt: null,
      error: ''
    };
    queue.push(entry);
    writeQueue(queue);
    return entry;
  }

  function remove(id) {
    writeQueue(readQueue().filter(function(q) { return q.id !== id; }));
  }

  function markSynced(id) {
    var queue = readQueue();
    var idx = queue.findIndex(function(q) { return q.id === id; });
    if (idx === -1) return;
    queue.splice(idx, 1);
    writeQueue(queue);
  }

  function markError(id, error) {
    var queue = readQueue();
    queue = queue.map(function(q) {
      if (q.id !== id) return q;
      return Object.assign({}, q, { status: 'error', error: error || 'Hata' });
    });
    writeQueue(queue);
  }

  function addRecent(item) {
    var recent = readRecent();
    recent.unshift({
      id: item.id || uid(),
      url: item.url,
      title: item.title,
      sourceType: item.sourceType,
      sharedFrom: item.sharedFrom,
      createdAt: item.createdAt || new Date().toISOString()
    });
    writeRecent(recent);
  }

  function pendingCount() {
    return readQueue().filter(function(q) { return q.status === 'pending' || q.status === 'error'; }).length;
  }

  return {
    readQueue: readQueue,
    enqueue: enqueue,
    remove: remove,
    markSynced: markSynced,
    markError: markError,
    readRecent: readRecent,
    addRecent: addRecent,
    pendingCount: pendingCount
  };
})();

if (typeof window !== 'undefined') window.LinkSlashOfflineQueue = LinkSlashOfflineQueue;
