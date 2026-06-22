"use client";

import { Download, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { LINKSLASH_BRAND } from "@/lib/linkslash/brand";
import { formatDownloadSize } from "@/lib/linkslash/format";

type Props = {
  hasLicense: boolean;
  isAuthenticated: boolean;
  accessCode?: string | null;
  extensionReady: boolean;
  extensionSize?: number;
  className?: string;
};

export function LinkSlashExtensionDownloadCard({
  hasLicense,
  isAuthenticated,
  accessCode,
  extensionReady,
  extensionSize = 0,
  className = "",
}: Props) {
  const { colors, routes } = LINKSLASH_BRAND;
  const checkoutUrl = routes.checkout;
  const gatewayUrl = routes.gateway;
  const downloadApi = "/api/linkslash/download/extension";

  const canDownload = hasLicense && extensionReady;
  const isPending = accessCode === "LISANS_BEKLIYOR";

  function handleDownload() {
    if (!canDownload) return;
    window.location.href = downloadApi;
  }

  if (!extensionReady && hasLicense) {
    return (
      <div
        className={`rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200 ${className}`}
      >
        Extension paketi henüz oluşturulmadı. Admin:{" "}
        <code className="text-amber-100">npm run package:linkslash-extension</code>
      </div>
    );
  }

  if (!hasLicense) {
    return (
      <div className={`rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <Lock size={20} className="mt-0.5 shrink-0 text-violet-300" />
          <div>
            <p className="font-semibold text-white">
              {isAuthenticated ? "Chrome Extension için lisans gerekli" : "Giriş yapın ve lisans alın"}
            </p>
            <p className="mt-1 text-sm text-white/65">
              Extension indirme yalnızca lisanslı kullanıcılar içindir.
            </p>
            {isPending ? (
              <p className="mt-3 text-sm text-amber-400">Ödeme veya onay tamamlandığında indirme açılacak.</p>
            ) : (
              <Link
                href={isAuthenticated ? checkoutUrl : gatewayUrl}
                className="mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-black"
                style={{ backgroundColor: colors.primary }}
              >
                <Sparkles size={14} />
                {isAuthenticated ? "LinkSlash lisansı al" : "Giriş yap / Lisans al"}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className={`mb-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 ${className}`}
      style={{ backgroundColor: colors.primary }}
    >
      <Download size={16} />
      linkslash-extension.zip indir
      {extensionSize > 0 ? ` (${formatDownloadSize(extensionSize)})` : ""}
    </button>
  );
}
