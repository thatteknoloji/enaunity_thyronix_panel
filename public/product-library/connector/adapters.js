var EnaMarketplaceAdapters = (function() {
  var ADAPTERS = {
    TRENDYOL: {
      platform: "TRENDYOL",
      defaultUrl: "https://partner.trendyol.com/products",
      tabPatterns: ["https://partner.trendyol.com/*", "https://*.trendyol.com/*"],
      fileSelectors: [
        'input[type="file"]',
        'input[accept*=".xlsx"]',
        'input[accept*=".xml"]',
        'input[accept*=".csv"]'
      ],
      buttonTexts: ["ice aktar", "dosya yukle", "yukle", "import", "excel", "xml", "csv"]
    },
    HEPSIBURADA: {
      platform: "HEPSIBURADA",
      defaultUrl: "https://merchant.hepsiburada.com/product-management/products",
      tabPatterns: ["https://merchant.hepsiburada.com/*", "https://*.hepsiburada.com/*"],
      fileSelectors: [
        'input[type="file"]',
        'input[accept*=".xlsx"]',
        'input[accept*=".xml"]',
        'input[accept*=".csv"]'
      ],
      buttonTexts: ["ice aktar", "yukle", "dosya", "import", "excel", "xml", "csv"]
    },
    N11: {
      platform: "N11",
      defaultUrl: "https://partner.n11.com.tr/product",
      tabPatterns: ["https://partner.n11.com.tr/*", "https://*.n11.com.tr/*"],
      fileSelectors: [
        'input[type="file"]',
        'input[accept*=".xlsx"]',
        'input[accept*=".xml"]',
        'input[accept*=".csv"]'
      ],
      buttonTexts: ["ice aktar", "urun yukle", "dosya yukle", "yukle", "import", "excel", "xml", "csv"]
    },
    TEMU: {
      platform: "TEMU",
      defaultUrl: "https://seller.temu.com/",
      tabPatterns: ["https://seller.temu.com/*", "https://*.temu.com/*"],
      fileSelectors: [
        'input[type="file"]',
        'input[accept*=".xlsx"]',
        'input[accept*=".xml"]',
        'input[accept*=".csv"]'
      ],
      buttonTexts: ["upload", "import", "excel", "xml", "csv", "file"]
    }
  };

  function normalizeText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[ç]/g, "c")
      .replace(/[ğ]/g, "g")
      .replace(/[ıİ]/g, "i")
      .replace(/[ö]/g, "o")
      .replace(/[ş]/g, "s")
      .replace(/[ü]/g, "u")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getAdapter(platform) {
    return ADAPTERS[String(platform || "").toUpperCase()] || null;
  }

  async function sleep(ms) {
    await new Promise(function(resolve) { setTimeout(resolve, ms); });
  }

  async function waitForTabComplete(tabId, timeoutMs) {
    var startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      var tab = await chrome.tabs.get(tabId);
      if (tab.status === "complete") return tab;
      await sleep(500);
    }
    return chrome.tabs.get(tabId);
  }

  async function findExistingTab(adapter) {
    for (var i = 0; i < adapter.tabPatterns.length; i++) {
      var tabs = await chrome.tabs.query({ url: adapter.tabPatterns[i] });
      if (tabs && tabs.length) {
        return tabs.sort(function(a, b) { return (b.id || 0) - (a.id || 0); })[0];
      }
    }
    return null;
  }

  async function ensureTab(job) {
    var adapter = getAdapter(job.platform);
    if (!adapter) throw new Error("Desteklenmeyen pazaryeri: " + job.platform);

    var targetUrl = job.targetUrl || adapter.defaultUrl;
    var tab = await findExistingTab(adapter);

    if (!tab) {
      tab = await chrome.tabs.create({ url: targetUrl, active: false });
    } else if (!tab.url || tab.url.indexOf(targetUrl) !== 0) {
      tab = await chrome.tabs.update(tab.id, { url: targetUrl, active: false });
    }

    await waitForTabComplete(tab.id, 30000);
    await sleep(1500);
    return { tab: tab, adapter: adapter, targetUrl: targetUrl };
  }

  function decodeBase64(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  async function injectJobFile(tabId, filePayload, adapter, job) {
    var results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: function(payload, fileSelectors, buttonTexts, jobMeta) {
        function normalizeText(text) {
          return String(text || "")
            .toLowerCase()
            .replace(/[ç]/g, "c")
            .replace(/[ğ]/g, "g")
            .replace(/[ıİ]/g, "i")
            .replace(/[ö]/g, "o")
            .replace(/[ş]/g, "s")
            .replace(/[ü]/g, "u")
            .replace(/\s+/g, " ")
            .trim();
        }

        function ensureOverlay(message, tone) {
          var existing = document.getElementById("__ena_marketplace_connector_overlay");
          if (!existing) {
            existing = document.createElement("div");
            existing.id = "__ena_marketplace_connector_overlay";
            existing.style.cssText = [
              "position:fixed",
              "right:16px",
              "bottom:16px",
              "z-index:2147483647",
              "background:#0f172a",
              "color:#fff",
              "padding:12px 14px",
              "border-radius:14px",
              "box-shadow:0 14px 40px rgba(15,23,42,0.3)",
              "font:12px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif",
              "max-width:320px"
            ].join(";");
            document.documentElement.appendChild(existing);
          }
          existing.style.border = tone === "error" ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.12)";
          existing.innerHTML = "<strong>ENA Connector</strong><div style='margin-top:6px'>" + message + "</div>";
        }

        function decodeBase64(base64) {
          var binary = atob(base64);
          var bytes = new Uint8Array(binary.length);
          for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          return bytes;
        }

        function visible(element) {
          if (!element) return false;
          var style = window.getComputedStyle(element);
          if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
          var rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }

        function findInput(selectors) {
          for (var i = 0; i < selectors.length; i++) {
            var matches = Array.from(document.querySelectorAll(selectors[i]));
            for (var j = 0; j < matches.length; j++) {
              if (visible(matches[j])) return matches[j];
            }
          }
          var all = Array.from(document.querySelectorAll('input[type="file"]'));
          for (var k = 0; k < all.length; k++) {
            if (visible(all[k])) return all[k];
          }
          return all[0] || null;
        }

        function findActionButton(texts) {
          var nodes = Array.from(document.querySelectorAll("button, [role='button'], a, label"));
          for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (!visible(node)) continue;
            var text = normalizeText(node.innerText || node.textContent || "");
            if (!text) continue;
            for (var j = 0; j < texts.length; j++) {
              if (text.indexOf(texts[j]) !== -1) return node;
            }
          }
          return null;
        }

        var input = findInput(fileSelectors);
        if (!input) {
          ensureOverlay("Dosya inputu bulunamadi. " + jobMeta.platform + " panelinde import ekrani acik olmali.", "error");
          return { ok: false, reason: "FILE_INPUT_NOT_FOUND", title: document.title, url: location.href };
        }

        var bytes = decodeBase64(payload.base64);
        var file = new File([bytes], payload.fileName, { type: payload.contentType });
        var transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("input", { bubbles: true }));

        var clickedButton = false;
        var button = findActionButton(buttonTexts);
        if (button) {
          button.click();
          clickedButton = true;
        }

        ensureOverlay(
          "Job dosyasi input'a yerlestirildi: <b>" + payload.fileName + "</b><br/>" +
          "Paket: " + (jobMeta.packageName || jobMeta.packageId) + "<br/>" +
          "Reçete: " + (jobMeta.recipeName || "Varsayilan") + "<br/>" +
          (clickedButton ? "Import butonu da tiklandi." : "Import butonu bulunamadi, sayfayi kontrol et."),
          clickedButton ? "ok" : "warn"
        );

        return {
          ok: true,
          clickedButton: clickedButton,
          fileName: payload.fileName,
          title: document.title,
          url: location.href
        };
      },
      args: [
        filePayload,
        adapter.fileSelectors,
        adapter.buttonTexts.map(normalizeText),
        {
          platform: job.platform,
          packageId: job.packageId,
          packageName: job.payload && job.payload.packageName,
          recipeName: job.recipe && job.recipe.name
        }
      ]
    });

    return results && results[0] ? results[0].result : { ok: false, reason: "SCRIPT_RESULT_EMPTY" };
  }

  async function runJob(job, filePayload) {
    var prepared = await ensureTab(job);
    var result = await injectJobFile(prepared.tab.id, filePayload, prepared.adapter, job);
    return Object.assign({
      targetUrl: prepared.targetUrl,
      tabId: prepared.tab.id
    }, result || {});
  }

  return {
    getAdapter: getAdapter,
    ensureTab: ensureTab,
    runJob: runJob,
    decodeBase64: decodeBase64
  };
})();
