"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { VariantDisplayMode } from "@/lib/products/variant-display";

interface VariantSelectorProps {
  variantGroups: Record<string, string[]>;
  selectedOptions: Record<string, string>;
  onSelect: (group: string, value: string) => void;
  mode?: VariantDisplayMode | string;
}

export function VariantSelector({
  variantGroups,
  selectedOptions,
  onSelect,
  mode = "buttons",
}: VariantSelectorProps) {
  const [modalGroup, setModalGroup] = useState<string | null>(null);
  const [popupGroup, setPopupGroup] = useState<string | null>(null);

  const groups = Object.entries(variantGroups);
  if (groups.length === 0) return null;

  const chipClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
      active
        ? "bg-ena-primary text-white border-ena-primary"
        : "text-ena-text bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40"
    }`;

  const gridClass = (active: boolean) =>
    `px-3 py-2.5 rounded-xl text-xs font-medium transition-colors border text-center min-w-[88px] ${
      active
        ? "bg-ena-primary text-white border-ena-primary shadow-sm"
        : "text-ena-text bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40"
    }`;

  return (
    <div className="space-y-3 mb-3 pb-3 border-b border-ena-border">
      {groups.map(([group, values]) => (
        <div key={group}>
          <p className="text-xs text-ena-light mb-1.5">{group}</p>

          {mode === "select" && (
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

          {mode === "modal" && (
            <>
              <button
                type="button"
                onClick={() => setModalGroup(group)}
                className="w-full flex items-center justify-between rounded-lg border border-ena-border bg-ena-dark/50 px-3 py-2 text-sm text-ena-text hover:border-ena-primary/50"
              >
                <span>{selectedOptions[group] || "Seçiniz..."}</span>
                <span className="text-ena-light text-xs">Değiştir</span>
              </button>
              <Modal
                open={modalGroup === group}
                onClose={() => setModalGroup(null)}
                title={group}
                size="md"
              >
                <div className="flex flex-wrap gap-2">
                  {values.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        onSelect(group, v);
                        setModalGroup(null);
                      }}
                      className={chipClass(selectedOptions[group] === v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </Modal>
            </>
          )}

          {mode === "popup" && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setPopupGroup(popupGroup === group ? null : group)}
                className="w-full flex items-center justify-between rounded-lg border border-ena-border bg-ena-dark/50 px-3 py-2 text-sm text-ena-text hover:border-ena-primary/50"
              >
                <span>{selectedOptions[group] || "Seçiniz..."}</span>
                <span className="text-ena-light text-xs">▼</span>
              </button>
              {popupGroup === group && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPopupGroup(null)} />
                  <div className="absolute z-50 mt-1 w-full rounded-xl border border-ena-border bg-ena-card shadow-xl p-2 max-h-48 overflow-y-auto">
                    {values.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          onSelect(group, v);
                          setPopupGroup(null);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs ${
                          selectedOptions[group] === v
                            ? "bg-ena-primary/20 text-ena-primary font-semibold"
                            : "text-ena-text hover:bg-white/5"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {mode === "grid" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {values.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onSelect(group, v)}
                  className={gridClass(selectedOptions[group] === v)}
                >
                  {v}
                </button>
              ))}
            </div>
          )}

          {(mode === "buttons" || !["select", "modal", "popup", "grid"].includes(mode)) && (
            <div className="flex flex-wrap gap-1.5">
              {values.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onSelect(group, v)}
                  className={chipClass(selectedOptions[group] === v)}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
