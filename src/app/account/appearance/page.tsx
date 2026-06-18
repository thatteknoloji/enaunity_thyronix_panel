"use client";

import { useTheme } from "@/lib/theme-provider";
import { THEME_META, ACCENT_META, type ThemeId, type AccentId } from "@/lib/theme/tokens";
import { AccCard, AccPageTitle, AccSkeleton } from "@/components/account/AccountShell";
import { Check, Palette, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export default function AppearancePage() {
  const {
    theme,
    accent,
    compactMode,
    reducedMotion,
    setTheme,
    setAccent,
    setCompactMode,
    setReducedMotion,
    themes,
    accents,
    ready,
  } = useTheme();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    toast.success("Görünüm tercihleri kaydedildi");
    setSaving(false);
  };

  if (!ready) {
    return <AccSkeleton rows={4} />;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <AccPageTitle
        title="Görünüm"
        description="Tema, accent rengi ve görünüm tercihlerinizi özelleştirin. Tercihler hesabınıza kaydedilir."
      />

      <AccCard>
        <div className="flex items-center gap-2 mb-4">
          <Palette size={18} className="text-ena-primary" />
          <h3 className="text-sm font-semibold text-ena-text">Tema</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {themes.map((t) => {
            const meta = THEME_META[t];
            const active = theme === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t as ThemeId)}
                className={`text-left rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 ${
                  active
                    ? "border-ena-primary bg-ena-primary/10 shadow-md"
                    : "border-ena-border bg-ena-dark/20 hover:border-ena-primary/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">{meta.icon}</span>
                  {active && <Check size={16} className="text-ena-primary" />}
                </div>
                <p className="font-semibold text-ena-text text-sm">{meta.label}</p>
                <p className="text-xs text-ena-light mt-0.5">{meta.description}</p>
              </button>
            );
          })}
        </div>
      </AccCard>

      <AccCard>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-ena-primary" />
          <h3 className="text-sm font-semibold text-ena-text">Accent Rengi</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {accents.map((a) => {
            const meta = ACCENT_META[a];
            const active = accent === a;
            return (
              <button
                key={a}
                type="button"
                onClick={() => setAccent(a as AccentId)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                  active ? "border-ena-primary bg-ena-primary/10" : "border-ena-border hover:border-ena-primary/40"
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-ena-border"
                  style={{ backgroundColor: meta.swatch }}
                />
                <span className="text-sm font-medium text-ena-text">{meta.label}</span>
                {active && <Check size={14} className="text-ena-primary" />}
              </button>
            );
          })}
        </div>
      </AccCard>

      <AccCard>
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-ena-primary" />
          <h3 className="text-sm font-semibold text-ena-text">Tercihler</h3>
        </div>
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-ena-text">Kompakt görünüm</p>
              <p className="text-xs text-ena-light">Daha sıkı kart aralıkları</p>
            </div>
            <input
              type="checkbox"
              checked={compactMode}
              onChange={(e) => setCompactMode(e.target.checked)}
              className="h-4 w-4 rounded border-ena-border accent-ena-primary"
            />
          </label>
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-ena-text">Azaltılmış animasyon</p>
              <p className="text-xs text-ena-light">Hareket efektlerini minimize eder</p>
            </div>
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
              className="h-4 w-4 rounded border-ena-border accent-ena-primary"
            />
          </label>
        </div>
      </AccCard>

      <div className="acc-card p-4 border-dashed">
        <p className="text-xs text-ena-light">
          Önizleme: <span className="text-ena-primary font-medium">{THEME_META[theme].label}</span>
          {" · "}
          Accent: <span className="text-ena-primary font-medium">{ACCENT_META[accent].label}</span>
        </p>
      </div>
    </div>
  );
}
