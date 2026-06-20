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

const STORAGE_KEY = "ena_cookie_consent_v1";

function readStored(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<ConsentState>({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  });

  useEffect(() => {
    if (!readStored()) setVisible(true);
  }, []);

  const save = useCallback(async (consent: ConsentState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
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
    <div className="fixed inset-x-0 bottom-0 z-[100] p-4 sm:p-6">
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
  );
}
