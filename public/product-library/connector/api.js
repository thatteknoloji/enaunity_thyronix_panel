var EnaConnectorApi = (function() {
  var activeOrigin = null;

  function getOrigins() {
    return ENA_CONNECTOR_CONFIG.origins.slice();
  }

  function withOrigin(path) {
    if (/^https?:\/\//i.test(path)) return path;
    return activeOrigin + path;
  }

  function timeoutSignal(ms) {
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      return AbortSignal.timeout(ms);
    }
    return undefined;
  }

  async function resolveOrigin() {
    if (activeOrigin) return activeOrigin;

    var origins = getOrigins();
    try {
      var stored = await chrome.storage.sync.get(["enaConnectorOrigin"]);
      if (stored.enaConnectorOrigin) {
        origins.unshift(stored.enaConnectorOrigin);
      }
    } catch (_) {}

    var uniqueOrigins = Array.from(new Set(origins));
    for (var i = 0; i < uniqueOrigins.length; i++) {
      var origin = uniqueOrigins[i];
      try {
        var resp = await fetch(origin + ENA_CONNECTOR_CONFIG.sessionPath, {
          credentials: "include",
          signal: timeoutSignal(5000)
        });
        if (resp.ok) {
          activeOrigin = origin;
          try {
            await chrome.storage.sync.set({ enaConnectorOrigin: origin });
          } catch (_) {}
          return origin;
        }
      } catch (_) {}
    }

    activeOrigin = ENA_CONNECTOR_CONFIG.preferredOrigin;
    return activeOrigin;
  }

  async function request(path, init, timeoutMs) {
    var origin = await resolveOrigin();
    var response = await fetch(origin + path, Object.assign({
      credentials: "include",
      signal: timeoutSignal(timeoutMs || 15000)
    }, init || {}));
    var data = await response.json().catch(function() { return {}; });
    if (!response.ok || data.success === false) {
      var err = new Error(data.error || ("HTTP " + response.status));
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function getSession() {
    var data = await request(ENA_CONNECTOR_CONFIG.sessionPath, { method: "GET" }, 10000);
    return data;
  }

  async function claimJobs(connectionId, limit, clientName) {
    var data = await request(ENA_CONNECTOR_CONFIG.claimPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        connectionId: connectionId,
        limit: limit || 5,
        clientName: clientName || "ena-marketplace-connector"
      })
    }, 15000);
    return data.data || [];
  }

  async function completeJob(url, payload) {
    var path = /^https?:\/\//i.test(url)
      ? url.replace(await resolveOrigin(), "")
      : url;
    var data = await request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {})
    }, 15000);
    return data.data || data;
  }

  async function fetchJobFile(fileUrl) {
    var origin = await resolveOrigin();
    var response = await fetch(origin + fileUrl, {
      credentials: "include",
      signal: timeoutSignal(30000)
    });
    if (!response.ok) {
      var data = await response.json().catch(function() { return {}; });
      var err = new Error(data.error || "Job dosyasi indirilemedi");
      err.status = response.status;
      throw err;
    }

    var buffer = await response.arrayBuffer();
    var bytes = new Uint8Array(buffer);
    var binary = "";
    for (var i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    var contentDisposition = response.headers.get("content-disposition") || "";
    var filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    return {
      fileName: filenameMatch && filenameMatch[1] ? filenameMatch[1] : "ena-job.dat",
      contentType: response.headers.get("content-type") || "application/octet-stream",
      base64: btoa(binary)
    };
  }

  function clearOriginCache() {
    activeOrigin = null;
  }

  return {
    resolveOrigin: resolveOrigin,
    getSession: getSession,
    claimJobs: claimJobs,
    completeJob: completeJob,
    fetchJobFile: fetchJobFile,
    clearOriginCache: clearOriginCache,
    withOrigin: withOrigin
  };
})();
