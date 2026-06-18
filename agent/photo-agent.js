/**
 * NEXA Photo Agent v1.0
 * 
 * PC'nizdeki bir klasörü izler, barkod isimli fotoğrafları 
 * otomatik eşleştirir ve NEXA sunucusuna yükler.
 * 
 * KULLANIM:
 *   1. npm install chokidar dotenv form-data node-fetch  
 *      (veya tek tek: npm install chokidar)
 *   2. nexa-config.txt dosyası oluştur (aşağıdaki formatta)
 *   3. node photo-agent.js
 * 
 * nexa-config.txt formatı (her satır bir ayar):
 *   NEXA_URL=https://your-server.com
 *   NEXA_TOKEN=your.jwt.token.here
 *   WATCH_FOLDER=C:/NexaPhotos
 * 
 * NOT: Bu betiğin çalıştığı PC 7/24 açık kalmalıdır.
 *      PC kapandığında fotoğraf güncellemeleri durur.
 */

const chokidar = require("chokidar");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ─── KONFIGÜRASYON YÜKLE ─────────────────────────────
const config = { nexaUrl: "", nexaToken: "", watchFolder: "C:/NexaPhotos" };

try {
  const cfgPath = path.join(__dirname, "nexa-config.txt");
  if (fs.existsSync(cfgPath)) {
    const lines = fs.readFileSync(cfgPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const [key, ...vals] = line.split("=");
      if (key && vals.length) {
        const k = key.trim().toLowerCase();
        const v = vals.join("=").trim();
        if (k === "nexa_url") config.nexaUrl = v;
        else if (k === "nexa_token") config.nexaToken = v;
        else if (k === "watch_folder") config.watchFolder = v;
      }
    }
  }
} catch {}

// Override from env vars
if (process.env.NEXA_URL) config.nexaUrl = process.env.NEXA_URL;
if (process.env.NEXA_TOKEN) config.nexaToken = process.env.NEXA_TOKEN;
if (process.env.WATCH_FOLDER) config.watchFolder = process.env.WATCH_FOLDER;

const EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"];
const DEBOUNCE_MS = 2000;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const STATE_FILE = path.join(__dirname, ".photo-agent-state.json");

// ─── STATE ────────────────────────────────────────────
let state = { processed: {} };
try { if (fs.existsSync(STATE_FILE)) state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch {}
function saveState() { try { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); } catch {} }

// ─── LOG ──────────────────────────────────────────────
function log(msg, type) {
  const icons = { info: "[INFO]", ok: "[OK]  ", err: "[ERR] " };
  const ts = new Date().toLocaleTimeString("tr-TR");
  console.log(ts + " " + (icons[type] || "[INFO]") + " " + msg);
}

// ─── HASH ─────────────────────────────────────────────
function fileHash(filePath) {
  return crypto.createHash("md5").update(fs.readFileSync(filePath)).digest("hex");
}

// ─── BARCODE ──────────────────────────────────────────
function extractBarcode(fileName) {
  var name = path.parse(fileName).name;
  if (/^\d{8,14}$/.test(name)) return name;
  if (/^[A-Za-z0-9_-]{4,50}$/.test(name)) return name;
  return null;
}

// ─── UPLOAD ───────────────────────────────────────────
async function uploadPhoto(filePath, barcode) {
  var fileName = path.basename(filePath);
  var fileBuffer = fs.readFileSync(filePath);

  try {
    var FormData = require("form-data");
    var fetch = require("node-fetch");
    var form = new FormData();
    form.append("file", fileBuffer, { filename: fileName, contentType: "image/jpeg" });
    form.append("barcode", barcode);

    var res = await fetch(config.nexaUrl + "/api/nexa/photos/upload", {
      method: "POST",
      headers: Object.assign({}, form.getHeaders(), { Authorization: "Bearer " + config.nexaToken }),
      body: form,
    });

    var text = await res.text();
    if (res.ok) {
      var data = JSON.parse(text);
      return { success: true, matched: data.data ? data.data.matched : 0 };
    }
    return { success: false, error: "HTTP " + res.status + ": " + text.substring(0, 100) };
  } catch (e) {
    // Fallback: try with built-in fetch (Node 18+)
    try {
      var fd = new FormData();
      var blob = new Blob([fileBuffer], { type: "image/jpeg" });
      // Node 18+ has global fetch but FormData API differs
      // Attempt simple curl fallback
      var cp = require("child_process");
      var tmpFile = path.join(require("os").tmpdir(), "nexa-" + Date.now() + ".jpg");
      fs.writeFileSync(tmpFile, fileBuffer);
      
      return new Promise(function(resolve) {
        cp.exec(
          'curl -s -X POST "' + config.nexaUrl + '/api/nexa/photos/upload" ' +
          '-H "Authorization: Bearer ' + config.nexaToken + '" ' +
          '-F "file=@' + tmpFile + '" ' +
          '-F "barcode=' + barcode + '"',
          { timeout: 30000 },
          function(err, stdout) {
            try { fs.unlinkSync(tmpFile); } catch {}
            if (err) return resolve({ success: false, error: err.message });
            try {
              var d = JSON.parse(stdout);
              resolve({ success: true, matched: d.data ? d.data.matched : 0 });
            } catch {
              resolve({ success: false, error: stdout.substring(0, 100) });
            }
          }
        );
      });
    } catch (e2) {
      return { success: false, error: e2.message };
    }
  }
}

// ─── PROCESS ──────────────────────────────────────────
var pending = {};

async function processFile(filePath) {
  var fileName = path.basename(filePath);
  var ext = path.extname(filePath).toLowerCase();

  if (EXTENSIONS.indexOf(ext) === -1) return;

  try {
    var stat = fs.statSync(filePath);
    if (stat.size > MAX_FILE_SIZE) {
      log(fileName + " çok büyük (" + (stat.size / 1024 / 1024).toFixed(1) + "MB), atlanıyor", "err");
      return;
    }
  } catch { return; }

  var hash = fileHash(filePath);
  var prev = state.processed[fileName];
  if (prev && prev.hash === hash) return;

  var barcode = extractBarcode(fileName);
  if (!barcode) {
    log(fileName + " - barkod bulunamadı", "err");
    return;
  }

  log(fileName + " → " + barcode + " yükleniyor...");
  var result = await uploadPhoto(filePath, barcode);

  if (result.success) {
    log(fileName + " yüklendi (" + result.matched + " ürün)", "ok");
    state.processed[fileName] = { hash: hash, barcode: barcode, uploadedAt: new Date().toISOString() };
    saveState();
  } else {
    log(fileName + " hata: " + result.error, "err");
  }
}

// ─── WATCH ────────────────────────────────────────────
function startWatcher() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║     NEXA Photo Agent v1.0           ║");
  console.log("║     Fotoğraf → Barkod Eşleştirme    ║");
  console.log("╚══════════════════════════════════════╝");
  console.log("");
  console.log("📁 Klasör: " + config.watchFolder);
  console.log("🌐 Sunucu: " + config.nexaUrl);
  console.log("");

  if (!fs.existsSync(config.watchFolder)) {
    log("Klasör bulunamadı: " + config.watchFolder, "err");
    log("Lütfen klasörü oluşturun veya WATCH_FOLDER'ı ayarlayın", "err");
    process.exit(1);
  }

  if (!config.nexaUrl || !config.nexaToken) {
    log("NEXA_URL veya NEXA_TOKEN eksik! nexa-config.txt'yi kontrol edin.", "err");
    process.exit(1);
  }

  var watcher = chokidar.watch(config.watchFolder, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: DEBOUNCE_MS, pollInterval: 500 },
  });

  watcher
    .on("add", function(filePath) { processFile(filePath); })
    .on("change", function(filePath) { processFile(filePath); })
    .on("unlink", function(filePath) {
      var fileName = path.basename(filePath);
      delete state.processed[fileName];
      saveState();
      log(fileName + " silindi", "info");
    })
    .on("error", function(error) { log("Watcher: " + error.message, "err"); })
    .on("ready", function() {
      log("İzleme başladı. Dosya bekleniyor...", "ok");
      state.lastRun = new Date().toISOString();
      saveState();
    });
}

// ─── MAIN ─────────────────────────────────────────────
startWatcher();
