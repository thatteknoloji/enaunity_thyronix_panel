function $(id) {
  return document.getElementById(id);
}

function setStatus(element, text, tone) {
  element.textContent = text;
  element.className = "status " + tone;
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("tr-TR");
  } catch (_) {
    return value;
  }
}

function send(action, payload) {
  return new Promise(function(resolve, reject) {
    chrome.runtime.sendMessage({ action: action, payload: payload }, function(response) {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response || !response.success) {
        reject(new Error((response && response.error) || "Islem basarisiz"));
        return;
      }
      resolve(response.data);
    });
  });
}

function connectionLabel(connection) {
  var counts = connection.jobCounts || {};
  return connection.label + " • Bekleyen " + (counts.pending || 0) + " • Islenen " + (counts.processing || 0);
}

async function render() {
  var sessionStatus = $("sessionStatus");
  var sessionMeta = $("sessionMeta");
  var connectionSelect = $("connectionSelect");
  var connectionMeta = $("connectionMeta");
  var autoRunToggle = $("autoRunToggle");
  var lastRunMeta = $("lastRunMeta");
  var logs = $("logs");
  var logHint = $("logHint");

  setStatus(sessionStatus, "Kontrol ediliyor", "warn");
  sessionMeta.textContent = "";

  try {
    var data = await send("getState");
    var state = data.state || {};
    var session = data.session || null;
    var entries = data.logs || [];

    if (!session || !session.authenticated) {
      setStatus(sessionStatus, "Oturum yok", "err");
      sessionMeta.textContent = "ENA panelinde giris yapman gerekiyor.";
    } else if (!session.productLibraryAccess) {
      setStatus(sessionStatus, "Erisim yok", "err");
      sessionMeta.textContent = "Bu connector sadece bayi Product Library erisimi icin calisir.";
    } else {
      setStatus(sessionStatus, "Hazir", "ok");
      sessionMeta.textContent =
        (session.user && session.user.email ? session.user.email : "Bayi") +
        " • " +
        (session.summary ? (session.summary.pendingJobs + " bekleyen job") : "Baglanti hazir");
    }

    var connections = session && Array.isArray(session.connections) ? session.connections : [];
    connectionSelect.innerHTML = '<option value="">Baglanti sec</option>';
    connections.forEach(function(connection) {
      var option = document.createElement("option");
      option.value = connection.id;
      option.textContent = connectionLabel(connection);
      if (connection.id === state.selectedConnectionId) option.selected = true;
      connectionSelect.appendChild(option);
    });

    var selected = connections.find(function(connection) {
      return connection.id === connectionSelect.value;
    });
    connectionMeta.textContent = selected
      ? ((selected.connectionStatus || "CONNECTED") + " • " + (selected.lastError || "Son hata yok"))
      : "Henüz baglanti secilmedi.";

    autoRunToggle.classList.toggle("on", !!state.autoRun);
    lastRunMeta.textContent =
      "Son kosu: " + formatDate(state.lastRunAt) +
      " • Durum: " + (state.lastStatus || "idle") +
      (state.lastMessage ? " • " + state.lastMessage : "");

    if (!entries.length) {
      logs.textContent = "Henüz log yok.";
      logHint.textContent = "";
    } else {
      logs.innerHTML = "";
      entries.forEach(function(entry) {
        var div = document.createElement("div");
        div.className = "log";
        div.innerHTML =
          "<div><strong>" + (entry.message || "Connector") + "</strong></div>" +
          "<div class='muted'>" + (entry.detail || "") + "</div>" +
          "<div class='muted'>" + formatDate(entry.createdAt) + "</div>";
        logs.appendChild(div);
      });
      logHint.textContent = entries.length + " kayit";
    }
  } catch (error) {
    setStatus(sessionStatus, "Hata", "err");
    sessionMeta.textContent = error.message || "Popup durumu okunamadi";
  }
}

async function saveSettings(partial) {
  await send("saveSettings", partial);
  await render();
}

$("refreshBtn").addEventListener("click", render);

$("connectionSelect").addEventListener("change", async function(event) {
  await saveSettings({ selectedConnectionId: event.target.value });
});

$("autoRunToggle").addEventListener("click", async function() {
  try {
    var data = await send("getState");
    await saveSettings({ autoRun: !data.state.autoRun });
  } catch (error) {
    alert(error.message || "Ayar kaydedilemedi");
  }
});

$("runNowBtn").addEventListener("click", async function() {
  var btn = $("runNowBtn");
  btn.disabled = true;
  btn.textContent = "Calisiyor...";
  try {
    await send("runNow");
    await render();
  } catch (error) {
    alert(error.message || "Connector calisamadi");
  } finally {
    btn.disabled = false;
    btn.textContent = "Simdi Calistir";
  }
});

$("openMarketBtn").addEventListener("click", async function() {
  try {
    await send("openMarketTab");
  } catch (error) {
    alert(error.message || "Pazaryeri sekmesi acilamadi");
  }
});

$("openDashboardBtn").addEventListener("click", async function() {
  try {
    await send("openDashboard");
  } catch (error) {
    alert(error.message || "Panel acilamadi");
  }
});

render();
setInterval(render, 15000);
