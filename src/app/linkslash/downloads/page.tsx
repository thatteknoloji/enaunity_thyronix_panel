import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Chrome,
  Clock,
  Download,
  FileText,
  Smartphone,
  Terminal,
} from "lucide-react";
import { LinkSlashMarketingShell } from "@/components/linkslash/LinkSlashMarketingShell";
import { LinkSlashAndroidDownloadCardServer } from "@/components/linkslash/LinkSlashAndroidDownloadCardServer";
import { getSession } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/admin-access";
import { LINKSLASH_BRAND } from "@/lib/linkslash/brand";
import { getLinkSlashDownloadStatus } from "@/lib/linkslash/download-status";
import { formatDownloadSize } from "@/lib/linkslash/format";

export const metadata: Metadata = {
  title: "LinkSlash İndirme Merkezi | ENAUNITY",
  description: "LinkSlash Chrome Extension, Android APK ve mobil web shell indirme ve kurulum rehberi.",
};

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        ok ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
      }`}
    >
      {ok ? <CheckCircle2 size={12} /> : <Clock size={12} />}
      {label}
    </span>
  );
}

export default async function LinkSlashDownloadsPage() {
  const session = await getSession();
  const isAdmin = session ? isAdminRole(session.role) || session.role === "admin" : false;
  const status = getLinkSlashDownloadStatus(isAdmin);
  const { colors, routes } = LINKSLASH_BRAND;

  const extReady = status.extension.available;
  const apkReady = status.android.available && status.android.buildStatus === "ready";
  const apkPending = status.android.buildStatus === "pending_verification";

  return (
    <LinkSlashMarketingShell active="downloads">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black md:text-4xl">İndirme Merkezi</h1>
          <p className="mt-3 text-white/65">LinkSlash Chrome Extension, Android APK ve mobil web shell</p>
        </div>

        {/* Chrome Extension */}
        <section
          className="mb-6 rounded-2xl border p-6"
          style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15">
                <Chrome size={22} className="text-cyan-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Chrome Extension</h2>
                <p className="text-sm text-white/55">Manifest V3 · ENAUNITY oturum entegrasyonu</p>
              </div>
            </div>
            <StatusBadge ok={extReady || status.extension.buildStatus === "preparing"} label={extReady ? "MVP hazır" : "Paket hazırlanıyor"} />
          </div>

          {extReady ? (
            <a
              href={status.extension.path}
              download
              className="mb-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-black"
              style={{ backgroundColor: colors.primary }}
            >
              <Download size={16} /> linkslash-extension.zip indir ({formatDownloadSize(status.extension.size)})
            </a>
          ) : (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                Paket henüz oluşturulmadı. Admin: <code className="text-amber-100">npm run package:linkslash-extension</code>
              </span>
            </div>
          )}

          <h3 className="mb-2 text-sm font-semibold text-white/80">Kurulum adımları</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-white/65">
            <li>
              <code className="text-cyan-300">chrome://extensions</code> adresini açın
            </li>
            <li>Developer Mode (Geliştirici modu) açın</li>
            <li>&quot;Load unpacked&quot; / Paketlenmemiş öğe yükle</li>
            <li>
              <code className="text-cyan-300">public/linkslash/extension</code> klasörünü seçin — veya zip indirip açın
            </li>
          </ol>
          <p className="mt-4 text-xs text-white/45">
            Production: extension <code>config.js</code> içinde API origin&apos;in doğru olduğundan emin olun (
            <code>preferredOrigin</code>).
          </p>
        </section>

        {/* Android */}
        <section
          className="mb-6 rounded-2xl border p-6"
          style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15">
                <Smartphone size={22} className="text-violet-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Android App</h2>
                <p className="text-sm text-white/55">Capacitor shell · Share intent yakalama</p>
              </div>
            </div>
            <StatusBadge
              ok={apkReady}
              label={apkReady ? "APK hazır" : apkPending ? "Build var, kopyalanmadı" : "APK doğrulaması bekliyor"}
            />
          </div>

          {apkReady ? (
            <LinkSlashAndroidDownloadCardServer variant="compact" className="mb-4" />
          ) : (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                {apkPending
                  ? "Build APK bulundu ancak public/downloads altına kopyalanmadı. npm run verify:linkslash-android çalıştırın."
                  : "APK henüz üretilmedi. Aşağıdaki build komutlarını kullanın."}
              </span>
            </div>
          )}

          <h3 className="mb-2 text-sm font-semibold text-white/80">Build komutları</h3>
          <pre className="overflow-x-auto rounded-lg bg-black/40 p-4 text-xs text-cyan-100/90">
{`cd mobile/linkslash
npm install
npm run android:build
cd android && ./gradlew assembleDebug
npm run verify:linkslash-android`}
          </pre>
        </section>

        {/* Mobile web */}
        <section
          className="mb-6 rounded-2xl border p-6"
          style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
        >
          <h2 className="mb-2 text-xl font-bold">Mobil web shell</h2>
          <p className="mb-4 text-sm text-white/65">
            APK olmadan mobil tarayıcıdan test edilebilir. Paylaşım menüsü entegrasyonu için native APK gerekir.
          </p>
          <Link
            href={routes.mobileWeb}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/5"
          >
            {routes.mobileWeb} aç
          </Link>
        </section>

        {/* Release notes */}
        <section
          className="mb-6 rounded-2xl border p-6"
          style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
        >
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <FileText size={20} /> Release notes
          </h2>
          <div className="flex flex-wrap gap-3">
            {status.releaseDocs.extension ? (
              <Link href={status.releaseDocs.extension} className="text-sm text-cyan-400 hover:underline">
                Extension RELEASE.md
              </Link>
            ) : (
              <span className="text-sm text-white/40">Extension RELEASE.md (henüz yok)</span>
            )}
            <span className="text-white/30">·</span>
            {status.releaseDocs.android ? (
              <Link href={status.releaseDocs.android} className="text-sm text-cyan-400 hover:underline">
                Android RELEASE.md
              </Link>
            ) : (
              <span className="text-sm text-white/40">Android RELEASE.md (henüz yok)</span>
            )}
            <span className="text-white/30">·</span>
            <Link href="/downloads/linkslash/INSTALLATION.md" className="text-sm text-cyan-400 hover:underline">
              Kurulum rehberi
            </Link>
          </div>
        </section>

        {/* Admin panel */}
        {isAdmin && status.admin && (
          <section className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-violet-300">
              <Terminal size={18} /> Admin — dosya durumu
            </h2>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-black/30 p-3">
                <p className="text-white/50">Extension zip</p>
                <p className="font-mono">{extReady ? status.extension.path : "—"}</p>
                <p className="text-white/45">{extReady ? formatDownloadSize(status.extension.size) : "Eksik"}</p>
              </div>
              <div className="rounded-lg bg-black/30 p-3">
                <p className="text-white/50">Android APK</p>
                <p className="font-mono">{apkReady ? status.android.path : "—"}</p>
                <p className="text-white/45">{apkReady ? formatDownloadSize(status.android.size) : status.android.buildStatus}</p>
              </div>
            </div>
            {status.admin.missingFiles.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                <p className="font-semibold">Eksik dosyalar:</p>
                <ul className="mt-1 list-disc pl-5">
                  {status.admin.missingFiles.map((f) => (
                    <li key={f} className="font-mono text-xs">{f}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-4 text-xs text-white/45">Build komutları: {status.admin.buildCommands.join(" → ")}</p>
          </section>
        )}

        <div className="mt-8 text-center">
          <Link href={routes.gateway} className="text-sm text-cyan-400 hover:underline">
            LinkSlash web uygulamasını başlat →
          </Link>
        </div>
      </div>
    </LinkSlashMarketingShell>
  );
}
