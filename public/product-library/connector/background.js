importScripts("config.js", "api.js", "adapters.js");

var ENA_CONNECTOR_STATE_KEY = "enaMarketplaceConnectorState";

async function readState() {
  var stored = await chrome.storage.local.get([ENA_CONNECTOR_STATE_KEY, "enaMarketplaceConnectorLog"]);
  return {
    settings: stored[ENA_CONNECTOR_STATE_KEY] || {
      autoRun: false,
      selectedConnectionId: "",
      lastRunAt: "",
      lastStatus: "idle",
      lastMessage: ""
    },
    logs: Array.isArray(stored.enaMarketplaceConnectorLog) ? stored.enaMarketplaceConnectorLog : []
  };
}

async function writeState(nextSettings) {
  await chrome.storage.local.set({ [ENA_CONNECTOR_STATE_KEY]: nextSettings });
}

async function pushLog(entry) {
  var current = await readState();
  var logs = current.logs.slice(0, 29);
  logs.unshift(Object.assign({ createdAt: new Date().toISOString() }, entry));
  await chrome.storage.local.set({ enaMarketplaceConnectorLog: logs });
}

async function setStatus(partial) {
  var current = await readState();
  var next = Object.assign({}, current.settings, partial);
  await writeState(next);
  return next;
}

async function notify(title, message) {
  try {
    await chrome.notifications.create({
      type: "basic",
      title: title,
      message: message
    });
  } catch (_) {}
}

async function openDealerDashboard() {
  var origin = await EnaConnectorApi.resolveOrigin();
  chrome.tabs.create({ url: origin + "/dealer/product-library", active: true });
}

async function processSingleJob(job) {
  await setStatus({
    lastStatus: "processing",
    lastRunAt: new Date().toISOString(),
    lastMessage: job.connection.platform + " icin job isleniyor"
  });

  try {
    var filePayload = await EnaConnectorApi.fetchJobFile(job.fileUrl);
    var adapterResult = await EnaMarketplaceAdapters.runJob(job, filePayload);
    await EnaConnectorApi.completeJob(job.completeUrl, {
      success: !!adapterResult.ok,
      status: adapterResult.ok ? "COMPLETED" : "FAILED",
      result: adapterResult
    });
    await pushLog({
      level: adapterResult.ok ? "success" : "error",
      message: (job.connection.platform || job.platform) + " / " + (job.recipe && job.recipe.name ? job.recipe.name : "Varsayilan"),
      detail: adapterResult.ok
        ? "Dosya input'a yerlestirildi"
        : (adapterResult.reason || "Job calismadi")
    });
    await setStatus({
      lastStatus: adapterResult.ok ? "success" : "error",
      lastRunAt: new Date().toISOString(),
      lastMessage: adapterResult.ok ? "Job tamamlandi" : (adapterResult.reason || "Job hataya dustu")
    });
    if (!adapterResult.ok) {
      await notify("ENA Connector", "Job tamamlanamadi: " + (adapterResult.reason || "Bilinmeyen hata"));
    }
    return adapterResult;
  } catch (error) {
    var message = error && error.message ? error.message : "Job calistirilamadi";
    try {
      await EnaConnectorApi.completeJob(job.completeUrl, {
        success: false,
        status: "FAILED",
        errorMessage: message,
        result: {}
      });
    } catch (_) {}
    await pushLog({
      level: "error",
      message: (job.connection && job.connection.platform) || job.platform || "Connector",
      detail: message
    });
    await setStatus({
      lastStatus: "error",
      lastRunAt: new Date().toISOString(),
      lastMessage: message
    });
    await notify("ENA Connector", message);
    return { ok: false, reason: message };
  }
}

async function runOnce(trigger) {
  var snapshot = await readState();
  var settings = snapshot.settings;

  if (!settings.selectedConnectionId) {
    await setStatus({
      lastStatus: "idle",
      lastRunAt: new Date().toISOString(),
      lastMessage: "Baglanti secilmedi"
    });
    return { success: false, reason: "NO_CONNECTION" };
  }

  var session;
  try {
    session = await EnaConnectorApi.getSession();
  } catch (error) {
    var errorMessage = error && error.message ? error.message : "ENA oturumu okunamadi";
    await setStatus({
      lastStatus: "error",
      lastRunAt: new Date().toISOString(),
      lastMessage: errorMessage
    });
    await pushLog({ level: "error", message: "Oturum", detail: errorMessage });
    return { success: false, reason: "SESSION_FAILED", message: errorMessage };
  }

  if (!session.authenticated) {
    await setStatus({
      lastStatus: "auth",
      lastRunAt: new Date().toISOString(),
      lastMessage: "ENA oturumu acik degil"
    });
    if (trigger === "manual") {
      var origin = await EnaConnectorApi.resolveOrigin();
      chrome.tabs.create({ url: origin + (session.loginUrl || "/auth/login?redirect=/dealer/product-library"), active: true });
    }
    return { success: false, reason: "AUTH_REQUIRED" };
  }

  if (!session.productLibraryAccess) {
    await setStatus({
      lastStatus: "error",
      lastRunAt: new Date().toISOString(),
      lastMessage: session.code || "Product Library erisimi yok"
    });
    return { success: false, reason: session.code || "NO_ACCESS" };
  }

  var connection = (session.connections || []).find(function(item) {
    return item.id === settings.selectedConnectionId;
  });
  if (!connection) {
    await setStatus({
      lastStatus: "error",
      lastRunAt: new Date().toISOString(),
      lastMessage: "Secili baglanti bulunamadi"
    });
    return { success: false, reason: "CONNECTION_MISSING" };
  }

  var jobs = await EnaConnectorApi.claimJobs(connection.id, 3, "ena-marketplace-connector");
  if (!jobs || !jobs.length) {
    await setStatus({
      lastStatus: "idle",
      lastRunAt: new Date().toISOString(),
      lastMessage: connection.platform + " icin yeni is yok"
    });
    return { success: true, processed: 0 };
  }

  for (var i = 0; i < jobs.length; i++) {
    await processSingleJob(jobs[i]);
  }

  return { success: true, processed: jobs.length };
}

async function ensureAlarm() {
  var snapshot = await readState();
  if (snapshot.settings.autoRun && snapshot.settings.selectedConnectionId) {
    chrome.alarms.create(ENA_CONNECTOR_CONFIG.alarmName, { periodInMinutes: ENA_CONNECTOR_CONFIG.alarmMinutes });
  } else {
    chrome.alarms.clear(ENA_CONNECTOR_CONFIG.alarmName);
  }
}

chrome.runtime.onInstalled.addListener(async function() {
  await ensureAlarm();
});

chrome.runtime.onStartup.addListener(async function() {
  await ensureAlarm();
});

chrome.alarms.onAlarm.addListener(async function(alarm) {
  if (alarm.name !== ENA_CONNECTOR_CONFIG.alarmName) return;
  await runOnce("alarm");
});

chrome.runtime.onMessage.addListener(function(message, _sender, sendResponse) {
  if (message.action === "getState") {
    (async function() {
      try {
        var state = await readState();
        var session = null;
        try {
          session = await EnaConnectorApi.getSession();
        } catch (_) {}
        sendResponse({ success: true, data: { state: state.settings, logs: state.logs, session: session } });
      } catch (error) {
        sendResponse({ success: false, error: error.message || "Durum okunamadi" });
      }
    })();
    return true;
  }

  if (message.action === "saveSettings") {
    (async function() {
      try {
        var state = await readState();
        var next = Object.assign({}, state.settings, message.payload || {});
        await writeState(next);
        await ensureAlarm();
        sendResponse({ success: true, data: next });
      } catch (error) {
        sendResponse({ success: false, error: error.message || "Ayarlar kaydedilemedi" });
      }
    })();
    return true;
  }

  if (message.action === "runNow") {
    (async function() {
      try {
        var result = await runOnce("manual");
        sendResponse({ success: true, data: result });
      } catch (error) {
        sendResponse({ success: false, error: error.message || "Connector calistirilamadi" });
      }
    })();
    return true;
  }

  if (message.action === "openMarketTab") {
    (async function() {
      try {
        var session = await EnaConnectorApi.getSession();
        var state = await readState();
        var connection = (session.connections || []).find(function(item) {
          return item.id === state.settings.selectedConnectionId;
        });
        if (!connection) throw new Error("Secili baglanti bulunamadi");
        var opened = await EnaMarketplaceAdapters.ensureTab({
          platform: connection.platform,
          targetUrl: ""
        });
        sendResponse({ success: true, data: { tabId: opened.tab.id, url: opened.targetUrl } });
      } catch (error) {
        sendResponse({ success: false, error: error.message || "Pazaryeri sekmesi acilamadi" });
      }
    })();
    return true;
  }

  if (message.action === "openDashboard") {
    openDealerDashboard().then(function() {
      sendResponse({ success: true });
    }).catch(function(error) {
      sendResponse({ success: false, error: error.message || "Panel acilamadi" });
    });
    return true;
  }
});
