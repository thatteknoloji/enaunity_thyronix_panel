"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { X, Cookie } from "lucide-react";

type ConsentState = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
};

export const COOKIE_CONSENT_STORAGE_KEY = "ena_cookie_consent_v1";
export const OPEN_COOKIE_PREFERENCES_EVENT = "ena:open-cookie-preferences";

function readStored(): ConsentState | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function openCookiePreferences(showCustomize = true) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(OPEN_COOKIE_PREFERENCES_EVENT, { detail: { showCustomize } }),
  );
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<ConsentState>(() => {
    const stored = typeof window !== "undefined" ? readStored() : null;
    return stored ?? {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    };
  });

  useEffect(() => {
    const stored = readStored();
    const forceOpen =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("cerez");

    if (!stored || forceOpen) setVisible(true);
    if (forceOpen) setShowPrefs(true);

    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ showCustomize?: boolean }>).detail;
      const current = readStored();
      if (current) setPrefs(current);
      setShowPrefs(detail?.showCustomize ?? true);
      setVisible(true);
    };

    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, onOpen);
  }, []);

  const save = useCallback(async (consent: ConsentState) => {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent));
    window.dispatchEvent(new CustomEvent("ena:cookie-consent", { detail: consent }));
    await fetch("/api/public/cookie-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(consent),
    }).catch(() => {});
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[200] p-4 sm:p-6 pointer-events-none">
      <div className="pointer-events-auto">
      <div className="mx-auto max-w-3xl rounded-2xl border border-ena-border bg-ena-card/95 backdrop-blur shadow-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Cookie className="text-ena-primary shrink-0 mt-0.5" size={22} />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-ena-text">Çerez Tercihleri</h3>
            <p className="text-sm text-ena-light mt-1">
              Deneyiminizi iyileştirmek için çerezler kullanıyoruz. Zorunlu çerezler site çalışması için gereklidir.
              {" "}<Link href="/contracts/cerez-politikasi" className="text-ena-primary hover:underline">Çerez Politikası</Link>
            </p>

            {showPrefs && (
              <div className="mt-4 space-y-2 text-sm">
                <label className="flex items-center gap-2 text-ena-light"><input type="checkbox" checked disabled /> Zorunlu (her zaman aktif)</label>
                <label className="flex items-center gap-2 text-ena-text">
                  <input type="checkbox" checked={prefs.analytics} onChange={(e) => setPrefs({ ...prefs, analytics: e.target.checked })} /> Analitik
                </label>
                <label className="flex items-center gap-2 text-ena-text">
                  <input type="checkbox" checked={prefs.marketing} onChange={(e) => setPrefs({ ...prefs, marketing: e.target.checked })} /> Pazarlama
                </label>
                <label className="flex items-center gap-2 text-ena-text">
                  <input type="checkbox" checked={prefs.preferences} onChange={(e) => setPrefs({ ...prefs, preferences: e.target.checked })} /> Tercihler
                </label>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => save({ necessary: true, analytics: true, marketing: true, preferences: true })}>Tümünü Kabul Et</Button>
              <Button size="sm" variant="outline" onClick={() => save({ necessary: true, analytics: false, marketing: false, preferences: false })}>Tümünü Reddet</Button>
              {showPrefs ? (
                <Button size="sm" variant="outline" onClick={() => save(prefs)}>Tercihleri Kaydet</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowPrefs(true)}>Tercihleri Özelleştir</Button>
              )}
            </div>
          </div>
          <button onClick={() => save({ necessary: true, analytics: false, marketing: false, preferences: false })} className="p-1 rounded hover:bg-ena-border/40">
            <X size={16} />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
