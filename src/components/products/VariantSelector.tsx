"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Drawer } from "@/components/ui/drawer";
import type { VariantDisplayMode } from "@/lib/products/variant-display";

interface VariantSelectorProps {
  variantGroups: Record<string, string[]>;
  selectedOptions: Record<string, string>;
  onSelect: (group: string, value: string) => void;
  mode?: VariantDisplayMode | string;
}

function optionClass(active: boolean, surface: "dark" | "light") {
  if (surface === "light") {
    return `px-3 py-2 rounded-lg text-sm font-medium transition-colors border text-left ${
      active
        ? "bg-ena-primary text-white border-ena-primary"
        : "text-gray-900 bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
    }`;
  }
  return `px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
    active
      ? "bg-ena-primary text-white border-ena-primary"
      : "text-ena-text bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40"
  }`;
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

  const renderOptions = (
    group: string,
    values: string[],
    surface: "dark" | "light",
    onPick: (value: string) => void,
    layout: "wrap" | "stack" = "wrap"
  ) => (
    <div className={layout === "stack" ? "flex flex-col gap-2" : "flex flex-wrap gap-2"}>
      {values.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onPick(v)}
          className={`${optionClass(selectedOptions[group] === v, surface)} ${
            layout === "stack" ? "w-full" : ""
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );

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
                <span>{selectedOptions[group] || "Seçiniz..."}</span>
                <span className="text-ena-light text-xs">Seç</span>
              </button>
              <Modal
                open={modalGroup === group}
                onClose={() => setModalGroup(null)}
                title={group}
                size="md"
              >
                {renderOptions(group, values, "light", (v) => {
                  onSelect(group, v);
                  setModalGroup(null);
                }, "stack")}
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
                <span>{selectedOptions[group] || "Seçiniz..."}</span>
                <span className="text-ena-light text-xs">{popupGroup === group ? "▲" : "▼"}</span>
              </button>
              {popupGroup === group && (
                <>
                  <div
                    className="fixed inset-0 z-[115] bg-black/50"
                    onClick={() => setPopupGroup(null)}
                    aria-hidden
                  />
                  <div className="fixed left-3 right-3 bottom-3 z-[116] mx-auto max-w-lg rounded-xl border border-ena-border bg-ena-card shadow-2xl p-3 max-h-[60vh] overflow-y-auto md:left-auto md:right-6 md:bottom-6 md:w-96">
                    <p className="text-xs font-semibold text-ena-light uppercase mb-2 px-1">{group}</p>
                    {renderOptions(group, values, "dark", (v) => {
                      onSelect(group, v);
                      setPopupGroup(null);
                    }, "stack")}
                  </div>
                </>
              )}
            </>
          )}

          {normalizedMode === "drawer" && (
            <>
              <button type="button" onClick={() => setDrawerGroup(group)} className={triggerClass}>
                <span>{selectedOptions[group] || "Seçiniz..."}</span>
                <span className="text-ena-light text-xs">Aç</span>
              </button>
              <Drawer
                open={drawerGroup === group}
                onClose={() => setDrawerGroup(null)}
                title={group}
                size="md"
                className="bg-ena-dark border-ena-border"
              >
                {renderOptions(group, values, "dark", (v) => {
                  onSelect(group, v);
                  setDrawerGroup(null);
                }, "stack")}
              </Drawer>
            </>
          )}

          {normalizedMode === "grid" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {values.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onSelect(group, v)}
                  className={optionClass(selectedOptions[group] === v, "dark")}
                >
                  {v}
                </button>
              ))}
            </div>
          )}

          {normalizedMode === "buttons" &&
            renderOptions(group, values, "dark", (v) => onSelect(group, v))}
        </div>
      ))}
    </div>
  );
}
