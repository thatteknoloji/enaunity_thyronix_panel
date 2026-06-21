"use client";

import { Download, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { LINKSLASH_BRAND } from "@/lib/linkslash/brand";
import { formatDownloadSize } from "@/lib/linkslash/format";

type Props = {
  hasLicense: boolean;
  isAuthenticated: boolean;
  accessCode?: string | null;
  apkReady: boolean;
  apkSize?: number;
  variant?: "hero" | "compact";
  className?: string;
};

export function LinkSlashAndroidDownloadCard({
  hasLicense,
  isAuthenticated,
  accessCode,
  apkReady,
  apkSize = 0,
  variant = "hero",
  className = "",
}: Props) {
  const { colors, routes } = LINKSLASH_BRAND;
  const checkoutUrl = routes.checkout;
  const gatewayUrl = routes.gateway;
  const downloadUrl = routes.androidApk;

  const canDownload = hasLicense && apkReady;
  const showLicenseCta = !hasLicense;
  const isPending = accessCode === "LISANS_BEKLIYOR";

  function handleDownload() {
    if (!canDownload) return;
    window.location.href = downloadUrl;
  }

  const padding = variant === "hero" ? "p-8 md:p-10" : "p-6";
  const titleSize = variant === "hero" ? "text-2xl md:text-3xl" : "text-xl";

  if (!apkReady && hasLicense) {
    return (
      <div
        className={`rounded-2xl border ${padding} text-center ${className}`}
        style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
      >
        <img src="/linkslash/icon192.png" alt="LinkSlash" className="mx-auto mb-4 h-16 w-16 rounded-2xl" />
        <h3 className={`font-bold ${titleSize}`}>Android Uygulaması</h3>
        <p className="mt-2 text-sm text-white/60">APK hazırlanıyor — kısa süre içinde indirilebilir olacak.</p>
      </div>
    );
  }

  if (showLicenseCta) {
    return (
      <div
        className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 ${padding} ${className}`}
        style={{
          backgroundColor: colors.cardBg,
          borderColor: `${colors.accent}44`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{ background: `radial-gradient(circle at top right, ${colors.accent}33, transparent 60%)` }}
        />
        <div className="relative flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15 ring-1 ring-violet-400/30">
            <Lock size={28} className="text-violet-300" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">LinkSlash Android</p>
          <h3 className={`mt-2 font-black ${titleSize}`}>
            {isAuthenticated ? "Lisans gerekli" : "Giriş yapın ve indirin"}
          </h3>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65">
            Telefondan paylaş menüsüne LinkSlash&apos;ı ekleyin. APK indirme yalnızca lisanslı kullanıcılar içindir.
          </p>
          {isPending ? (
            <p className="mt-4 text-sm text-amber-400">Ödeme veya onay tamamlandığında indirme açılacak.</p>
          ) : (
            <Link
              href={isAuthenticated ? checkoutUrl : gatewayUrl}
              className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: colors.primary }}
            >
              <Sparkles size={16} />
              {isAuthenticated ? "LinkSlash lisansı al — Satın al ve indir" : "Giriş yap / Lisans al"}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className={`group w-full overflow-hidden rounded-2xl border text-left transition-all duration-200 hover:scale-[1.01] hover:border-cyan-400/50 active:scale-[0.99] ${padding} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${colors.primary}18, ${colors.accent}12)`,
        borderColor: `${colors.primary}44`,
      }}
    >
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left sm:gap-6">
        <div className="mb-4 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 ring-2 ring-cyan-400/30 transition-transform group-hover:scale-105 sm:mb-0">
          <img src="/linkslash/icon192.png" alt="LinkSlash" className="h-14 w-14 rounded-xl" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Android APK</p>
          <h3 className={`mt-1 font-black ${titleSize}`}>Android Uygulamasını İndir</h3>
          <p className="mt-2 text-sm text-white/70">Telefondan paylaş menüsüne LinkSlash&apos;ı ekleyin</p>
          <p className="mt-1 text-xs text-white/45">APK indir — lisanslı kullanıcılar için</p>
          {apkSize > 0 && (
            <p className="mt-2 text-xs font-mono text-cyan-300/80">{formatDownloadSize(apkSize)}</p>
          )}
        </div>
        <div className="mt-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-black transition-transform group-hover:translate-x-0.5 sm:mt-0">
          <Download size={22} />
        </div>
      </div>
    </button>
  );
}
