"use client";

import { MEDIA_SPECS, formatSpecLine, BANNER_DISPLAY_MODES } from "@/lib/homepage/media-specs";
import { Info } from "lucide-react";

export function MediaSpecGuide({ variant = "banner" }: { variant?: "banner" | "hero" }) {
  if (variant === "hero") {
    const h = MEDIA_SPECS.hero;
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-950 space-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <Info size={16} /> Hero video & poster — performans rehberi
        </div>
        <ul className="space-y-1 text-xs leading-relaxed list-disc pl-4">
          <li><strong>Masaüstü video:</strong> {formatSpecLine(h.videoDesktop)}</li>
          <li><strong>Mobil video:</strong> {formatSpecLine(h.videoMobile)}</li>
          <li><strong>Poster (yüklenene kadar):</strong> {formatSpecLine(h.poster)}</li>
          <li>H.264 codec, ses kapalı, loop için kısa kesit tercih edin.</li>
          <li>Mobilde ayrı (düşük çözünürlüklü) video kullanmak LCP ve veri tasarrufu sağlar.</li>
        </ul>
      </div>
    );
  }

  const b = MEDIA_SPECS.banner;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 space-y-3">
      <div className="flex items-center gap-2 font-semibold">
        <Info size={16} /> Banner görsel boyutları (site hızı için)
      </div>
      <div className="grid sm:grid-cols-3 gap-3 text-xs">
        <div className="rounded-lg bg-white/70 p-3 border border-amber-100">
          <p className="font-semibold mb-1">Masaüstü</p>
          <p>{formatSpecLine(b.desktop)}</p>
        </div>
        <div className="rounded-lg bg-white/70 p-3 border border-amber-100">
          <p className="font-semibold mb-1">Tablet</p>
          <p>{formatSpecLine(b.tablet)}</p>
        </div>
        <div className="rounded-lg bg-white/70 p-3 border border-amber-100">
          <p className="font-semibold mb-1">Mobil</p>
          <p>{formatSpecLine(b.mobile)}</p>
        </div>
      </div>
      <ul className="text-xs space-y-1 list-disc pl-4">
        <li>Format: <strong>WebP</strong> tercih edin (JPEG yedek). PNG yalnızca şeffaflık gerekiyorsa.</li>
        <li>Her cihaz için ayrı görsel yükleyin; boş bırakırsanız masaüstü kullanılır (mobilde yavaşlatır).</li>
        <li>Bir konuma <strong>birden fazla banner</strong> ekleyip görünümü carousel / grid / şerit yapabilirsiniz.</li>
      </ul>
      <div className="text-xs pt-1 border-t border-amber-200">
        <strong>Görünüm modları:</strong>
        <ul className="mt-1 space-y-0.5">
          {BANNER_DISPLAY_MODES.map((m) => (
            <li key={m.value}><strong>{m.label}:</strong> {m.desc}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
