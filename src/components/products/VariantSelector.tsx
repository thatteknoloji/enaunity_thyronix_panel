"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Drawer } from "@/components/ui/drawer";
import type { VariantDisplayMode } from "@/lib/products/variant-display";

interface VariantSelectorProps {
  variantGroups: Record<string, string[]>;
  selectedOptions: Record<string, string>;
  onSelect: (group: string, value: string) => void;
  mode?: VariantDisplayMode | string;
}

function optionClass(active: boolean, surface: "dark" | "light", compact?: boolean) {
  const pad = compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm";
  if (surface === "light") {
    return `${pad} rounded-lg font-medium transition-colors border text-left ${
      active
        ? "bg-ena-primary text-white border-ena-primary"
        : "text-gray-900 bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
    }`;
  }
  return `${pad} rounded-lg font-medium transition-colors border text-left ${
    active
      ? "bg-ena-primary text-white border-ena-primary"
      : "text-ena-text bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40"
  }`;
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

export function VariantSelector({
  variantGroups,
  selectedOptions,
  onSelect,
  mode = "buttons",
}: VariantSelectorProps) {
  const [modalGroup, setModalGroup] = useState<string | null>(null);
  const [popupGroup, setPopupGroup] = useState<string | null>(null);
  const [drawerGroup, setDrawerGroup] = useState<string | null>(null);

  const groups = Object.entries(variantGroups);
  if (groups.length === 0) return null;

  const normalizedMode = ["select", "modal", "popup", "drawer", "grid"].includes(mode)
    ? mode
    : "buttons";

  useBodyScrollLock(Boolean(modalGroup || popupGroup || drawerGroup));

  const renderOptions = (
    group: string,
    values: string[],
    surface: "dark" | "light",
    onPick: (value: string) => void,
    layout: "wrap" | "stack" | "grid" = "wrap"
  ) => {
    const compact = values.length > 8;
    const gridClass = compact ? "grid grid-cols-2 sm:grid-cols-3 gap-2" : "flex flex-col gap-2";

    if (layout === "wrap") {
      return (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onPick(v)}
              className={optionClass(selectedOptions[group] === v, surface, compact)}
            >
              {v}
            </button>
          ))}
        </div>
      );
    }

    return (
      <div className={layout === "grid" || compact ? gridClass : "flex flex-col gap-2"}>
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onPick(v)}
            className={optionClass(selectedOptions[group] === v, surface, compact)}
          >
            {v}
          </button>
        ))}
      </div>
    );
  };

  const triggerClass =
    "w-full flex items-center justify-between rounded-lg border border-ena-border bg-ena-dark/50 px-3 py-2.5 text-sm text-ena-text hover:border-ena-primary/50 transition-colors";

  return (
    <div className="space-y-3 mb-3 pb-3 border-b border-ena-border">
      {groups.map(([group, values]) => (
        <div key={group}>
          <p className="text-xs text-ena-light mb-1.5">{group}</p>

          {normalizedMode === "select" && (
            <select
              value={selectedOptions[group] || ""}
              onChange={(e) => onSelect(group, e.target.value)}
              className="w-full rounded-lg border border-ena-border bg-ena-dark/50 px-3 py-2 text-sm text-ena-text focus:outline-none focus:border-ena-primary"
            >
              <option value="">Seçiniz...</option>
              {values.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          )}

          {normalizedMode === "modal" && (
            <>
              <button type="button" onClick={() => setModalGroup(group)} className={triggerClass}>
                <span className="truncate">{selectedOptions[group] || "Seçiniz..."}</span>
                <span className="shrink-0 text-ena-light text-xs ml-2">Seç</span>
              </button>
              <Modal
                open={modalGroup === group}
                onClose={() => setModalGroup(null)}
                title={group}
                size="md"
              >
                {renderOptions(
                  group,
                  values,
                  "light",
                  (v) => {
                    onSelect(group, v);
                    setModalGroup(null);
                  },
                  values.length > 8 ? "grid" : "stack"
                )}
              </Modal>
            </>
          )}

          {normalizedMode === "popup" && (
            <>
              <button
                type="button"
                onClick={() => setPopupGroup(popupGroup === group ? null : group)}
                className={triggerClass}
              >
                <span className="truncate">{selectedOptions[group] || "Seçiniz..."}</span>
                <span className="shrink-0 text-ena-light text-xs ml-2">
                  {popupGroup === group ? "▲" : "▼"}
                </span>
              </button>
              {popupGroup === group && (
                <>
                  <div
                    className="fixed inset-0 z-[115] bg-black/50"
                    onClick={() => setPopupGroup(null)}
                    aria-hidden
                  />
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={group}
                    className="fixed inset-x-0 bottom-0 z-[116] flex max-h-[min(85dvh,640px)] flex-col rounded-t-2xl border border-ena-border border-b-0 bg-ena-card shadow-2xl"
                  >
                    <div className="flex shrink-0 items-center justify-between border-b border-ena-border px-4 py-3">
                      <p className="truncate text-sm font-semibold text-ena-text">{group}</p>
                      <button
                        type="button"
                        onClick={() => setPopupGroup(null)}
                        className="shrink-0 rounded-lg px-2 py-1 text-xs text-ena-light hover:bg-white/5"
                      >
                        Kapat
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                      {renderOptions(
                        group,
                        values,
                        "dark",
                        (v) => {
                          onSelect(group, v);
                          setPopupGroup(null);
                        },
                        values.length > 8 ? "grid" : "stack"
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {normalizedMode === "drawer" && (
            <>
              <button type="button" onClick={() => setDrawerGroup(group)} className={triggerClass}>
                <span className="truncate">{selectedOptions[group] || "Seçiniz..."}</span>
                <span className="shrink-0 text-ena-light text-xs ml-2">Aç</span>
              </button>
              <Drawer
                open={drawerGroup === group}
                onClose={() => setDrawerGroup(null)}
                title={group}
                size="md"
                className="bg-ena-dark border-ena-border"
              >
                {renderOptions(
                  group,
                  values,
                  "dark",
                  (v) => {
                    onSelect(group, v);
                    setDrawerGroup(null);
                  },
                  values.length > 8 ? "grid" : "stack"
                )}
              </Drawer>
            </>
          )}

          {normalizedMode === "grid" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[min(40vh,320px)] overflow-y-auto overscroll-contain pr-1">
              {values.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onSelect(group, v)}
                  className={optionClass(selectedOptions[group] === v, "dark", values.length > 8)}
                >
                  {v}
                </button>
              ))}
            </div>
          )}

          {normalizedMode === "buttons" &&
            (values.length > 8 ? (
              <div className="max-h-[min(40vh,320px)] overflow-y-auto overscroll-contain pr-1">
                {renderOptions(group, values, "dark", (v) => onSelect(group, v), "grid")}
              </div>
            ) : (
              renderOptions(group, values, "dark", (v) => onSelect(group, v))
            ))}
        </div>
      ))}
    </div>
  );
}
