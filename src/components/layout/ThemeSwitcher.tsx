"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";

type Props = {
  /** Render theme list inside mobile drawer (stacked buttons) */
  variant?: "popover" | "drawer";
  onSelect?: () => void;
};

export default function ThemeSwitcher({ variant = "popover", onSelect }: Props) {
  const { theme, setTheme, themes, labels, icons } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || variant !== "popover" || !buttonRef.current) return;
    const update = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, variant]);

  const pick = (id: (typeof themes)[number]) => {
    setTheme(id);
    setOpen(false);
    onSelect?.();
  };

  if (variant === "drawer") {
    return (
      <div className="space-y-1">
        {themes.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => pick(t)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              theme === t
                ? "bg-ena-card text-ena-primary font-semibold"
                : "text-ena-light hover:bg-ena-card hover:text-ena-text"
            }`}
          >
            <span>{icons[t]}</span>
            <span className="flex-1 text-left">{labels[t]}</span>
            {theme === t && <Check size={14} className="text-ena-primary" />}
          </button>
        ))}
      </div>
    );
  }

  const menu = open && mounted ? (
    <>
      <div
        className="fixed inset-0 z-[200]"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        className="fixed z-[210] w-56 max-h-[min(20rem,calc(100vh-6rem))] overflow-y-auto rounded-lg border border-ena-border bg-ena-dark py-1 shadow-xl"
        style={{ top: menuPos.top, right: menuPos.right }}
        role="menu"
      >
        {themes.map((t) => (
          <button
            key={t}
            type="button"
            role="menuitem"
            onClick={() => pick(t)}
            className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
              theme === t
                ? "text-ena-primary font-semibold"
                : "text-ena-light hover:bg-ena-card/50 hover:text-ena-text"
            }`}
          >
            <span>{icons[t]}</span>
            <span>{labels[t]}</span>
            {theme === t && <span className="ml-auto text-[10px] text-ena-primary">●</span>}
          </button>
        ))}
      </div>
    </>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full p-2 text-ena-light hover:bg-ena-card/50 hover:text-ena-text transition-colors"
        title="Tema Değiştir"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Palette size={18} />
      </button>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </>
  );
}
